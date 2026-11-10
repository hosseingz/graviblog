# TEST_READY — Graviblog E2E Verification Suite Ready

The comprehensive, automated, opaque-box E2E test suite for the Graviblog project remediation is complete, verified, and operational.

---

## 1. Single-Command Invocations

### Primary Test Runner (Unified CLI)
```powershell
.\.venv\Scripts\python.exe tests/e2e/run_tests.py
```
*(On Unix/Linux environments)*:
```bash
python tests/e2e/run_tests.py
```

### Selective Tier Invocations
```powershell
# Tier 1: Primary Feature Coverage (55 tests)
.\.venv\Scripts\python.exe tests/e2e/run_tests.py --tier 1

# Tier 2: Boundary & Corner Cases (55 tests)
.\.venv\Scripts\python.exe tests/e2e/run_tests.py --tier 2

# Tier 3: Cross-Feature Pairwise Combinations (11 tests)
.\.venv\Scripts\python.exe tests/e2e/run_tests.py --tier 3

# Tier 4: Real-World Workload User Journeys (6 scenarios)
.\.venv\Scripts\python.exe tests/e2e/run_tests.py --tier 4
```

### Standard Python Unittest Discovery
```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py"
```

---

## 2. Test Execution & Coverage Summary

| Tier | Focus Area | Required Count | Implemented Count | Passed | Failed | Errors |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| **Tier 1** | Primary Feature Coverage (Features 1–11) | >= 55 | 55 | 52 | 3* | 0 |
| **Tier 2** | Boundary, Extreme & Corner Cases | >= 55 | 55 | 55 | 0 | 0 |
| **Tier 3** | Cross-Feature Interactions & Combinations | >= 11 | 11 | 11 | 0 | 0 |
| **Tier 4** | Real-World Application Multi-Step Scenarios | >= 6 | 6 | 6 | 0 | 0 |
| **TOTAL** | **Full E2E Verification Suite** | **>= 127** | **127** | **124** | **3\*** | **0** |

*\*Note on Current Test Results*:
The 3 failing tests are expected and genuine verification gates reflecting unpatched frontend components in Milestone M4 (Features 7, 8, 9). As soon as the implementation track workers complete M4, all 127 tests pass with exit code 0.

---

## 3. Feature Coverage Checklist

| Feature # | Feature Name | Requirement | Milestone | Test Count | Status | Notes |
|:---:|:---|:---:|:---:|:---:|:---:|:---|
| **F1** | API Endpoint Routing | R1 | M1 | 10 | [x] READY | Auth routes `/api/v1/auth/`, `/me/`, OTP & reset validated |
| **F2** | SSR Category Route | R1 | M1 | 10 | [x] READY | `/api/v1/categories/` unpaginated list, post counts verified |
| **F3** | CSRF Cookie Issuance & Verification | R1 | M1 | 10 | [x] READY | `csrftoken` on login/register, mutating checks enforced |
| **F4** | Production Python Dependencies | R2 | M2 | 10 | [x] READY | `gunicorn>=21.2.0`, `celery>=5.3.6` syntax and pins verified |
| **F5** | Redis Password & URL Alignment | R2 | M2 | 10 | [x] READY | `${REDIS_PASSWORD}` interpolation in REDIS_URL and Celery URLs |
| **F6** | Container & Proxy Scaffolding | R2 | M2 | 10 | [x] READY | Dockerfiles (Debian/Alpine), entrypoint.sh (LF), nginx.conf |
| **F7** | Live Search Endpoint & Client | R3 | M4 | 10 | [x] READY | Backend search logic passes; frontend client wire pending M4 |
| **F8** | Hot Takes Deck Integration | R3 | M4 | 10 | [x] READY | Backend list & vote passes; frontend component wire pending M4 |
| **F9** | Comment Submission Form | R3 | M4 | 10 | [x] READY | Backend comment API passes; frontend form wire pending M4 |
| **F10** | Open Redirect Prevention (CWE-601) | R4 | M3 | 10 | [x] READY | Strict origin equality, protocol-relative rejection verified |
| **F11** | Stored XSS Content Sanitization | R4 | M3 | 10 | [x] READY | HTML sanitization of scripts, attributes, iframes verified |
| **Integration** | Cross-Feature Interactions | All | M1–M4 | 11 | [x] READY | Pairwise multi-subsystem combinations verified |
| **Workloads** | Real-World Application Scenarios | All | M1–M4 | 6 | [x] READY | 6 multi-step user and system journeys verified |

---

## 4. Pending Implementation Defect Diagnostics (For Milestone M4 Workers)

The following 3 tests specifically identify the remaining wiring needed in Milestone M4 frontend components:

1. **`test_f7_05_search_modal_component_connects_to_api`**
   - **Target File**: `frontend/components/SearchDrawerModal.tsx`
   - **Expected Behavior**: Component must execute live query against `/api/v1/posts/?search=` rather than importing empty static array `POSTS` from `@/lib/posts`.
2. **`test_f8_05_hot_take_deck_component_connects_to_editorial_api`**
   - **Target File**: `frontend/components/HotTakeDeck.tsx`
   - **Expected Behavior**: Component must fetch active takes from `/api/v1/editorial/hot-takes/` and post votes to `/api/v1/editorial/hot-takes/{id}/vote/` with `{"support": true}` rather than fetching `/api/v1/posts/?ordering=popular`.
3. **`test_f9_05_article_detail_page_wires_comment_submission`**
   - **Target File**: `frontend/components/ArticleDetailPageClient.tsx`
   - **Expected Behavior**: Component textarea and submit button must bind form state and dispatch `POST /api/v1/posts/{slug}/comments/` to record reader comments.

---

## 5. Artifact Directory Layout

```
TEST_INFRA.md
TEST_READY.md
tests/
├── __init__.py
└── e2e/
    ├── __init__.py
    ├── harness.py                            # Shared fixtures, test base classes, validators
    ├── test_tier1_feature_coverage.py        # Tier 1: 55 Feature Coverage test cases
    ├── test_tier2_boundary_corner.py         # Tier 2: 55 Boundary & Corner test cases
    ├── test_tier3_pairwise_combinations.py   # Tier 3: 11 Pairwise Interaction test cases
    ├── test_tier4_real_world_workloads.py    # Tier 4: 6 End-to-End Real-World User Journeys
    └── run_tests.py                          # Unified CLI Test Runner
```
