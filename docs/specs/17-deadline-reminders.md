# 17: Opt-in deadline reminders

Goal: notify students about deadlines reliably. Depends on specs 04 and 10.

Stories, each requiring an isolated real E2E scenario:

1. A student opts into a chosen reminder channel and lead time, and can disable it.
2. An eligible deadline produces one reminder at the expected user-local time. Completed/deleted tasks and unsubscribed accounts produce none.
3. Failed deliveries retry within defined limits without duplicate notifications. Quiet hours and changed deadlines follow a documented policy.

Plan: decide channel/provider, scheduler, consent, quiet hours, costs, lead time, and deduplication before implementation. Use a provider sandbox or authorized test destination. No notification to real students during tests.

Test: hand-derived delivery times, midnight/DST, changed task, unsubscribe, failure, duplicate scheduling, and cleanup. Mutation: remove deduplication and confirm failure.

Status: deferred until reliability work and delivery decisions are complete. No provider provisioning in the current performance work.
