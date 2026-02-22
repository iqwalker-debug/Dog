# Test Coverage Analysis — Fund Dog Management

## Current State

The repository currently contains only a `README.md`. There is no application
source code, no tests, and no test infrastructure. This document records the
proposed coverage areas that should be addressed as the project is built.

---

## Domain Summary

**Fund dog management** involves managing financial funds on behalf of dogs
(e.g. trust funds, rescue organisation budgets, per-dog care allowances). Core
concerns are:

- Accurate financial calculations
- Dog and owner record integrity
- Authorisation (who may view or modify a fund)
- Auditability of transactions
- Reporting

---

## Proposed Test Coverage Areas

### 1. Financial Calculations — **High Priority**

This is the most critical and error-prone area. Money bugs are often silent and
compound over time.

| Scenario | Why it matters |
|---|---|
| Fund balance after deposits and withdrawals | Core invariant — balance must equal sum of transactions |
| Floating-point / decimal precision | Monetary values must never use IEEE 754 floats without a decimal library |
| Overdraft / insufficient-funds rules | Prevent negative balances where the business rules disallow it |
| Fee calculations (percentage and flat) | Off-by-one errors are common; rounding must be deterministic |
| Recurring disbursements (monthly allowances) | Verify amounts accumulate correctly over billing cycles |
| Currency conversion (if multi-currency) | Exchange-rate application order matters |

**Recommended tests:** unit tests for every arithmetic helper; property-based
tests that assert balance = Σ(credits) − Σ(debits) across random transaction
sequences.

---

### 2. Dog & Owner Record Management — **High Priority**

CRUD operations form the backbone of the data model.

| Scenario | Why it matters |
|---|---|
| Create dog with all required fields | Validates schema enforcement |
| Reject dog record missing required fields | Input validation must be enforced server-side |
| Update owner contact information | Ensure partial updates do not corrupt other fields |
| Soft-delete vs hard-delete semantics | Deleted records must not appear in fund lookups |
| Duplicate dog/owner detection | Prevent ghost records that split transaction history |
| Pagination / large result sets | Off-by-one errors in limit/offset queries |

**Recommended tests:** unit tests for model validators; integration tests
against a test database for CRUD round-trips.

---

### 3. Authorisation & Access Control — **High Priority**

Financial data requires strict access rules.

| Scenario | Why it matters |
|---|---|
| Owner can view their own fund | Happy path |
| Owner cannot view another owner's fund | Horizontal privilege escalation |
| Admin can view all funds | Role check |
| Unauthenticated request is rejected | No anonymous access to financial data |
| Expired / revoked token is rejected | Token lifecycle |
| Read-only role cannot create transactions | Least-privilege enforcement |

**Recommended tests:** integration/API tests that exercise each role against
each endpoint; dedicated security regression tests so these never silently
regress.

---

### 4. Transaction Recording & Idempotency — **High Priority**

| Scenario | Why it matters |
|---|---|
| Transaction recorded with correct timestamp | Audit trail depends on accurate timestamps |
| Duplicate transaction submission rejected | Network retries must not double-charge |
| Transaction rollback on partial failure | Atomicity — all-or-nothing |
| Transaction history ordering | Reports depend on correct chronological order |
| Maximum transaction amount validation | Business rule enforcement |

**Recommended tests:** unit tests for idempotency key logic; integration tests
that simulate duplicate submissions.

---

### 5. Reporting & Summaries — **Medium Priority**

| Scenario | Why it matters |
|---|---|
| Monthly statement totals match transaction log | Report accuracy |
| Date-range filtering returns only matching records | Boundary conditions (inclusive/exclusive) |
| Zero-activity period produces empty-but-valid report | No division-by-zero or null-pointer errors |
| Large dataset report completes within acceptable time | Performance regression detection |

**Recommended tests:** integration tests with known fixture data; snapshot tests
for report output format.

---

### 6. Input Validation & Edge Cases — **Medium Priority**

| Scenario | Why it matters |
|---|---|
| Negative deposit amount rejected | Cannot deposit −£100 to gain funds |
| Transaction with amount = 0 rejected | Zero-value records pollute history |
| Very large amounts (overflow protection) | Integer overflow in stored values |
| SQL injection / NoSQL injection in name fields | Security baseline |
| XSS in free-text fields (if a UI exists) | Security baseline |
| Non-UTF-8 / special characters in names | Internationalisation |

**Recommended tests:** unit tests per validator; fuzz/property-based testing
for boundary values.

---

### 7. API Contract — **Medium Priority**

| Scenario | Why it matters |
|---|---|
| Correct HTTP status codes on success and failure | Clients depend on status codes for control flow |
| Response schema matches documented contract | Prevents silent breaking changes |
| 404 on missing resource | Must not leak existence of other owners' resources |
| 422 vs 400 distinction for validation errors | Consistent error semantics |
| Rate limiting returns 429 | Protect against abuse |

**Recommended tests:** contract/integration tests run against a live test
server; consider a tool like Dredd or Schemathesis to auto-generate tests from
an OpenAPI spec.

---

### 8. Background Jobs & Scheduled Tasks — **Lower Priority (build when features exist)**

| Scenario | Why it matters |
|---|---|
| Monthly disbursement job runs exactly once | Idempotency for scheduled work |
| Job skips dogs with suspended funds | Business rule |
| Failed job retries without duplicating transactions | Retry safety |
| Job completes within SLA under load | Performance |

**Recommended tests:** unit tests for job logic with mocked scheduler;
integration tests with a test queue.

---

## Suggested Tooling (language-agnostic recommendations)

| Concern | Suggestion |
|---|---|
| Unit / integration tests | Pick one framework and commit to it (e.g. Jest, pytest, RSpec) |
| Decimal arithmetic | Use a decimal/money library — never raw floats |
| Property-based testing | fast-check (JS), Hypothesis (Python), Propcheck (Ruby) |
| API contract testing | Schemathesis or Dredd against OpenAPI spec |
| Coverage reporting | Language-native coverage tool + enforce a minimum threshold in CI |
| Mutation testing | Stryker (JS/TS), mutmut (Python) — find tests that never actually fail |

---

## Coverage Targets (recommended minimums once code exists)

| Layer | Target |
|---|---|
| Financial calculation logic | 100% line + branch |
| Authorisation logic | 100% line + branch |
| API endpoints | 90% line |
| Reporting | 80% line |
| Overall codebase | ≥ 80% line coverage enforced in CI |

---

## Next Steps

1. Choose language and framework; set up the project skeleton.
2. Add a CI pipeline with a coverage gate from day one.
3. Write tests for financial helpers *before* or *alongside* the implementation
   (test-driven development strongly recommended for money logic).
4. Revisit this document and tick off areas as they are covered.
