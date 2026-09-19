# Humdum QA defect log (`qa-fizza`)

Logged during frontend/backend integration. Coordinate patches with Nawal (backend) and Iman (frontend).

| ID | Severity | Area | Finding | Status |
| --- | --- | --- | --- | --- |
| INT-01 | High | Auth contract | `api-contract.md` documents `POST /api/auth/signup`; backend implements `POST /api/auth/register`. QA added a `/signup` alias. | Patched on `qa-fizza` |
| INT-02 | High | Auth | Frontend login was email/password mock; backend issues JWTs via Supabase SMS OTP. Without live Supabase Auth keys, E2E login cannot complete. QA added development login gated by `ALLOW_DEV_LOGIN=true`. | Patched on `qa-fizza`; production still needs real OTP keys |
| INT-03 | High | Listings | Frontend listing cards use `area`, `isVerified`, amenities, and metro fields. Backend listings return `title`, `rent`, `deposit`, `curfewRules`, and PostGIS `location`. Mapper now bridges the gap. | Patched on `qa-fizza` |
| INT-04 | Medium | Listings | No `GET /api/listings/:id` existed, so listing detail pages could not load live records. | Patched on `qa-fizza` |
| INT-05 | Medium | CORS | Backend used open `cors()`. Playbook requires an explicit allow-list for `http://localhost:3000`. | Patched on `qa-fizza` |
| INT-06 | Medium | Env | Frontend `.env.local` must use `NEXT_PUBLIC_API_URL=http://localhost:5000/api`, not the server root. | Patched on `qa-fizza` |
| INT-07 | Medium | Auth roles | Older frontend used `seeker`/`host`. Iman's merged app uses email login; backend roles remain `tenant`/`landlord`/`admin`. | Patched on `qa-fizza` after Iman merge |
| INT-08 | Low | Saved listings | No backend shortlist endpoint exists. Saved places remain client-side. | Open; needs Nawal endpoint or stays local for MVP |
| INT-09 | High | Secrets | `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are still placeholders, so OTP, storage uploads, and production JWT verification are blocked. | Patched locally; OTP still uses Supabase phone flow in production |
| INT-10 | Medium | Admin seed | Self-service registration cannot create `admin`. Anomaly and audit-log E2E requires a seeded admin user. | Patched; `admin@humdum.com` seeded |
| INT-11 | Blocker | Database | `DATABASE_URL` host `db.naxthvdfxnrkvkjpcpim.supabase.co` does not resolve (`ENOTFOUND`). Live register, listing writes, tenancy, messaging, and audits cannot complete until Nawal provides a reachable PostGIS URL. Frontend falls back to sample listings. | Patched; session pooler `aws-0-ap-northeast-1` connected, migrations run |
| INT-12 | Info | Phase 4 | Tenant POST /listings returns 403; concurrent tenancy on listing 1 returns 201 + 409; .exe upload returns 415. Valid storage upload (4.3.1) not fully proven. | 4.1 / 4.2 / 4.3.2 passed |
| INT-13 | High | Frontend merge | Iman merged PR #2 into `main` (new v0 SPA). `main` still lacks Nawal's backend. Pulled into `qa-fizza`; listings/auth remapped. Messages, saved, admin, and family remain client-side. | Patched on `qa-fizza` |
