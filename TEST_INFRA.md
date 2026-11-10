# TEST_INFRA — Graviblog E2E Test Suite Infrastructure & Architecture

## 1. Overview & Test Philosophy

The Graviblog End-to-End (E2E) Test Suite provides an automated, opaque-box, requirement-driven verification framework. It evaluates the application against authoritative specifications defined in `ORIGINAL_REQUEST.md` and the master architecture in `.agents/teamwork/orchestrator/PROJECT.md`.

### Core Principles
1. **Opaque-Box Verification**: The test suite exercises observable external behavior (HTTP endpoints, request/response headers, cookie issuance, database state, configuration schemas, and deployment artifacts) without relying on internal implementation private hacks.
2. **Requirement Traceability**: Every test case traces directly to requirements R1, R2, R3, or R4 and the 11 feature specifications in `PROJECT.md`.
3. **Execution Independence & Isolation**: Each test executes in an isolated environment, sets up its own state, handles atomic rollbacks where applicable, and leaves no residual side effects.
4. **Actionable Diagnostics**: When a test fails against an unpatched codebase, it outputs clear failure diagnostics indicating the exact contract violation and file location to assist implementation track workers.
5. **No Facades or Hardcoded Results**: All assertions verify real computations, schema validations, and HTTP lifecycle responses.

---

## 2. Feature Inventory Mapping

The test suite covers the complete inventory of 11 functional and architectural features across milestones M1–M4:

| Feature # | Feature Name | Requirement | Milestone | Target Files & Scope |
|:---:|:---|:---:|:---:|:---|
| **F1** | API Endpoint Routing | R1 | M1 | `frontend/lib/api/apiConfig.ts`, `backend/apps/users/urls.py` |
| **F2** | SSR Category Route | R1 | M1 | `frontend/app/articles/page.tsx`, `backend/apps/posts/urls.py` |
| **F3** | CSRF Cookie Issuance & Verification | R1 | M1 | `backend/apps/users/views.py`, `backend/apps/users/authentication.py` |
| **F4** | Production Python Dependencies | R2 | M2 | `backend/requirements.txt` |
| **F5** | Redis Password & URL Alignment | R2 | M2 | `docker-compose.yml`, `backend/config/settings.py` |
| **F6** | Container & Proxy Scaffolding | R2 | M2 | `backend/Dockerfile`, `frontend/Dockerfile`, `nginx/nginx.conf`, `backend/entrypoint.sh`, `backend/config/celery.py` |
| **F7** | Live Search Endpoint & Client | R3 | M4 | `backend/apps/posts/views.py`, `frontend/components/SearchDrawerModal.tsx` |
| **F8** | Hot Takes Deck Integration | R3 | M4 | `backend/apps/editorial/views.py`, `frontend/components/HotTakeDeck.tsx` |
| **F9** | Comment Submission Form | R3 | M4 | `backend/apps/posts/views.py`, `frontend/components/ArticleDetailPageClient.tsx` |
| **F10** | Open Redirect Prevention (CWE-601) | R4 | M3 | `frontend/middleware.ts` |
| **F11** | Stored XSS Content Sanitization | R4 | M3 | `frontend/components/ArticleDetailPageClient.tsx` |

---

## 3. Test Design Methodology

The test suite employs four formal software testing methodologies to achieve comprehensive, defect-uncovering coverage:

### 3.1 Category-Partition Method
Input spaces and environment parameters are partitioned into disjoint equivalence classes:
- **Authentication State**: Unauthenticated, Cookie-authenticated (JWT), Bearer-authenticated, Expired token, Malformed token.
- **CSRF Tokens**: Present and valid, Missing from request, Mismatched token value, Present on safe method (GET/HEAD), Present on mutating method (POST/PUT/PATCH/DELETE).
- **Search Queries**: Exact title match, Excerpt substring match, Tag keyword match, Persian/Unicode text, Empty query, Special regex/SQL characters.
- **Redirect Targets**: Absolute internal relative path, Query-parameterized relative path, External absolute URL, Protocol-relative URL (`//evil.com`), Backslash-normalized URL (`/\evil.com`), JavaScript URI (`javascript:...`).
- **HTML Content Payloads**: Safe formatting tags, Embedded `<script>` elements, Inline event handlers (`onerror`, `onload`), Malformed unclosed tags, SVG vectors, Data URI frames.

### 3.2 Boundary Value Analysis (BVA)
Boundary conditions probe system limits:
- **String Lengths & Whitespace**: Empty string `""`, whitespace-only `"   "`, single-character queries, maximum length strings.
- **Numeric Counters**: Initial zero votes (`upvotes = 0`, `total_votes = 0`), single increment, division-by-zero protection in `upvote_percent`.
- **Protocol Delimiters**: Single leading slash `/path`, double slash `//domain`, triple slash `///domain`, leading backslash `\path`, mixed slash `/\domain`.
- **Pagination Offsets**: Empty pages, first page (page 1), out-of-range pages, default page sizes (9 items).

### 3.3 Pairwise Combinatorial Testing
Cross-feature interactions verify system cohesion when multiple independent subsystems operate simultaneously:
- **Auth × CSRF**: User registration/login issuing CSRF cookie followed by mutating state modification.
- **Auth × Search**: Authenticated user session executing real-time search queries.
- **Search × Comment**: Searching a post by keyword, navigating to slug, and posting a comment.
- **Hot Take × Voting**: Retrieving live hot takes, casting an upvote, casting a downvote, verifying counter updates.
- **Redirect × Auth**: Login redirect parameter validation under both valid and hostile redirect destinations.
- **Comment × XSS**: Submitting rich comment text containing XSS vectors and ensuring defensive sanitization.

### 3.4 Real-World Workload Testing
Tier 4 scenarios model complete, authentic end-to-end user and system journeys across multiple sequential operations.

---

## 4. Test Tier Architecture & Coverage Thresholds

The suite is structured into four progressive tiers:

```
tests/
├── __init__.py
└── e2e/
    ├── __init__.py
    ├── harness.py                            # Shared test fixtures, API client, file validators
    ├── test_tier1_feature_coverage.py        # Tier 1: Primary feature coverage (55 tests)
    ├── test_tier2_boundary_corner.py         # Tier 2: Boundary & corner cases (55 tests)
    ├── test_tier3_pairwise_combinations.py   # Tier 3: Cross-feature combinations (11 tests)
    ├── test_tier4_real_world_workloads.py    # Tier 4: Real-world user journeys (6 scenarios)
    └── run_tests.py                          # Unified CLI test runner
```

### Coverage Threshold Summary

| Tier | Focus Area | Required Count | Implemented Count |
|:---:|:---|:---:|:---:|
| **Tier 1** | Primary Feature Coverage (>=5 per feature across Features 1–11) | >= 55 | 55 |
| **Tier 2** | Boundary & Corner Cases (>=5 per feature across Features 1–11) | >= 55 | 55 |
| **Tier 3** | Cross-Feature Interactions & Combinations | >= 11 | 11 |
| **Tier 4** | Real-World Application Scenarios (Multi-step user flows) | >= 6 | 6 |
| **Total** | **Full E2E Test Suite** | **>= 127** | **127** |

---

## 5. Execution Guide & Unified Runner

### Single-Command Invocations

Run the complete test suite:
```powershell
.\.venv\Scripts\python.exe tests/e2e/run_tests.py
```
*(Or on Unix/Linux)*:
```bash
python tests/e2e/run_tests.py
```

Run specific tiers using CLI flags:
```powershell
.\.venv\Scripts\python.exe tests/e2e/run_tests.py --tier 1
.\.venv\Scripts\python.exe tests/e2e/run_tests.py --tier 2
.\.venv\Scripts\python.exe tests/e2e/run_tests.py --tier 3
.\.venv\Scripts\python.exe tests/e2e/run_tests.py --tier 4
```

Standard Python `unittest` discovery:
```powershell
.\.venv\Scripts\python.exe -m unittest discover tests
```

### Runner Output & Exit Codes
- **Progress & Summary**: The runner outputs real-time dot progress or verbose test names, followed by a tier breakdown table and total execution time.
- **Exit Code 0**: All executed tests passed cleanly.
- **Exit Code 1**: One or more tests failed or encountered errors, with stack traces and diagnostic failure messages printed to stderr/stdout.
