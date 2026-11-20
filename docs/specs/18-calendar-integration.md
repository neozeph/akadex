# 18: Calendar integration

Goal: make academic deadlines available in a student's calendar. Depends on specs 04 and 10.

Stories, each requiring an isolated real E2E scenario:

1. A student exports or connects deadlines using the selected integration mode, with correct date-only and timezone semantics.
2. Updated/deleted/recurring tasks follow the selected synchronization policy without duplicate calendar events.
3. Disconnect/revocation prevents future access and does not expose another student's data. Failed synchronization is visible and recoverable.

Plan: choose a single provider or ICS mode, one-way versus two-way behavior, scopes, update/deletion rules, recurrence semantics, and token handling before code. Prefer the smallest integration satisfying the chosen stories.

Test: real sandbox calendar or ICS import, date boundaries, changes/deletion, duplicate sync, revoked access, and two-account isolation. Mutation: destabilize event identity and confirm duplicate detection fails. Remove test events/subscriptions afterward.

Status: deferred product/provider decision. No OAuth secrets, provider connections, or calendar writes are authorized by this spec alone.
