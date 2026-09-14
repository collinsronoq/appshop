# Release Readiness Unit 1 — Development Build and Native Validation

Date: 2026-09-14

Status: **NOT NATIVE READY**

## Baseline

- Starting commit: `3372d09 refactor: make mobile app bar global`
- Pre-existing working-tree changes were preserved and excluded from this unit's commit: `.env.example`, `apps/mobile/.gitignore`, `apps/mobile/expo-env.d.ts`, `apps/mobile/src/design/components.tsx`, `apps/mobile/src/design/components.test.tsx`, and `apps/mobile/src/screens/list-detail-screen.tsx`.
- Expo configuration source: `apps/mobile/app.json`.
- Installed versions after compatibility fixes:
  - Expo SDK package: `57.0.22`
  - React Native: `0.86.3`
  - Expo Router: `57.0.21`
  - `expo-notifications`: `57.0.18`
  - `expo-image-picker`: `57.0.17`
  - `expo-dev-client`: `57.0.19`

## Development-build configuration

- App name: `AppShop`
- Android package: `com.example.householdshopping` (existing identifier preserved)
- Custom scheme: `householdshopping` (existing scheme preserved)
- `apps/mobile/eas.json` now has separate `development` and `production` profiles. The development profile enables `developmentClient` and internal distribution.
- `expo-dev-client`, `expo-image-picker`, and the native peer packages required by Expo Router/vector icons are installed at Expo-compatible versions.
- The obsolete `newArchEnabled` field was removed because it is not valid in the installed SDK 57 config schema.
- `EXPO_PUBLIC_API_BASE_URL` remains environment-driven. The ignored mobile development environment uses the Android-emulator bridge rather than hardcoded application logic.
- No Expo token, Android credential, signing secret, or service credential was added to source control.

## Build method and blocker

The selected route is an EAS Android development build. A local `npx expo run:android` build was not selected because this WSL installation has no Java runtime and its Android SDK contains only `platform-tools`, with no Android platforms or build tools. Installing a second complete Android toolchain in WSL is outside this unit's scope.

The intended build command is:

```text
npx eas-cli@latest build --profile development --platform android --non-interactive
```

No build was uploaded or produced. EAS CLI reports that the environment is not logged in, the Expo config has no `extra.eas.projectId`, and this session did not have approval to export the repository to Expo's cloud build service. Android credential availability therefore could not be determined. The minimum continuation is to authenticate EAS, link the intended Expo owner/project (which writes the real project ID), explicitly approve the source upload, and rerun the command.

ADB confirmed `emulator-5554` is online. Because there is no installable APK, its package query returned no `com.example.householdshopping` installation; AppShop was not launched or validated outside Expo Go.

## Push notifications

Automated coverage confirms the existing client/backend contract for permission-aware token registration, authenticated `POST /api/v1/push-tokens`, token refresh reconciliation, logout resilience when unregistering fails, canonical notification parsing, cross-household selection, and cold-start routing after auth/household bootstrap. Existing backend integration coverage also defines same-token idempotency and safe ownership movement between users.

Native results remain blocked:

- Android notification permission was not exercised in a development build.
- An Expo push token was not obtained; no token value was logged.
- Backend registration, repeated registration, disable/unregister, and user switching were not manually observed on an installed app.
- Real delivery and foreground, background-tap, cold-start-tap, stale-state, and cross-household behavior were not exercised on Android.
- EAS project linkage/project ID, Android push credentials, and a development-build push token are all still unavailable.

These are configuration/environment blockers, not claimed code successes.

## Product image picker and persistence

Inspection found a confirmed P1 product-image path defect: mobile had no library picker/upload flow; authenticated requests always forced JSON content type, relative backend image URLs were passed directly to React Native, and the backend returned image URLs without exposing a retrieval route.

The smallest end-to-end code fix was added:

- Add/Edit Product can select a library image with `expo-image-picker`.
- Permission denial shows a nonblocking message and still permits saving without a photo.
- Multipart uploads allow the native fetch implementation to supply the boundary.
- The backend stores supported uploads with a MIME-appropriate extension and serves persisted files from the configured local-storage root through `/api/v1/product-images/{key}`.
- Mobile resolves backend-relative URLs against `EXPO_PUBLIC_API_BASE_URL`.
- Catalogue, detail, and form preview surfaces fall back to their existing placeholder if loading fails.
- Camera capture was not added. Camera and microphone permissions are explicitly disabled in image-picker config.

Unit/API-client tests cover multipart construction, relative URL resolution, safe storage-root lookup, persisted image response metadata, and missing-image behavior. Native media permission, picker UI, supported image upload, reload persistence, and denial behavior could not be manually exercised without the development build.

Substitution image upload is still not exposed by the current backend/mobile contract and remains an existing limitation.

## Lifecycle, deep links, and permissions

- Expo Router retains the existing `householdshopping` scheme and notification navigation uses the canonical substitution route.
- Direct scheme launches into substitution detail and shopping mode were not tested because AppShop is not installed.
- Auth restore, household restore, foreground/background/resume, WebSocket reconnect, native logs, and force-stop/cold restart were not tested in a development build.
- Resolved Expo prebuild configuration contains the stable Android package and no camera or microphone permission introduced by image picking.
- Built-manifest permission inspection was not possible without an APK. Notification, media, and internet permissions therefore remain to be verified from the actual installed package.
- Launcher name resolves to AppShop. Launcher icon and splash behavior remain unverified native-build checks.

## Defects fixed

- **P1 — Development client/native peers absent:** installed `expo-dev-client`, plus Expo-compatible native peers identified by Expo Doctor.
- **P1 — Product photo capability blocked:** added library selection, multipart upload support, retrievable persistent image URLs, URL resolution, and load fallbacks.
- **P2 — Expo config invalid for current SDK:** removed the obsolete config field and aligned required Expo patch versions.
- **P2 — Unnecessary image-picker permissions:** camera and microphone capabilities are disabled because this flow only uses the media library.
- **Test infrastructure — nested Expo core resolution:** mapped Jest's Expo core imports to the SDK-owned installed package after npm legitimately nested it due optional worklets peer ranges.

## Automated validation

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test -- --watch=false`: 14 suites, 41 tests passed
- `npx expo-doctor`: 21/21 checks passed
- Backend Ruff: passed
- Backend mypy: passed (64 source files)
- Backend pytest: 13 passed, 43 PostgreSQL-dependent tests skipped because no dedicated test database was configured
- Focused product-image tests: 2 passed
- `git diff --check`: passed
- Native build/install: blocked; no APK was produced

## Remaining acceptance work

After EAS authentication/linkage and explicit cloud-upload approval:

1. Produce and install the development APK on `emulator-5554`.
2. Confirm the AppShop package launches outside Expo Go and reaches the emulator API base URL.
3. Run login, app-shell, auth/household restore, lifecycle, WebSocket, and native-log smoke tests.
4. Validate notification permission/token registration, idempotency, unregister, delivery, and foreground/background/cold-start routing.
5. Validate image selection, denial, upload, persisted reload, and load fallback with emulator media.
6. Exercise direct scheme routes and inspect the built Android manifest/package permissions.

Until those native acceptance checks run, the release classification is **NOT NATIVE READY**.
