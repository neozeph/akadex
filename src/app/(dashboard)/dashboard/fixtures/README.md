# Dashboard response fixtures

Captured on 2026-11-20 from the dedicated local Supabase REST API, using its public key and an anonymous request. Empty reads and exact-count HEAD requests returned HTTP 200, with `*/0` content range. No user-owned rows were accessible or captured.

The permission-error response was captured after temporarily revoking SELECT on the isolated subjects table. Anonymous PostgREST requests returned HTTP 401 with code 42501. Permissions were restored in `finally`. Authenticated browser verification uses the same real permission failure, with its authenticated HTTP status.

Only response status, content headers, and body are stored. No keys, cookies, user identifiers, or private records are included. Unit tests replay these responses only at the external fetch boundary and exercise the real Supabase query client.
