#!/usr/bin/env python3
"""Unified CLI Runner for Graviblog E2E Test Suite.

Usage:
    python tests/e2e/run_tests.py
    python tests/e2e/run_tests.py --tier 1
    python tests/e2e/run_tests.py --tier 2
    python tests/e2e/run_tests.py --tier 3
    python tests/e2e/run_tests.py --tier 4
    python tests/e2e/run_tests.py --verbose

Supported Flags:
    --tier {1,2,3,4}   Run only tests belonging to the specified tier (default: all tiers)
    -v, --verbose      Verbose test execution output
    -f, --failfast     Stop execution immediately on first failure/error
"""

import os
import sys
import time
import argparse
import unittest
from pathlib import Path

# Configure paths relative to repository root
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = WORKSPACE_ROOT / "backend"
APPS_DIR = BACKEND_DIR / "apps"

if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(APPS_DIR) not in sys.path:
    sys.path.insert(0, str(APPS_DIR))

# Ensure Django is initialized
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from django.test.runner import DiscoverRunner

TIER_MODULES = {
    1: ("Tier 1: Feature Coverage", "tests.e2e.test_tier1_feature_coverage"),
    2: ("Tier 2: Boundary & Corner Cases", "tests.e2e.test_tier2_boundary_corner"),
    3: ("Tier 3: Pairwise Combinations", "tests.e2e.test_tier3_pairwise_combinations"),
    4: ("Tier 4: Real-World Workloads", "tests.e2e.test_tier4_real_world_workloads"),
}


class TierResultTracker:
    def __init__(self, name: str):
        self.name = name
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.errors = 0
        self.duration = 0.0


def load_suite_for_module(module_name: str) -> unittest.TestSuite:
    """Load all TestCase classes from a module."""
    loader = unittest.defaultTestLoader
    return loader.loadTestsFromName(module_name)


def run_tier(runner, tier_num: int, tier_name: str, module_name: str, verbosity: int = 1, failfast: bool = False):
    """Execute a single test tier and return stats."""
    tracker = TierResultTracker(tier_name)
    suite = load_suite_for_module(module_name)
    tracker.total = suite.countTestCases()

    print(f"\n{'='*70}")
    print(f"Executing {tier_name} ({tracker.total} test cases)...")
    print(f"{'='*70}")

    start_time = time.time()
    test_runner = unittest.TextTestRunner(
        verbosity=verbosity,
        failfast=failfast,
    )
    result = test_runner.run(suite)
    tracker.duration = time.time() - start_time
    tracker.failed = len(result.failures)
    tracker.errors = len(result.errors)
    tracker.passed = tracker.total - (tracker.failed + tracker.errors)

    return tracker, result


def main():
    parser = argparse.ArgumentParser(description="Graviblog E2E Test Suite Runner")
    parser.add_argument(
        "--tier",
        type=int,
        choices=[1, 2, 3, 4],
        help="Select specific test tier to run (1: Features, 2: Boundary, 3: Combinations, 4: Real-World)",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose test reporting")
    parser.add_argument("-f", "--failfast", action="store_true", help="Stop on first failure")
    args = parser.parse_args()

    verbosity = 2 if args.verbose else 1

    print("\n" + "#"*70)
    print("  GRAVIBLOG PRODUCTION REMEDIATION & HARDENING — E2E TEST RUNNER")
    print("#"*70)

    # Initialize Django test database environment
    django_runner = DiscoverRunner(verbosity=0, interactive=False)
    db_config = None
    try:
        db_config = django_runner.setup_databases()
    except Exception as e:
        print(f"[WARN] Test database setup warning: {e}. Falling back to default database.")

    selected_tiers = [args.tier] if args.tier else [1, 2, 3, 4]
    trackers = []
    overall_start = time.time()
    has_failures = False

    try:
        for t_num in selected_tiers:
            t_name, t_mod = TIER_MODULES[t_num]
            tracker, result = run_tier(
                django_runner,
                t_num,
                t_name,
                t_mod,
                verbosity=verbosity,
                failfast=args.failfast,
            )
            trackers.append(tracker)
            if tracker.failed > 0 or tracker.errors > 0:
                has_failures = True
                if args.failfast:
                    break
    finally:
        if db_config:
            try:
                django_runner.teardown_databases(db_config)
            except Exception as e:
                print(f"[WARN] Test database teardown warning: {e}")

    total_time = time.time() - overall_start

    # Print summary table
    print("\n" + "="*70)
    print("                    E2E TEST EXECUTION SUMMARY")
    print("="*70)
    print(f"{'Tier Name':<35} | {'Total':<6} | {'Pass':<6} | {'Fail':<6} | {'Err':<6}")
    print("-" * 70)

    total_tests = 0
    total_passed = 0
    total_failed = 0
    total_errors = 0

    for t in trackers:
        total_tests += t.total
        total_passed += t.passed
        total_failed += t.failed
        total_errors += t.errors
        print(f"{t.name:<35} | {t.total:<6} | {t.passed:<6} | {t.failed:<6} | {t.errors:<6}")

    print("-" * 70)
    print(f"{'TOTAL':<35} | {total_tests:<6} | {total_passed:<6} | {total_failed:<6} | {total_errors:<6}")
    print("="*70)
    print(f"Elapsed Time: {total_time:.2f}s")
    print(f"Status: {'FAILED' if has_failures else 'PASSED'}")
    print("="*70 + "\n")

    sys.exit(1 if has_failures else 0)


if __name__ == "__main__":
    main()
