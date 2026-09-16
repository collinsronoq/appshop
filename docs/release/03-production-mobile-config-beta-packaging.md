# Release Readiness Unit 3 — Production Mobile Configuration & Beta Packaging

## Scope and baseline

- Starting commit: `0c6197c` (`test: validate multi-user household isolation`).
- Existing unrelated working-tree changes were preserved and are intentionally excluded from this Unit 3 change: `.env.example`, `apps/mobile/expo-env.d.ts`, `apps/mobile/src/design/components.test.tsx`, `apps/mobile/src/design/components.tsx`, `apps/mobile/src/screens/list-detail-screen.tsx`, and untracked `apps/mobile/.gitignore`.
- Expo SDK 57 / React Native 0.86.3; app version `0.1.0`.

## Identity and build profiles

- Android package: `com.collinsrono.appshop` (permanent production identifier).
- iOS bundle identifier remains unchanged because this unit targets Android packaging.
- Deep-link scheme remains `householdshopping`.
- Expo owner/project: `@collinsrono/household-shopping`, project ID `6814b859-765a-4096-82df-630e70473699`.
- `development`: internal development-client APK.
- `preview`: internal standalone APK.
- `production`: Android App Bundle (`.aab`).
- Version code remains the initial `1`; no remote versioning was enabled.

## Environment and API safety

Local development continues to use the ignored `.env` file and emulator/device-specific URLs. EAS profiles label the bundle as `development`, `preview`, or `production`. A production bundle now fails at startup if `EXPO_PUBLIC_API_BASE_URL` is missing, non-HTTPS, or points at a local host. No public staging or production API URL is currently configured, so preview can only be exercised against the local development API and is not an externally usable beta until a deployed HTTPS API is supplied.

Android cleartext traffic is explicitly enabled temporarily so a physical device can call the LAN development API over HTTP. This must be removed when the preview/production API moves to HTTPS.

## Native capability audit

- `expo-notifications` remains installed and configured. Android remote push is not available in Expo Go; standalone/development builds are the supported path.
- No `google-services.json`, Firebase app, FCM credentials, or EAS secret were found. Push-token registration/delivery cannot be validated and must be completed before production push use.
- No app-specific icon/adaptive-icon or splash artwork is currently configured; Expo defaults remain. Branding assets should be supplied before store submission.
- Image-picker permissions are limited to photo-library access; camera and microphone are disabled. No broad storage permission was added.

## Verification

- `npx expo config --type public`: confirms package, scheme, version, and EAS project ID above.
- `npx tsc --noEmit`: passed.
- Mobile Jest suite: **14 suites / 42 tests passed**.
- Physical Android device: unavailable in this environment; emulator-only validation is recorded below.

## Preview artifact

Preview build started with `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api/v1 npx eas-cli@latest build --profile preview --platform android --non-interactive`.

- EAS build ID: `e6d54ab0-9bd0-4359-a013-6d1fbd7c21fa`.
- Artifact status at documentation time: `IN_QUEUE` (EAS log: https://expo.dev/accounts/collinsrono/projects/household-shopping/builds/e6d54ab0-9bd0-4359-a013-6d1fbd7c21fa).
- The APK must be installed under `com.collinsrono.appshop`, launched with Metro stopped, and checked for standalone startup once the queue completes. Because no public API exists yet, networked beta flows remain limited to the local emulator bridge (`10.0.2.2`) when explicitly supplied at build time.

## Release decision

- **Beta:** BETA APK READY WITH LIMITATIONS (pending successful artifact installation; no public staging API, Firebase/FCM, branding assets, or physical-device check).
- **Production AAB configuration:** PRODUCTION AAB CONFIG NOT READY (profile is configured, but a deployed HTTPS API and production push/branding configuration are still required).

No Play Console submission or store listing work was performed.
