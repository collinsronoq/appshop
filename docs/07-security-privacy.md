# Security and Privacy

## 1. Security Objective

No user may access or mutate household data without a valid household membership and sufficient role.

## 2. Authentication

Recommended:

- short-lived access token;
- rotating refresh token;
- refresh token revocation;
- secure password hashing;
- secure mobile credential storage.

## 3. Authorization

Authorization must be household-scoped.

Unsafe pattern:

```python
get_product(product_id)
```

Preferred pattern:

```python
get_product(
    household_id=current_household_id,
    product_id=product_id,
)
```

Every route must establish:

1. authenticated user;
2. membership in requested household;
3. role if privileged action is required.

## 4. IDOR Prevention

Resource identifiers are not authorization.

All nested resources must be checked against household scope.

## 5. Invitation Security

Invitation tokens must:

- be cryptographically random;
- be stored hashed where practical;
- expire;
- be one-time or idempotently consumed;
- be bound to a target household;
- optionally be bound to an invited email.

## 6. Image Security

Uploads must enforce:

- accepted media types;
- maximum file size;
- generated object keys;
- no direct use of user filenames as storage paths.

Private images should use authenticated proxying or expiring signed URLs.

## 7. WebSocket Security

WebSocket connections must authenticate.

Subscription requests must enforce household membership.

A connected user must not be able to subscribe to arbitrary list IDs outside their households.

## 8. Rate Limiting

Apply rate limits to:

- login;
- registration;
- invitation creation;
- invitation acceptance;
- image uploads;
- token refresh.

## 9. Sensitive Data

The MVP does not need to store:

- payment card data;
- government identity documents;
- exact household addresses;
- retailer loyalty credentials.

Avoid collecting unnecessary sensitive data.

## 10. Logging

Do not log:

- passwords;
- raw auth tokens;
- invitation tokens;
- signed storage URLs;
- request bodies containing secrets.

## 11. Data Deletion

Initial policy should define:

- account deletion;
- household deletion;
- image cleanup;
- refresh-session revocation;
- purchase-history deletion behavior.

Owner deletion should not silently orphan household data.

## 12. Dependency Security

CI should include:

- Python dependency scanning;
- npm dependency audit;
- static analysis where practical;
- secret scanning.

## 13. Transport Security

Production traffic must use HTTPS/WSS.

## 14. Privacy Principle

Household shopping history is private household data.

It should not be exposed across households or used for third-party advertising in the initial product.
