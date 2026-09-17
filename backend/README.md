# Humdum Backend

Backend API for Humdum, a safety-focused property and tenancy platform. The service combines verified property data, geospatial discovery, compliance workflows, privacy-preserving communication, and role-based access controls for tenants, landlords, safety inspectors, and administrators.

## System Architecture Overview

```text
Next.js / mobile clients
          |
          | HTTPS + Supabase access token
          v
Node.js + Express API
  |-- Supabase Auth: JWT and SMS OTP verification
  |-- PostgreSQL: transactional domain data
  |-- PostGIS: radius searches and spatial indexes
  |-- Supabase Storage: private verification documents
  |-- Redis: TTL response cache
  `-- BullMQ: asynchronous compliance notifications
```

The application uses CommonJS Node.js modules and parameterized `pg` queries. Authentication tokens are verified with Supabase Auth, while application roles are resolved from the local `users` table. PostgreSQL transactions and constraints provide the final integrity boundary for booking, compliance, and audit data.

## Core Features & Modules

### Authentication and RBAC

- Supabase JWT verification and SMS OTP flows.
- Roles: `tenant`, `landlord`, `admin`, and `safety_inspector`.
- Route-level authentication and reusable role authorization middleware.
- Database-backed role resolution using verified email or phone claims.

### Geospatial Listings

- PostGIS `geometry(Point, 4326)` storage.
- Meter-based radius searches using `ST_DWithin` and geography casts.
- GIST indexes for geometry and geography query paths.
- Redis caching for listing searches with normalized query-string keys.

### Compliance Audit Service

- Admin and safety-inspector audit creation and updates.
- Server-computed fire, CCTV, warden, and aggregate audit scores.
- Audit expiry tracking and tenant-facing safety states.
- Asynchronous compliance-notification jobs through BullMQ.

### Composite Safety Index

- Dynamic score from current compliance evidence, completed-tenancy reviews, and verified security infrastructure.
- Weighted model: compliance 50%, tenant reviews 30%, and security infrastructure 20%.
- Returns component contributions, confidence/data completeness, and rating labels.

### Tamper-Evident Audit Trails

- Immutable PostgreSQL audit-log records for compliance changes.
- Per-listing SHA-256 hash chains containing previous and new state.
- Database triggers reject ordinary updates and deletions.
- Admin history responses re-verify every link and report chain integrity.

### Masked Messaging

- Listing-scoped tenant/landlord conversations.
- Email and phone redaction for preliminary contacts.
- Contact details become available only to verified tenancy relationships or authorized admins.
- Message access is restricted to conversation participants.

### Abuse and Anomaly Detection

- Flags unusually low rent relative to a local PostGIS median.
- Detects duplicate descriptions across unverified landlord accounts.
- Detects rapid message bursts and high recipient fan-out.
- Updates listing moderation state or user risk scores and creates evidence-backed moderation reports.

### Family Profiles

- Tenant-owned emergency contacts, guardian numbers, and check-in preferences.
- Requires an active tenancy.
- Accessible only to the student, an authorized admin, or the landlord for the verified tenancy.
- Uses cryptographically random share tokens.

### Concurrency-Safe Tenancy Booking

- Explicit `BEGIN`, `COMMIT`, and `ROLLBACK` transaction handling.
- `SELECT ... FOR UPDATE NOWAIT` serializes claims on a listing.
- PostgreSQL GIST exclusion constraint prevents overlapping active tenancy ranges.
- Lock contention and occupied date ranges return HTTP `409 Conflict`.

### Caching and Background Jobs

- Redis TTL cache with graceful PostgreSQL fallback.
- Listing search TTL: 60 seconds.
- Safety-score TTL: 120 seconds.
- Targeted invalidation after listing and compliance writes.
- BullMQ worker runs separately from the API process with retries and graceful shutdown.

### Secure Document Storage

- Private Supabase Storage bucket managed with server-only credentials.
- PDF, JPEG, and PNG MIME plus magic-byte validation.
- Configurable upload limit, randomized object paths, and SHA-256 file digests.
- Stable object metadata is stored in PostgreSQL; clients receive short-lived signed URLs.

## Setup & Installation

### Prerequisites

- Node.js 20 or newer and npm.
- A Supabase project with PostgreSQL, Auth, Phone Auth, and Storage enabled.
- Permission to enable the `postgis` and `btree_gist` PostgreSQL extensions.
- Redis 7 or a compatible managed Redis service. BullMQ deployments should use a `noeviction` memory policy.
- An SMS provider configured through Supabase for phone OTP delivery.

### Install

From the repository root:

```bash
cd backend
npm install
```

### Environment Configuration

Create `backend/.env` from `.env.example` and replace every placeholder:

```bash
cp .env.example .env
```

On PowerShell:

```powershell
Copy-Item .env.example .env
```

Important variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | Express HTTP port; defaults to `5000`. |
| `DATABASE_URL` | Supabase PostgreSQL connection string. |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_PUBLISHABLE_KEY` | Server-side Supabase Auth verification client key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server-only Storage key. Never expose it to clients. |
| `SUPABASE_STORAGE_BUCKET` | Private document bucket name. |
| `JWT_SECRET` | Reserved for legacy/local JWT verification; current Supabase verification uses `getClaims()`. |
| `REDIS_URL` | Redis connection URL used by caching and BullMQ. |
| `MAX_UPLOAD_BYTES` | Maximum upload size; defaults to 10 MB. |
| `SIGNED_URL_TTL_SECONDS` | Private document URL lifetime, clamped to 60-3600 seconds. |
| `COMPLIANCE_WORKER_CONCURRENCY` | Concurrent BullMQ compliance jobs. |

### Database Migrations

Run migrations in this order against a new database:

```bash
npm run migrate
npm run db:indexes
npm run db:audit-trail
npm run db:anomalies
npm run db:family-profiles
npm run db:tenancy-concurrency
npm run db:uploads
```

The scripts create the core schema, PostGIS indexes, integrity constraints, audit chain, moderation structures, family-profile fields, concurrency constraint, and upload metadata table. Review existing data before applying exclusion or uniqueness constraints to a populated database.

### Run the Services

Development API with automatic restart:

```bash
npm run dev
```

Production-style API:

```bash
npm start
```

Run the BullMQ worker in a separate process:

```bash
npm run worker:compliance
```

The API defaults to `http://localhost:5000`. Redis is optional for basic API availability: cache and queue failures degrade gracefully, while PostgreSQL remains the source of truth.

## API Endpoints Reference

Requests and responses use JSON unless an endpoint specifies multipart form data. Protected endpoints require:

```http
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

### Authentication

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Register a tenant or landlord profile. |
| `POST` | `/api/auth/phone/request-otp` | Public | Request a Supabase SMS verification code. |
| `POST` | `/api/auth/phone/verify-otp` | Public | Verify the code and receive session tokens. |

### Listings and Safety

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/listings` | Public | List properties; supports `latitude`, `longitude`, and `radiusKm`. |
| `POST` | `/api/listings` | Landlord, admin | Create a geocoded property listing. |
| `GET` | `/api/listings/:id/safety-score` | Public | Calculate the composite property safety index. |

### Compliance

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/listings/:id/audit` | Public | Fetch the latest compliance audit. |
| `POST` | `/api/listings/:id/audit` | Admin, safety inspector | Create or update the current audit. |

### Audit Trail and Moderation

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/audit-logs/:listingId` | Admin | Retrieve and verify the complete compliance hash chain. |
| `GET` | `/api/admin/anomalies` | Admin | Retrieve open listing and user anomaly reports. |

### Messaging

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/messages` | Authenticated profile | Send a privacy-filtered listing message. |
| `GET` | `/api/messages/:listingId` | Participant, admin | Retrieve the caller's listing conversation. |

### Tenancies and Family Profiles

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/tenancies` | Tenant | Transactionally book an available date range. |
| `POST` | `/api/family-profiles` | Tenant | Create or update emergency guardian information. |
| `GET` | `/api/family-profiles/:userId` | Owner, verified landlord, admin | Retrieve an authorized family profile. |

### Secure Uploads

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/uploads/document` | Authenticated role with target permission | Upload a PDF, JPEG, or PNG as multipart field `file`. |

Supported upload document types are `identity_verification`, `listing_verification`, and `compliance_certificate`. Target fields such as `subjectUserId`, `listingId`, and `auditId` are validated according to the document type and caller role.

### Diagnostics

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Basic service liveness response. |
| `GET` | `/test-db` | Public development utility | Test PostgreSQL connectivity with `SELECT NOW()`. |
| `GET` | `/api/protected` | Authenticated | Confirm JWT verification and resolved profile role. |

`/test-db` should be removed or protected before a public production deployment.

## Security Notes

- Never commit `.env` or expose the Supabase service-role key, database credentials, Redis credentials, or JWT secrets.
- Keep the document bucket private; persist object paths and generate signed URLs only when authorized.
- Place the API behind TLS and a trusted reverse proxy in production.
- Apply rate limits at the gateway and monitor anomaly reports, failed OTP attempts, upload failures, Redis health, and BullMQ failures.
- Database constraints remain authoritative even when application-level validation or caching is bypassed.

## License

This repository currently uses the ISC license declared in `package.json`.
