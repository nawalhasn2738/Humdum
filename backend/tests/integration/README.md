# Backend integration security suite

These tests start the real Express application on an ephemeral local port and exercise routes, authentication middleware, controllers, and services over HTTP. Supabase token verification and PostgreSQL are replaced at their external boundaries with isolated deterministic adapters, so tests never read or mutate developer or production data. Existing files under `tests/*.test.js` remain unit tests; integration tests live only under `tests/integration/`.

| Test | Setup | Request | Expected result | Security property |
|---|---|---|---|---|
| Missing/invalid authentication | No token or an unknown token | `GET /api/protected` | `401` | Forged or absent credentials cannot authenticate. |
| Backend identity authority | Valid token mapped to a tenant database profile | `GET /api/protected` | `200`, tenant role and profile ID from DB | Client claims do not choose application role. |
| Admin RBAC | Tenant identity | `GET /api/admin/verifications` | `403` | Tenant cannot enter admin verification surfaces. |
| Tenancy RBAC | Landlord, then tenant identity | `POST /api/tenancies` | Landlord `403`; tenant reaches `400` validation | Route role gate permits only tenants. |
| Public moderation | A requested listing is absent from the active-only fixture | `GET /api/listings/9` | `404` and generic not-found | Non-public listings do not leak through direct IDs. |
| Compliance RBAC | Tenant and safety inspector identities | `POST /api/listings/9/audit` | Tenant `403`; inspector reaches `400` validation | Only admin/auditor roles can submit verification. |
| Safety moderation | Safety query has no active listing | `GET /api/listings/9/safety-score` | `404` | Safety endpoints cannot reveal non-public listings. |
| Tenancy overlap | Existing active tenancy overlaps requested dates | `POST /api/tenancies` | `409`, transaction rollback | Concurrent/overlapping occupancy is rejected atomically. |
| Inquiry ownership | Inquiry belongs to another landlord | `PATCH /api/inquiries/7/status` | `403`, transaction rollback | Inquiry IDs cannot bypass landlord ownership. |
| Messaging privacy | Preliminary, unverified conversation contains raw contacts | `GET /api/messages/9?participantId=201` | `200`, content and contacts masked | Contact details remain private before a verified relationship. |
| Family profile ownership | Tenant A requests Tenant B's family profile | `GET /api/family-profiles/102` | `403`, no profile payload | Family and guardian data is protected against IDOR. |
| Evidence ownership | Landlord A requests Landlord B's listing evidence | `GET /api/uploads/listing/9` | `403`, no documents | Private verification evidence is owner/admin only. |

Run unit and integration suites separately:

```text
npm run test:unit
npm run test:integration
npm test
```

The adapter is intentionally query-contract based. Tests requiring PostGIS behavior, PostgreSQL exclusion constraints, Supabase JWT cryptography, or object-storage enforcement should additionally run against a disposable migrated test environment in CI; they must never target production.
