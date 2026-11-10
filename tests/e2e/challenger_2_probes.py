"""Challenger 2 Empirical Verification Probe Suite.

Validates:
1. Database State Isolation (backend/db.sqlite3 pre/post test suite execution)
2. CSRF Enforcement on Cookie-Authenticated Mutating Calls vs Safe & Bearer Calls
3. Open Redirect Validation Logic (Python harness oracle and Node middleware)
"""

import os
import sys
import hashlib
import sqlite3
import subprocess
from pathlib import Path
from urllib.parse import urlparse

# Resolve paths relative to workspace root
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = WORKSPACE_ROOT / "backend"
APPS_DIR = BACKEND_DIR / "apps"
DB_PATH = BACKEND_DIR / "db.sqlite3"

if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(APPS_DIR) not in sys.path:
    sys.path.insert(0, str(APPS_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from django.test.runner import DiscoverRunner
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from tests.e2e.harness import is_safe_redirect_url

User = get_user_model()


def get_db_snapshot(db_path: Path):
    """Capture sha256 and row counts for all tables in sqlite db."""
    if not db_path.exists():
        return None, {}
    raw = db_path.read_bytes()
    db_hash = hashlib.sha256(raw).hexdigest()

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cur.fetchall()
    counts = {}
    for (t_name,) in tables:
        if not t_name.startswith("sqlite_"):
            cur.execute(f'SELECT count(*) FROM "{t_name}"')
            counts[t_name] = cur.fetchone()[0]
    conn.close()
    return db_hash, counts


def run_probe_db_isolation():
    print("=" * 60)
    print("PROBE 1: DATABASE STATE ISOLATION")
    print("=" * 60)

    hash_before, counts_before = get_db_snapshot(DB_PATH)
    print(f"DB exists: {DB_PATH.exists()}")
    print(f"SHA256 Before: {hash_before}")
    print(f"Total tables: {len(counts_before)}")
    sample_counts_before = {k: counts_before[k] for k in sorted(counts_before.keys())[:5]}
    print(f"Sample table counts before: {sample_counts_before}")

    # Run the test runner (Tier 1 & Tier 2)
    print("\nRunning test runner via subprocess...")
    python_exe = sys.executable
    proc = subprocess.run(
        [python_exe, "tests/e2e/run_tests.py", "--tier", "2"],
        cwd=str(WORKSPACE_ROOT),
        capture_output=True,
        text=True,
    )
    print(f"Runner exit code: {proc.returncode}")

    hash_after, counts_after = get_db_snapshot(DB_PATH)
    print(f"SHA256 After:  {hash_after}")
    print(f"Total tables after: {len(counts_after)}")

    leaked = []
    for tbl, count in counts_after.items():
        before_cnt = counts_before.get(tbl, 0)
        if count != before_cnt:
            leaked.append((tbl, before_cnt, count))

    # Also check if any test user leaked into db.sqlite3
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    cur.execute("SELECT username FROM users_user WHERE username LIKE '%e2e%' OR username LIKE '%f3_%'")
    leaked_users = cur.fetchall()
    conn.close()

    print(f"Table count discrepancies: {leaked}")
    print(f"Leaked test users in dev db: {leaked_users}")
    print(f"Hash identical: {hash_before == hash_after}")

    isolation_passed = (hash_before == hash_after) and (len(leaked) == 0) and (len(leaked_users) == 0)
    print(f"PROBE 1 VERDICT: {'PASSED (ISOLATED)' if isolation_passed else 'FAILED (LEAK DETECTED)'}")
    return {
        "passed": isolation_passed,
        "hash_before": hash_before,
        "hash_after": hash_after,
        "hash_identical": (hash_before == hash_after),
        "leaked_tables": leaked,
        "leaked_users": leaked_users,
    }


def run_probe_csrf_enforcement():
    print("\n" + "=" * 60)
    print("PROBE 2: CSRF ENFORCEMENT ON COOKIE-AUTH MUTATING CALLS")
    print("=" * 60)

    # Initialize isolated Django test database
    django_runner = DiscoverRunner(verbosity=0, interactive=False)
    db_config = django_runner.setup_databases()

    client = APIClient()
    results = {}

    try:
        # 1. Create a test user in isolated test db
        test_user = User.objects.create_user(
            username="csrf_probe_user",
            email="csrf_probe@example.com",
            password="ProbePassword123!",
            handle="@csrf_probe",
        )

        # 2. Login to get cookies
        login_resp = client.post(
            "/api/v1/auth/login/",
            data={"username": "csrf_probe_user", "password": "ProbePassword123!"},
        )
        assert login_resp.status_code == status.HTTP_200_OK, f"Login failed: {login_resp.status_code}"
        csrf_token = login_resp.cookies["csrftoken"].value
        access_token = login_resp.cookies["pod_access_token"].value
        print(f"[OK] Login successful. Obtained csrftoken and pod_access_token cookies.")

        # Test A: Mutating request (PATCH) with Cookie Auth, NO CSRF header -> MUST FAIL with 403
        client.cookies["pod_access_token"] = access_token
        client.cookies["csrftoken"] = csrf_token
        # Ensure no HTTP_X_CSRFTOKEN
        resp_no_csrf = client.patch(
            "/api/v1/auth/me/",
            data={"bio": "CSRF Attack Bio"},
            format="json",
        )
        print(f"Test A (Cookie + Mutating + Missing CSRF): HTTP {resp_no_csrf.status_code}")
        results["cookie_mutating_missing_csrf_status"] = resp_no_csrf.status_code
        results["cookie_mutating_missing_csrf_detail"] = resp_no_csrf.json() if resp_no_csrf.status_code == 403 else None
        assert resp_no_csrf.status_code == status.HTTP_403_FORBIDDEN, f"Expected 403, got {resp_no_csrf.status_code}"

        # Test B: Mutating request (PATCH) with Cookie Auth, INVALID CSRF header -> MUST FAIL with 403
        resp_bad_csrf = client.patch(
            "/api/v1/auth/me/",
            data={"bio": "CSRF Forged Bio"},
            format="json",
            HTTP_X_CSRFTOKEN="completely-forged-csrf-token",
        )
        print(f"Test B (Cookie + Mutating + Invalid CSRF): HTTP {resp_bad_csrf.status_code}")
        results["cookie_mutating_invalid_csrf_status"] = resp_bad_csrf.status_code
        assert resp_bad_csrf.status_code == status.HTTP_403_FORBIDDEN, f"Expected 403, got {resp_bad_csrf.status_code}"

        # Test C: Mutating request (PATCH) with Cookie Auth, VALID CSRF header -> MUST SUCCEED with 200
        resp_valid_csrf = client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Legitimate User Bio"},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        print(f"Test C (Cookie + Mutating + Valid CSRF): HTTP {resp_valid_csrf.status_code}")
        results["cookie_mutating_valid_csrf_status"] = resp_valid_csrf.status_code
        assert resp_valid_csrf.status_code == status.HTTP_200_OK, f"Expected 200, got {resp_valid_csrf.status_code}"

        # Test D: Safe request (GET) with Cookie Auth, NO CSRF header -> MUST SUCCEED with 200
        resp_safe_get = client.get("/api/v1/auth/me/")
        print(f"Test D (Cookie + Safe GET + No CSRF): HTTP {resp_safe_get.status_code}")
        results["cookie_safe_get_no_csrf_status"] = resp_safe_get.status_code
        assert resp_safe_get.status_code == status.HTTP_200_OK, f"Expected 200, got {resp_safe_get.status_code}"

        # Test E: Mutating request (PATCH) with Bearer Auth, NO CSRF header -> MUST SUCCEED with 200 (Bearer bypasses CSRF)
        bearer_client = APIClient()
        bearer_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        resp_bearer_patch = bearer_client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Bearer Updated Bio"},
            format="json",
        )
        print(f"Test E (Bearer + Mutating + No CSRF): HTTP {resp_bearer_patch.status_code}")
        results["bearer_mutating_no_csrf_status"] = resp_bearer_patch.status_code
        assert resp_bearer_patch.status_code == status.HTTP_200_OK, f"Expected 200, got {resp_bearer_patch.status_code}"

        csrf_passed = True
        print("PROBE 2 VERDICT: PASSED (CSRF Strictly Enforced)")
    except Exception as exc:
        print(f"PROBE 2 EXCEPTION: {exc}")
        csrf_passed = False
        results["error"] = str(exc)
    finally:
        django_runner.teardown_databases(db_config)

    results["passed"] = csrf_passed
    return results


def run_probe_open_redirect():
    print("\n" + "=" * 60)
    print("PROBE 3: OPEN REDIRECT VALIDATION LOGIC")
    print("=" * 60)

    # Test vectors: (payload, expected_safe)
    vectors = [
        # Malicious protocol-relative payloads
        ("//evil.com", False),
        ("//evil.com/path", False),
        ("/\\evil.com", False),
        ("/\\evil.com/path", False),
        ("/\\/evil.com", False),
        ("/\\\\evil.com", False),
        ("///evil.com", False),
        ("////evil.com", False),
        ("\\\\evil.com", False),
        ("\\evil.com", False),
        # Malicious pseudo-protocols
        ("javascript:alert(1)", False),
        ("javascript:void(0)", False),
        ("javascript://evil.com", False),
        ("data:text/html,<script>alert(1)</script>", False),
        ("vbscript:msgbox(1)", False),
        # Malicious external absolute URLs
        ("http://evil.com", False),
        ("https://evil.com", False),
        ("https://evil.com/dashboard", False),
        ("http://localhost:3000.evil.com", False),
        ("http://localhost:3000@evil.com", False),
        ("http://evil.com#@localhost:3000", False),
        # Encoded / control char vectors
        ("/%2fevil.com", False),
        ("/%5cevil.com", False),
        # Whitespace / empty
        ("", False),
        ("   ", False),
        # Legitimate safe relative paths
        ("/dashboard", True),
        ("/articles", True),
        ("/articles/quantum-crypto", True),
        ("/articles?category=cyber&page=2", True),
        ("/profile/settings#notifications", True),
    ]

    harness_results = []
    all_passed = True

    for payload, expected in vectors:
        actual = is_safe_redirect_url(payload)
        status_str = "PASS" if actual == expected else "FAIL"
        if actual != expected:
            all_passed = False
        harness_results.append({
            "payload": payload,
            "expected": expected,
            "actual": actual,
            "status": status_str,
        })
        print(f"  [{status_str}] Payload: {payload!r:<40} -> Actual: {actual} (Expected: {expected})")

    print(f"\nPROBE 3 HARNESS ORACLE VERDICT: {'PASSED' if all_passed else 'FAILED'}")
    return {
        "passed": all_passed,
        "results": harness_results,
    }


def main():
    print("STARTING CHALLENGER 2 EMPIRICAL PROBES...\n")
    p1 = run_probe_db_isolation()
    p2 = run_probe_csrf_enforcement()
    p3 = run_probe_open_redirect()

    print("\n" + "=" * 60)
    print("ALL PROBES COMPLETED")
    print("=" * 60)
    print(f"Probe 1 (DB Isolation):    {'CONFIRMED' if p1['passed'] else 'CHALLENGED'}")
    print(f"Probe 2 (CSRF Enforcement): {'CONFIRMED' if p2['passed'] else 'CHALLENGED'}")
    print(f"Probe 3 (Open Redirect):   {'CONFIRMED' if p3['passed'] else 'CHALLENGED'}")

    overall = p1["passed"] and p2["passed"] and p3["passed"]
    print(f"OVERALL VERDICT: {'CONFIRMED' if overall else 'CHALLENGED'}")


if __name__ == "__main__":
    main()
