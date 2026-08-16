# Security Audit Report - Akadex

Date: 2026-08-16

Reviewer: Codex application-security review

Environment/commit inspected: local working tree on commit `5d433de`

## 1. Executive Summary

Overall result: FAIL

Akadex is not yet suitable for an unqualified production launch from repository evidence alone. Core tenant isolation is thoughtfully implemented with Supabase RLS and server-derived user IDs, and the previously confirmed signup/password-recovery redirect issue is now recorded as PASS. The remaining launch blockers are operational and defense controls that are either missing from the repository or require platform verification.

Status counts across reviewed controls:

| Status | Count |
| --- | ---: |
| PASS | 17 |
| PARTIAL | 8 |
| FAIL | 5 |
| MANUAL VERIFICATION REQUIRED | 7 |
| NOT APPLICABLE | 6 |

Severity counts for findings:

| Severity | Count |
| --- | ---: |
| Critical | 0 |
| High | 1 |
| Medium | 8 |
| Low | 5 |
| Informational | 4 |

Five most important findings:

1. Persistent rate limiting is not implemented for signup, login, password reset, or email-triggering flows.
2. Production security headers are implemented and locally verified, but still require deployed Vercel inspection before PASS.
3. Supabase/Vercel/Brevo production settings cannot be proven from the repository and require manual verification.
4. Password policy is raised in repository code, but Supabase production Auth policy still requires manual verification.
5. Account export and self-service account deletion are not implemented.

## 2. Scope and Limitations

Inspected:

- Repository instructions: `AGENTS.md`, `CLAUDE.md`, `SECURITY_REVIEW_CHECKLIST.md`.
- Dependency configuration: `package.json`, `package-lock.json`.
- Next.js configuration: `next.config.ts`, `src/proxy.ts`.
- Supabase client/session helpers: `src/lib/supabase/*`.
- Auth forms and callback routes: `src/components/auth/*`, `src/app/auth/callback/route.ts`.
- Dashboard routes, data loaders, and server actions under `src/app/(dashboard)`.
- Supabase schema, RLS policies, triggers, indexes, and functions in `supabase/schema.sql`.
- Public/static files in `public/`.
- Legal pages: `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`.
- Robots metadata: `src/app/robots.ts`.
- CI workflow: `.github/workflows/ci.yml`.
- Existing tests under `src/**/*.test.ts`.

Tested locally:

- `git status --short`
- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `npm run build`
- Local static searches with `rg`
- Sensitive filename scan in current files and Git history names
- Public/static file inventory

Could not access:

- Supabase dashboard settings, production database state, RLS deployment status, backups, restore drills, logs, alerts, or Auth URL Configuration.
- Vercel production environment variables, deployments, headers on production responses, or preview-domain configuration.
- Brevo sender/domain/template/dashboard settings.
- GitHub repository settings such as branch protection, Dependabot, secret scanning, code scanning, and token permissions beyond the checked-in workflow.
- DNS, WAF/CDN, monitoring, and security contact ownership.

This is not a penetration test. No production attack traffic, account creation, email sending, rate-limit stress, destructive SQL, cross-user live testing, or credential validation was performed.

## 3. Findings Table

| ID | Severity | Checklist control | Status | Evidence | Risk | Recommended remediation |
| -- | -------- | ----------------- | ------ | -------- | ---- | ----------------------- |
| AKX-001 | High | Persistent rate limits | FAIL | No rate-limit middleware/store found; auth forms call Supabase directly in `src/components/auth/auth-form.tsx` and `forgot-password-form.tsx`; server actions contain no rate-limit checks. | Signup/reset/login abuse, email abuse, brute-force pressure, and Brevo cost/spam risk. | Add persistent per-IP and per-account limits using a shared store or provider controls; verify Supabase/Brevo limits. |
| AKX-002 | Medium | Production security headers | PARTIAL | `next.config.ts` now applies security headers from `src/lib/security-headers.ts`; `src/lib/security-headers.test.ts` verifies CSP/header values and production-only HSTS; local `next start` check confirmed non-HSTS security headers on `/` and `private, no-store` on `/dashboard`. Production Vercel responses have not been inspected. | Clickjacking, weaker browser isolation, MIME sniffing, referrer leakage, and CSP gaps are reduced locally, but production deployment/header behavior remains unproven. | Deploy, inspect production headers on public/authenticated/redirect responses, then mark PASS only after verification. |
| AKX-003 | Medium | Non-disclosing production errors | PASS | Raw `error.message` throws in server actions/data loaders were replaced with `throwPublicError()` from `src/lib/server-errors.ts`; `src/lib/server-errors.test.ts` verifies raw database/provider text is not returned. Auth provider messages are read only for safe copy mapping in `auth-form.tsx`. | Residual risk is limited to future code paths that bypass the shared helper. | Keep using `throwPublicError()` for provider/database failures and retain tests for raw-message leaks. |
| AKX-004 | Medium | Parent-child ownership boundaries | PARTIAL | App actions verify semester ownership before subject mutation in `src/app/(dashboard)/semesters/[semesterId]/actions.ts`; SQL policy for `subjects` only checks `user_id = auth.uid()` in `supabase/schema.sql`. | If a future direct client path or server action mishandles `user_id`, DB policy does not independently prove `semester_id` belongs to same user. | Add DB constraints/triggers or stricter policies tying child rows to owned parent rows; add two-account tests. |
| AKX-005 | Medium | Platform auth URL configuration | MANUAL VERIFICATION REQUIRED | Repo helper `src/lib/auth-redirect.ts` supports `NEXT_PUBLIC_APP_URL`; report from user verifies production flow, but Supabase Site URL/Redirect URLs and Vercel envs are not in repo. | Misconfigured production or preview deployments can reintroduce localhost or wrong-domain redirects. | Verify Vercel `NEXT_PUBLIC_APP_URL`, Supabase Site URL, allowed Redirect URLs, and fresh emails after redeploy. |
| AKX-006 | Medium | Account export and deletion | FAIL | Privacy/terms pages exist; no account deletion/export server actions or UI found by search. | Users lack self-service privacy rights workflow and data lifecycle clarity. | Add authenticated export and deletion flows with re-authentication and documented retention. |
| AKX-007 | Medium | Dependency vulnerability audit | MANUAL VERIFICATION REQUIRED | `package-lock.json` is committed and CI runs npm checks; `npm audit` failed locally and escalation was rejected for external data egress. | Known vulnerable packages may remain untriaged. | Run `npm audit` or a trusted SCA tool in CI with explicit approval and triage results. |
| AKX-008 | Low | Password policy | PARTIAL | Repository code now uses shared `MIN_PASSWORD_LENGTH = 8` in `src/lib/password-policy.ts`; signup and password update enforce it before submission; `src/lib/password-policy.test.ts` covers six/seven/eight-character cases and confirmation mismatch. Supabase production Auth policy still requires dashboard verification. | If Supabase production still allows shorter passwords through another client/API path, provider-level enforcement remains weaker than the app UI. | Set Supabase Auth password minimum to 8 in the dashboard and test signup/password recovery against the provider. |
| AKX-009 | Low | No account enumeration | PARTIAL | Reset response is generic in `forgot-password-form.tsx`; signup/login map `already registered` and `email not confirmed` in `auth-form.tsx`. | Attackers may infer account existence or confirmation status through signup/login responses. | Use less revealing auth copy where acceptable and rely on out-of-band email. |
| AKX-010 | Medium | Authenticated response cache policy | PARTIAL | `next.config.ts` now applies `Cache-Control: private, no-store` to dashboard routes, `/auth/callback`, and `/update-password`; local `next start` verification confirmed it on `/dashboard`. Production Vercel responses have not been inspected. | CDN/browser caching risk is reduced locally, but deployed behavior still needs confirmation. | Inspect production authenticated routes and redirects; mark PASS only after Vercel responses show `private, no-store`. |
| AKX-011 | Low | Security contact | FAIL | No `public/.well-known/security.txt` or security contact file found. | Security reports may not reach the owner reliably. | Publish `/.well-known/security.txt` and monitor the contact channel. |
| AKX-012 | Medium | Backups, restore, monitoring, alerting | MANUAL VERIFICATION REQUIRED | No repository evidence for Supabase backup policy, restore drills, alerting, Brevo alerts, or uptime/error monitoring. | Data loss or incidents may go undetected or be unrecoverable. | Verify Supabase backups, perform restore drill, and configure owner alerts. |
| AKX-013 | Low | Legal/privacy completeness | PARTIAL | `src/app/privacy/page.tsx` and `terms/page.tsx` exist; no subprocessors, independent effective dates, export/deletion, or retention detail found. | Legal/privacy disclosures may be incomplete for production data collection. | Add effective dates, subprocessors, retention/export/deletion detail, and legal review. |
| AKX-014 | Informational | Signup verification email redirects to localhost | PASS | `src/lib/auth-redirect.ts`, `auth-form.tsx`, `forgot-password-form.tsx`, and `auth/callback/route.ts`; user-provided production verification confirms callback/final destinations. | Residual risk only for stale emails generated before config was corrected. | Keep production `NEXT_PUBLIC_APP_URL=https://akadeks.vercel.app`; verify fresh emails after config changes. |
| AKX-015 | Informational | Public/static sensitive files | PASS | `public/` contains only brand SVG/WebP and screenshot WebP assets; no uploads or private files found. | Low current static-file exposure risk. | Keep user uploads out of `public/`; use private buckets if uploads are added. |
| AKX-016 | Informational | Payments and entitlements | NOT APPLICABLE | No payment dependencies, routes, webhook handlers, or subscription model found. | No payment-specific risk in current scope. | Re-audit before adding payments. |
| AKX-017 | Informational | AI feature controls | NOT APPLICABLE | No AI dependencies, routes, model calls, or tool execution features found. | No AI-specific risk in current app. | Re-audit before adding AI features. |
| AKX-018 | Medium | Two-account isolation | MANUAL VERIFICATION REQUIRED | RLS and server scoping are present in code/schema, but no live Supabase two-account test was run. | Cross-tenant regressions may exist in deployed policies or future migrations. | Execute the two-account test plan below in non-production Supabase. |

## 4. Detailed Findings

### AKX-001 - Persistent rate limits missing

Observed:

- No rate-limit middleware, Redis/Upstash/store-backed limiter, or provider-side app code was found.
- `src/components/auth/auth-form.tsx` calls `supabase.auth.signUp()` and `signInWithPassword()` directly from the browser.
- `src/components/auth/forgot-password-form.tsx` calls `resetPasswordForEmail()` directly.
- Server actions under `src/app/(dashboard)` authenticate but do not rate-limit mutations.

Scenario:

An attacker automates signup, login attempts, or password-reset requests. Even if Supabase applies some provider limits, Akadex has no repository-backed persistent per-IP/per-account abuse controls or Brevo-specific email budget controls.

Recommended correction:

- Add persistent per-IP and per-account limits for auth/email actions.
- Add rate limits for high-volume mutations such as tasks and pomodoro logging.
- Document Supabase and Brevo dashboard limits.

Requires: code, platform configuration, automated tests.

Verification:

- In staging, exceed limits from one IP and across multiple accounts.
- Confirm limits survive redeploy/restart and return generic errors.

### AKX-002 - Production security headers implemented locally, pending deployment verification

Observed:

- `next.config.ts` sets `poweredByHeader: false`.
- `next.config.ts` applies global headers from `src/lib/security-headers.ts`.
- `src/lib/security-headers.ts` defines CSP, Vercel-production-only HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- `next.config.ts` applies `Cache-Control: private, no-store` to `/dashboard`, `/tasks`, `/semesters`, `/pomodoro`, `/analytics`, `/settings`, `/auth/callback`, and `/update-password`.
- `src/lib/security-headers.test.ts` covers the restrictive CSP shape and authenticated no-store header.
- Local `next start -p 3001` verification confirmed CSP, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` on `/`, plus `private, no-store` on `/dashboard`.
- HSTS is intentionally gated to `VERCEL_ENV=production` so local and preview responses do not claim permanent HTTPS guarantees.
- Production Vercel headers have not yet been inspected, so this is not marked PASS.

Scenario:

If Vercel strips or overrides headers, production users may still lack the intended browser protections. A CSP mistake could also break scripts, fonts, images, theme behavior, or Supabase auth calls after deployment.

Recommended correction:

- Deploy the header changes.
- Inspect production headers with browser DevTools or `curl`.
- Confirm signup, login, auth callback, forgot password, recovery callback, password update, dashboard navigation, images, fonts, and theme switching still work.

Requires: production deployment and Vercel verification.

Verification:

- Inspect headers on public pages, authenticated pages, redirects, errors, and static assets.
- Confirm `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and absence of `X-Powered-By`.

### AKX-003 - Raw provider/database errors are mapped to safe messages

Observed:

- `src/lib/server-errors.ts` provides `throwPublicError()` and sanitized `logServerError()`.
- Server actions and data loaders now use operation-specific generic messages instead of `throw new Error(error.message)`.
- Safe validation/control-flow messages remain specific, including required fields, invalid enum/range values, unauthorized, and record-not-found cases.
- Auth UI still reads provider messages only inside `getAuthErrorMessage()` to choose safe copy; raw provider text is not displayed.
- `src/lib/server-errors.test.ts` verifies simulated database/provider internals are not returned to users and logs contain only operation/code context.

Scenario:

Future code paths that directly rethrow provider/database messages could reintroduce schema, RLS, or PostgREST details in browser-facing errors.

Recommended correction:

- Continue using `throwPublicError()` for provider/database failures.
- Add regression tests when new server actions/data loaders are created.

Requires: ongoing code review and tests for new paths.

Verification:

- Trigger controlled invalid inputs in staging and confirm no raw SQL/Supabase message reaches UI.

### AKX-004 - Parent-child ownership is partly app-enforced

Observed:

- Subject create/update/delete verifies semester ownership in `ensureSemesterOwnership()`.
- Subject workspace checks subject belongs to URL semester.
- SQL policy for `subjects` is `using (user_id = auth.uid()) with check (user_id = auth.uid())`; it does not independently validate that `semester_id` points to a semester owned by the same user.
- `tasks.subject_id` and `task_series.subject_id` similarly rely on app-side `resolveSubjectId()` plus `user_id` policies.

Scenario:

If a future code path inserts a child row with caller-owned `user_id` but a mismatched parent foreign key, the current SQL policy alone does not reject the parent mismatch.

Recommended correction:

- Add database-level checks via triggers or stricter policies using parent ownership.
- Add tests for manipulated `semester_id` and `subject_id`.

Requires: SQL migration and tests.

Verification:

- With disposable users A/B, attempt to create/update subjects/tasks using copied parent IDs and confirm rejection at both app and database levels.

### AKX-005 - Platform auth URL configuration requires manual verification

Observed:

- `src/lib/auth-redirect.ts` builds callbacks from `NEXT_PUBLIC_APP_URL` when present.
- Signup and recovery use `getAuthCallbackUrl(window.location.origin)`.
- Callback route redirects using `getAppOrigin(origin)`.
- User-provided production verification states signup and recovery pass for `https://akadeks.vercel.app`.

Scenario:

Vercel preview or production env drift, or Supabase Auth URL Configuration drift, can reintroduce localhost/wrong-domain links. Previously generated emails can also preserve stale destinations.

Recommended correction:

- Keep Vercel production `NEXT_PUBLIC_APP_URL=https://akadeks.vercel.app`.
- Verify Supabase Site URL and Redirect URLs.
- Retest with freshly generated emails after config changes.

Requires: platform configuration and manual verification.

Verification:

- Use fresh signup and recovery emails and inspect the callback destination before clicking.

### AKX-006 - Account export and deletion missing

Observed:

- Terms and privacy pages exist.
- Search found no account deletion or export actions/routes.

Scenario:

Users cannot self-serve deletion/export, and operators may lack a consistent process for user-rights requests.

Recommended correction:

- Add authenticated export.
- Add deletion with re-authentication, clear consequences, and cleanup for Supabase rows and third-party data.
- Document backup retention exceptions.

Requires: code, SQL/data lifecycle review, legal review.

Verification:

- Execute export/deletion with a disposable account and verify database cleanup.

### AKX-007 - Dependency audit not completed

Observed:

- `package-lock.json` is committed.
- CI runs install/lint/typecheck/test/build.
- `npm audit --audit-level=low` failed locally; an escalated rerun was rejected because it would send dependency metadata externally without explicit approval.

Scenario:

Known vulnerable transitive dependencies may remain untriaged.

Recommended correction:

- Run dependency scanning in an approved CI/security context.
- Enable reviewed automated updates.

Requires: CI/platform configuration.

Verification:

- Confirm scan results are visible and triaged.

### AKX-008 - Password minimum is eight in code; Supabase policy pending

Observed:

- `src/lib/password-policy.ts` defines `MIN_PASSWORD_LENGTH = 8`.
- `src/components/auth/auth-form.tsx` rejects registration passwords shorter than eight before signup submission.
- `src/components/auth/update-password-form.tsx` rejects new recovery passwords shorter than eight and keeps confirmation mismatch behavior.
- `src/lib/password-policy.test.ts` verifies six- and seven-character passwords are rejected, eight-character passwords are accepted, and mismatches remain rejected.
- Supabase production dashboard policy cannot be verified or changed from repository code.

Scenario:

If Supabase production still permits passwords shorter than eight through another client/API path, provider-level enforcement remains weaker than the app UI.

Recommended correction:

- In Supabase dashboard, set Auth password minimum length to 8 and verify provider-side enforcement.

Requires: Supabase Auth configuration.

Verification:

- Attempt six- and seven-character passwords in signup and recovery update flows.
- Attempt the same against Supabase-backed production after the dashboard policy change.

### AKX-009 - Auth responses partly reveal account state

Observed:

- Password reset response is generic.
- Signup/login copy includes “already registered” and “email not confirmed.”

Scenario:

An attacker may infer whether an email is registered or unconfirmed.

Recommended correction:

- Use less revealing login/signup messages if enumeration resistance is a priority.
- Monitor provider abuse signals.

Requires: code and product decision.

Verification:

- Compare responses for real, nonexistent, and unconfirmed emails.

### AKX-010 - Authenticated cache behavior implemented locally, pending deployment verification

Observed:

- `next.config.ts` applies `Cache-Control: private, no-store` to `/dashboard`, `/tasks`, `/semesters`, `/pomodoro`, `/analytics`, `/settings`, `/auth/callback`, and `/update-password`.
- Local `next start -p 3001` verification confirmed `Cache-Control: private, no-store` on the unauthenticated `/dashboard` redirect.
- Public static assets are not given `no-store`; Next.js keeps its own immutable asset cache behavior.
- Production CDN/browser behavior was not inspected.

Scenario:

If Vercel or an intermediate CDN strips/overrides the header, personalized dashboard responses could still be cached incorrectly.

Recommended correction:

- Deploy and verify `private, no-store` on authenticated pages and auth callback/update-password flows.

Requires: code/platform verification.

Verification:

- Inspect production headers while authenticated and anonymous.

### AKX-011 - Security contact missing

Observed:

- No `public/.well-known/security.txt`.

Scenario:

Researchers or users may not know where to report a vulnerability.

Recommended correction:

- Publish and monitor a security contact.

Requires: public file and operational process.

Verification:

- Fetch `https://akadeks.vercel.app/.well-known/security.txt` after deployment.

### AKX-012 - Backups, restore, monitoring, and alerting require manual verification

Observed:

- No repository evidence for backup retention, restore drills, uptime monitoring, error alerts, billing alerts, Brevo alerts, or Supabase alerting.

Scenario:

Data loss, auth/email abuse, or outages may go unnoticed or be unrecoverable.

Recommended correction:

- Verify Supabase backups and perform restore drill.
- Configure error/availability/auth-abuse alerts.

Requires: platform access and operations.

Verification:

- Restore a recent backup into isolation and document results.

### AKX-013 - Legal/privacy documents are incomplete for mature production use

Observed:

- Privacy and terms pages exist.
- No effective dates, subprocessor list, detailed retention, export/deletion procedure, or Brevo mention found.

Scenario:

Users may lack clear disclosure of providers and rights, especially as data collection grows.

Recommended correction:

- Add legal effective dates, subprocessors, retention, deletion/export, and provider disclosures.

Requires: content/legal review.

Verification:

- Reconcile data-flow inventory against legal pages.

## 5. Passed Controls

- RLS enabled for user-owned tables: `supabase/schema.sql` enables RLS on `profiles`, `semesters`, `subjects`, `tasks`, `task_series`, and `pomodoro_sessions`.
- Owner-scoped RLS policies: `supabase/schema.sql` uses `id = auth.uid()` or `user_id = auth.uid()` with `with check` for each user-owned table.
- Server-side protected layout gate: `src/app/(dashboard)/layout.tsx` calls `getAuthenticatedUser()` and redirects anonymous users to `/login`.
- Server-side authenticated identity source: `src/lib/supabase/session.ts` uses `supabase.auth.getUser()` for authorization boundaries.
- Server-derived mutation ownership: server actions derive `userId` from `getAuthenticatedUser()` rather than trusting client-submitted `user_id`.
- Scoped mutation queries: update/delete operations include `.eq("user_id", userId)` or equivalent ownership checks.
- Subject/task ownership validation in app code: `ensureSemesterOwnership()` and `resolveSubjectId()` validate parent/subject ownership before mutation.
- Mass-assignment protection in actions: actions construct explicit insert/update objects from allowlisted `FormData` fields.
- Parameterized database access: code uses Supabase query builder calls, not string-concatenated SQL.
- Auth redirect helper: `src/lib/auth-redirect.ts` centralizes canonical callback URL generation.
- Signup/password-recovery redirect production verification: user-provided verification confirms production callback and final destinations.
- Generic password-reset response: `forgot-password-form.tsx` says instructions were sent if an account exists.
- No service-role key in browser helper: Supabase config requires only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- No upload/storage feature: no Supabase storage calls or upload code found.
- CI quality checks: `.github/workflows/ci.yml` runs lint, typecheck, tests, and build on pushes/PRs to `main` and `dev`.
- Automated local checks passed: TypeScript, lint, tests, and network-enabled production build passed.

## 6. Not-Applicable Controls

- Payments and entitlements: no payment routes, dependencies, webhooks, prices, plans, or subscription state found.
- AI feature controls: no model calls, AI routes, prompt ingestion, or AI tool execution found.
- File upload validation/storage quotas: no upload feature or storage bucket use found.
- SSRF defenses for user-provided URLs: no server-side fetch of user-supplied URLs found.
- Staff/admin RBAC: no staff roles, admin console, impersonation, or privileged support actions found.
- Third-party token encryption: no OAuth integrations storing third-party refresh/access tokens found.

## 7. Manual Verification Checklist

Supabase:

1. Confirm production schema exactly includes the checked `supabase/schema.sql` RLS policies.
2. Confirm RLS is enabled for all exposed tables.
3. Confirm no extra public policies, RPCs, views, or storage buckets bypass tenant isolation.
4. Confirm Auth Site URL is `https://akadeks.vercel.app`.
5. Confirm Redirect URLs include `https://akadeks.vercel.app/auth/callback` and local dev callback only as needed.
6. In Supabase Dashboard, open Authentication -> Providers -> Email (or Authentication -> Settings, depending on dashboard version), set the minimum password length to 8, save, then test signup and password recovery with seven- and eight-character passwords.
7. Confirm email confirmation is required for sign-in if intended.
8. Confirm backups, PITR/retention, and restore drill status.

Vercel:

1. Confirm production `NEXT_PUBLIC_APP_URL=https://akadeks.vercel.app`.
2. Confirm Supabase publishable env vars are set for production and preview scopes as intended.
3. Confirm no secret/service-role key is exposed as `NEXT_PUBLIC_*`.
4. Inspect production headers for public and authenticated pages.
5. Confirm preview deployments cannot use unintended auth redirect URLs.
6. Confirm production source maps are not publicly exposed unless intentionally private-managed.

Brevo:

1. Confirm sender/domain authentication.
2. Confirm templates contain no stale localhost callback.
3. Confirm suppression/bounce handling.
4. Confirm email sending limits and abuse alerts.

GitHub:

1. Confirm branch protection requires CI before merge.
2. Enable Dependabot or equivalent reviewed update process.
3. Enable secret scanning and code scanning if available.
4. Review repository secrets and Actions permissions.

Backups and monitoring:

1. Restore a recent Supabase backup into isolation.
2. Confirm error, auth-abuse, billing, and availability alerts reach the owner.
3. Confirm logs redact cookies, authorization headers, reset tokens, and passwords.

DNS/security contact:

1. Confirm canonical domain and HTTPS redirect behavior.
2. Publish and test `/.well-known/security.txt`.

## 8. Two-Account Isolation Test Plan

Use a non-production Supabase project and disposable users A and B.

Setup:

1. Deploy the current app to staging with staging Supabase env vars.
2. Create user A and user B with fresh emails.
3. As user A, create one semester, one subject, one task linked to that subject, one recurring task series, one pomodoro session, and a profile display name.
4. Record only object IDs needed for the test. Do not record tokens or cookies in shared notes.

Expected cross-user results:

- User B cannot read A's profile row.
- User B cannot list A's semesters, subjects, tasks, task series, or pomodoro sessions.
- User B cannot update or delete A's semester by ID.
- User B cannot create a subject under A's semester ID.
- User B cannot update or delete A's subject by ID.
- User B cannot create a task linked to A's subject ID.
- User B cannot update/delete/complete A's task by ID.
- User B cannot manipulate A's recurring series or cause duplicate occurrences.
- User B cannot affect A's profile preferences.

Direct API/database-client checks:

1. Authenticate as user B using the browser app or Supabase client in staging.
2. Attempt select/update/delete/insert operations against each table with A's copied IDs.
3. Confirm each operation returns no rows, an authorization failure, or a generic not-found response.
4. Repeat as anonymous/no session.

Cleanup:

1. Delete user A and user B from staging Auth.
2. Confirm `on delete cascade` removed owned profile, semester, subject, task, task series, and pomodoro rows, or manually remove staging records.

## 9. Prioritized Remediation Plan

### Blockers before launch

| Task | Risk addressed | Likely files/components | Complexity | DB/dashboard access |
| --- | --- | --- | --- | --- |
| Add persistent auth/email rate limits | Abuse, brute force, Brevo cost | Auth forms, possible server routes/proxy, provider settings | Medium | Dashboard/store required |
| Verify deployed production security headers | Browser attack surface | Vercel deployment, browser/curl inspection | Small | Vercel required |
| Verify Supabase production RLS and auth URL settings | Tenant isolation/auth redirect drift | Supabase dashboard/schema | Medium | Supabase required |
| Execute two-account isolation test | Cross-user access regressions | Staging app + Supabase | Medium | Supabase required |

### Fix immediately after blockers

| Task | Risk addressed | Likely files/components | Complexity | DB/dashboard access |
| --- | --- | --- | --- | --- |
| Keep raw-provider-error regression coverage for new actions | Information disclosure | Future server actions/data loaders | Small | No |
| Add account deletion/export | Privacy/user rights | Settings page, server actions, SQL cleanup | Large | Supabase required |
| Raise password minimum to 8+ | Weak passwords | Auth config, update form | Small | Supabase required |
| Add security contact | Reporting process | `public/.well-known/security.txt` | Small | No |

### Defense-in-depth improvements

| Task | Risk addressed | Likely files/components | Complexity | DB/dashboard access |
| --- | --- | --- | --- | --- |
| Add DB-level parent-child ownership enforcement | Future code path mistakes | `supabase/schema.sql` | Medium | Supabase migration |
| Add cache-control assertions | Auth response caching | Next config/proxy | Small | Vercel verification |
| Add dependency and secret scanning in CI | Supply chain/secret leakage | GitHub Actions/settings | Small/Medium | GitHub required |
| Improve legal pages with subprocessors/effective dates | Compliance/disclosure | Legal pages | Small/Medium | Legal review |

### Future controls triggered by new features

| Feature | Controls to add |
| --- | --- |
| Payments | Webhook signature verification, idempotency, entitlement state machine, server-side totals. |
| Uploads | Private buckets, size/type/magic-byte checks, quotas, signed URLs, malware scanning where needed. |
| AI | Prompt-injection boundaries, least-authority tools, structured output validation, human review. |
| Staff/admin roles | RBAC, audit logs, per-request role lookup, MFA, impersonation controls. |

## 10. Commands and Results

| Command | Purpose | Result |
| --- | --- | --- |
| `Get-Content` on pasted request and checklist | Read user-provided audit scope | Completed; treated attached checklist as audit input, not higher-priority instructions. |
| `git status --short` | Working tree status | Report file untracked; existing unrelated worktree changes present. Git global ignore warning appeared. |
| `Get-Content AGENTS.md`, `CLAUDE.md` | Repo instructions | Next.js docs warning found; no conflicting repo instructions. |
| `Get-Content package.json`, `next.config.ts`, CI workflow | Dependency/config/CI inspection | Lockfile-based npm project; empty Next config; CI runs lint/typecheck/test/build. |
| `Get-Content supabase/schema.sql` | Schema and RLS inspection | RLS enabled and owner policies present on user tables. |
| `rg` route/action/client searches | Auth, redirects, env, errors, storage, headers inspection | Found auth helper/use, raw error patterns, no upload/storage, no security headers. |
| `Get-ChildItem public` | Public files inspection | Only brand/screenshot assets found. |
| `Get-ChildItem` test search | Test coverage inventory | Four test files found. |
| `npx tsc --noEmit` | TypeScript static check | PASS. |
| `npm run lint` | Lint check | PASS. |
| `npm test` | Existing test suite | PASS: 4 files, 37 tests. |
| `npm audit --audit-level=low` | Dependency vulnerability check | Not completed; registry endpoint failed locally, escalated rerun rejected due external data egress risk. |
| `npm run build` | Production build | First sandboxed run failed due Google Fonts network fetch; network-enabled rerun PASS. |
| `npm run start -- -p 3001` + `Invoke-WebRequest` | Local runtime header verification | Confirmed CSP/nosniff/XFO/referrer/permissions headers on `/`; confirmed `Cache-Control: private, no-store` on `/dashboard` redirect. HSTS is covered by unit test and requires Vercel production verification. |
| Sensitive filename scans using `Get-ChildItem`, `git log --name-only` | Look for tracked sensitive filenames | Only `.env.example` matched tracked/history patterns; `.env` exists locally but is not listed as tracked. |
| Secret-name `rg -l` scan | Look for obvious secret-related strings without printing values | Produced likely false positives in lockfile/UI text; no service-role variable usage found in app code. |
