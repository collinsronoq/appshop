# Unit 1 Authentication

This document describes the authentication behavior implemented in Unit 1.

## API Surface

All authentication endpoints use the `/api/v1` base path:

- `POST /auth/register` creates an active user and returns access and refresh credentials;
- `POST /auth/login` verifies credentials and creates a new refresh session;
- `POST /auth/refresh` rotates a refresh credential and returns a new credential pair;
- `POST /auth/logout` idempotently revokes the supplied refresh credential;
- `GET /me` returns the active user identified by a Bearer access token.

Errors use the stable envelope defined in `05-api-contract.md`. Validation error details exclude
request input values so passwords are not reflected back to clients.

## Passwords

Passwords must contain between 8 and 128 characters. The API does not impose character-class
requirements. Passwords are hashed with Argon2id through a single security abstraction. The
stored encoded hash contains its salt and algorithm parameters, and successful login can replace
an outdated parameter set with a fresh hash.

Emails are deterministically normalized by trimming surrounding whitespace and converting to
lowercase. The normalized value is protected by a database unique constraint.

## Access Tokens

Access credentials are HS256 JWTs containing only:

- `sub`: user UUID;
- `type`: `access`;
- `iat`: issue time;
- `exp`: expiry time;
- `jti`: unique token UUID.

The default lifetime is 15 minutes. Access tokens are not stored by the API and are not denylisted.
Logout therefore does not invalidate an already issued access token; it remains valid until expiry
unless the user is disabled.

## Refresh Sessions

Refresh credentials are opaque, cryptographically random values. The raw value is returned once;
the database stores only its SHA-256 digest. The default lifetime is 30 days.

Successful refresh locks the session row, creates a replacement session, records the replacement
relationship, revokes the old session, and commits the rotation as one transaction. A concurrent
or later use of the old credential is rejected.

If a rotated credential is replayed, Unit 1 walks its recorded successor chain and revokes active
successors. This signs that device-session chain out without introducing a global access-token
blacklist. Unknown, expired, revoked, and disabled-user refresh attempts issue no credentials.

## Configuration

Environment variables:

```text
JWT_SECRET
JWT_ALGORITHM=HS256
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30
```

`JWT_SECRET` must contain at least 32 characters. The clearly fake development default is accepted
only in development and test; staging and production fail settings validation until it is replaced.

## Mobile Session Lifecycle

The Expo client stores only the current refresh credential in Expo SecureStore. The access token is
held in memory. At startup, a stored refresh credential is rotated and `/me` is loaded before the
authenticated route group is shown. Any restoration failure clears the secure credential and shows
the login route.

Authenticated requests attach the access token. A 401 response triggers one coordinated refresh;
concurrent failures share the same refresh promise, and each failed request is retried at most once.
Logout attempts remote revocation and always clears local state even if the network request fails.

Secure credential persistence is intentionally unavailable on the optional web target because Expo
SecureStore is a native-device facility.

## Deferred Authentication Features

Password reset, email verification, OAuth, multi-factor authentication, and passkeys are not part
of Unit 1.
