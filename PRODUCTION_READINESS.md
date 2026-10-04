# Clipvero release readiness

Review date: 2026-10-04. Status: **not ready for store release**.

This pass hardens the Android app and establishes repeatable checks. Passing
unit tests and assembling an APK do not verify rendered video or certify iOS.

## Repairs

- Fixed TypeScript errors and ESLint errors in app code and test fixtures,
  including broken PiP slider props, sticker haptics, and sound-effect playback
  arguments.
- Preserve the current project when returning from Export or the media picker.
  Returning Home clears navigation history. Android hardware Back follows
  navigation and is blocked during export.
- Flush autosave when leaving the editor or backgrounding the app. Serialize
  project/export list writes, write native JSON atomically, preserve unreadable
  storage, and surface persistence errors.
- Fix cumulative slider/trim movement, speed-adjusted trimming, stale gesture
  callbacks, repeated sticker dragging, and thumbnail sampling across the source.
- Reject unavailable native export/voiceover support instead of simulated
  success. Reject unsupported export edits instead of silently losing them.
  The export screen offers the original frame rate and default encoder quality.
- Android video sharing uses a restricted FileProvider, a video stream, and
  temporary read permission instead of sharing a private path as text.
- Settle cancelled export promises, reject concurrent exports, ignore stale
  preparation/completion callbacks, and sanitize output names.
- Detect picked image MIME types and dimensions. Missing media and unusable
  audio tracks fail instead of substituting sample footage or dropping audio.
- Remove debug signing from release variants. Signing uses environment variables.
- Add `npm run typecheck`, `npm run check`, and GitHub Actions JavaScript checks.
- Remove the stale checked-in Android JavaScript bundle. Debug builds use Metro;
  release bundles are generated from current source by the Gradle plugin.

## Required validation

Run `npm run check` for TypeScript, ESLint, and Jest. Android checks:

```sh
cd android
./gradlew :app:assembleDebug :app:lintDebug
./gradlew :app:assembleRelease
```

The initial baseline had three ESLint errors, TypeScript errors, two timed-out
editor tests, and 59 Android lint errors. Repairs target the underlying errors;
no lint baseline was added to hide them. JavaScript still has existing inline
style warnings. Final observed results are recorded in the handoff below.

## Observed results

- `npm run check`: passed TypeScript, ESLint, and the then-current 63 tests.
- Final `jest --runInBand`: 64 tests passed across 12 suites.
- Final `tsc --noEmit`: passed. Focused ESLint after the last code edits: passed.
  Full ESLint has 0 errors and 107 existing style warnings.
- `./gradlew :app:assembleDebug :app:lintDebug --offline`: passed after fixing
  native lint findings; lint has 0 errors and 54 warnings.
- `./gradlew :app:assembleRelease --offline`: passed, including release bundling
  and vital lint. The output is unsigned.
- After removing the checked-in bundle,
  `./gradlew :app:assembleDebug :app:assembleRelease --offline`: passed.
  The release APK bundle hash matched Gradle's generated bundle.
- Physical-device tests and iOS build/tests: not run. Only Xcode command-line
  tools are installed, and there is no native iOS media implementation.
- Emulator smoke testing: incomplete. The first attempt installed the debug APK,
  then showed a system ANR and a `PlatformConstants` runtime error. A second
  attempt used a freshly bundled release APK signed with the debug key in `/tmp`
  solely for testing. Conventional installation eventually succeeded and the
  release app reached Home; scoped AndroidRuntime/ReactNativeJS error logs were
  empty. Android system/System UI ANR dialogs persisted and blocked interaction.
  Editor playback and actual media export are not verified. Temporary emulator
  instances and Metro were stopped after testing.

## Remaining release blockers

1. The Android renderer does not implement text, stickers, PiP, reverse, speed
   changes/curves, flips, crop, color adjustments/filters, real transitions,
   non-fit canvas backgrounds, original aspect ratio, partial audio gain,
   positioned background audio, or fades. These now produce an export error.
   Implement and validate each effect against output frames/audio before
   removing its capability guard. Frame-rate conversion and custom encoder
   quality also remain unsupported.
2. There is no native iOS media engine or persistent project storage. iOS export
   and voiceover now report unavailable. An iOS native implementation, icons,
   permissions, and Xcode/device validation are required before offering iOS.
3. No physical Android device is attached to ADB. A read-only API 30 emulator
   booted and the APK installed, but Android showed a system ANR. A screenshot
   also showed a missing `PlatformConstants` runtime error. The stale checked-in
   JavaScript bundle was removed as a mismatch risk. The fresh release reached
   Home without that error, but a stable interactive device retest is required.
   Real-device import, preview sync,
   export, cancellation/retry, process-restart recovery, and receiving-app
   attachment access remain unverified. Test portrait/landscape/images, muted
   first clips followed by audible clips, damaged/missing sources, low storage,
   long timelines, backgrounding, and repeated exports. Inspect output duration,
   dimensions, playback, and audio rather than only the success screen.
4. Configure an owned upload key and validate a signed release on a device.
   Ads and premium services remain placeholders; production monetization is
   unimplemented.

## Release signing

Supply all four environment variables through a private local environment or CI
secret store. Do not put credentials or a release keystore into this repository.

- `CLIPVERO_UPLOAD_STORE_FILE`: absolute path to the upload keystore.
- `CLIPVERO_UPLOAD_STORE_PASSWORD`: keystore password.
- `CLIPVERO_UPLOAD_KEY_ALIAS`: upload-key alias.
- `CLIPVERO_UPLOAD_KEY_PASSWORD`: key password.

Without these variables, the release APK is unsigned. A successful unsigned
build is validation only and must not be represented as a distributable release.
No store upload, deployment, Git commit, or remote push was performed.
