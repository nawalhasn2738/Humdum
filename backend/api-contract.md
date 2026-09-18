# Humdum Phase 1 API Contract

This document defines the initial request and response shapes for frontend mocks. All request and response bodies use JSON.

## Common Headers

```http
Content-Type: application/json
Accept: application/json
```

`Content-Type` is required for requests with a JSON body. Authentication is not required for these Phase 1 examples.

## POST /api/auth/signup

Registers a new tenant, landlord, or administrator.

### Request Body

```json
{
  "name": "Iman Khan",
  "email": "iman@example.com",
  "role": "tenant",
  "phone": "+923001234567"
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | Yes | User's display name. |
| `email` | string | Yes | Must be a valid, unique email address. |
| `role` | string | Yes | One of `tenant`, `landlord`, or `admin`. |
| `phone` | string | Yes | Phone number in international format. |

### Success Response

Status: `201 Created`

```json
{
  "user": {
    "id": "42",
    "name": "Iman Khan",
    "email": "iman@example.com",
    "role": "tenant",
    "phone": "+923001234567",
    "maskedPhone": "+92*******567",
    "createdAt": "2026-09-18T10:30:00.000Z"
  }
}
```

## GET /api/listings

Returns property listings near a geographic point, ordered from nearest to farthest.

### Query Parameters

Example request:

```http
GET /api/listings?latitude=24.8607&longitude=67.0011&radiusKm=5
```

| Parameter | Type | Required | Notes |
| --- | --- | --- | --- |
| `latitude` | number | Yes | Latitude in decimal degrees (`-90` to `90`). |
| `longitude` | number | Yes | Longitude in decimal degrees (`-180` to `180`). |
| `radiusKm` | number | No | Search radius in kilometres. Defaults to `5`. |

### Success Response

Status: `200 OK`

```json
{
  "listings": [
    {
      "id": "101",
      "landlordId": "7",
      "title": "Furnished room near the university",
      "description": "Private room with utilities included.",
      "rent": 35000,
      "deposit": 35000,
      "curfewRules": "Entry before 11:00 PM",
      "location": {
        "latitude": 24.8612,
        "longitude": 67.0099
      },
      "distanceKm": 0.89,
      "createdAt": "2026-09-15T08:15:00.000Z"
    }
  ],
  "meta": {
    "center": {
      "latitude": 24.8607,
      "longitude": 67.0011
    },
    "radiusKm": 5,
    "count": 1
  }
}
```

When no matching properties are found, the endpoint returns `200 OK` with an empty `listings` array and `count` set to `0`.

## GET /api/listings/:id

Returns a single listing by ID, including PostGIS coordinates.

### Success Response

Status: `200 OK`

```json
{
  "listing": {
    "id": "101",
    "landlordId": "7",
    "title": "Furnished room near the university",
    "description": "Private room with utilities included.",
    "rent": 35000,
    "deposit": 35000,
    "curfewRules": "Entry before 11:00 PM",
    "location": {
      "latitude": 33.6844,
      "longitude": 73.0479
    },
    "createdAt": "2026-09-15T08:15:00.000Z"
  }
}
```

## POST /api/auth/login

Development handshake used by the QA branch when SMS OTP is not configured. Disabled unless `ALLOW_DEV_LOGIN=true`.

### Request Body

```json
{
  "email": "iman@example.com",
  "phone": "+923001234567"
}
```
