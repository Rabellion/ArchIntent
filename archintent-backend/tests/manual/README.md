# Manual API scripts

Ad-hoc scripts kept for reference. They were previously sitting in the
**project root**, which made them look like part of the application.

These are **not** part of the automated test suite. PHPUnit does not pick them
up — they have no test class, and they hit a live server over HTTP rather than
using Laravel's testing kernel.

Run one directly against a running backend:

```bash
php tests/manual/test_registration.php
```

| Script | What it exercises |
|---|---|
| `test_registration.php` | `POST /api/register` happy path and error shape |
| `test_arch_simple.php` | Architect registration then profile update, no file uploads |
| `test_architect_profile.php` | Architect profile endpoint including uploads |

## These should become real tests

Each of these covers a flow that belongs in `tests/Feature` as a proper
PHPUnit test — same assertions, but running against the testing database
with no server required, and counting toward coverage.

Once a flow here has an equivalent in `tests/Feature`, delete the script.
