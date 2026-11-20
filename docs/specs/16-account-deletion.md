# 16: Self-service account deletion

Goal: provide a deliberate, authenticated way to remove an account. Depends on spec 10.

Stories, each requiring a real E2E scenario using disposable accounts:

1. A student reviews a clear deletion explanation, confirms intent, and completes the required identity check.
2. Deletion removes the account and associated data according to an explicit retention policy, invalidates app access, and clears browser caches/pending timer data.
3. Cancellation, expired identity, repeated submission, and provider failure do not report false completion or delete another account.

Plan: decide hard deletion versus retention, identity verification, provider privileges, and failure recovery before code. Never expose administrative Supabase credentials to the browser. Document backup retention limits accurately.

Test: disposable own account, canceled flow, foreign ID, expired auth, partial provider failure, and stale tabs. Mutation: bypass confirmation/ownership and confirm failure in isolation.

Status: deletion policy and test-environment setup required. No deletion of real user accounts during development.
