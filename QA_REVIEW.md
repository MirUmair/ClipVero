# Clipvero functionality review — 2026-10-02

The editor-opening defect is repaired, but the application is not yet ready for a claim that all editing and export features work. This was a source review, automated validation, and limited Android device check; it was not a complete end-to-end certification.

## Repairs made

- Added the missing JavaScript audio bridge methods used by `EditorScreen`. Previously, mounting the editor called a nonexistent `MediaEngine.pausePreviewAudio`; cleanup also called a nonexistent `stopPreviewAudio`. Playback, seeking, volume, music picking, and starter music now call the existing native methods with their expected arguments.
- Made playback controls safe when native support is absent or rejects, and preserved the other audio channel's volume/mute settings during partial updates.
- Added `TEXT_BACKGROUND_COLORS`, whose missing export broke the text backdrop tab.
- Fixed effect dependencies without seeking the native audio player on every timeline tick. Cancelled stale thumbnail requests when switching clips and mapped preview frame selection to original-source time.
- Enabled development support for debug builds. Previously `useDevSupport = false` forced the checked-in JavaScript bundle to load even after source changes. Debug builds now need Metro; release builds still use a bundle.
- Added regression coverage for editor mount/unmount, changing a text backdrop, the native audio argument contract, partial volume changes, native playback rejection, and audio picker cancellation.

## Validation

- Initial baseline: 27 tests passed, but TypeScript failed with 13 errors and ESLint failed with 2 errors. The original tests did not mount the editor or open the backdrop tab.
- After repairs: 33 tests passed across 4 suites using `npm test -- --runInBand --watchman=false`.
- `./node_modules/.bin/tsc --noEmit`: passed.
- `npm run lint`: passed with 0 errors and 92 existing warnings, primarily styling.
- Android debug APK assembly completed. Android lint result is recorded below after completion.
- Updated the installed debug APK on the connected Samsung SM-A065F with `adb install -r`; existing app data was preserved. Reused the existing Clipvero Metro server on port 8081 and configured USB reverse forwarding for that port. The app process was running after launch; the scoped startup-log query returned no matching errors.
- The device showed the error-boundary screen before installation. A later UI dump failed, and screenshot access was declined, so opening the editor on the updated device is **not visually verified**. No real media import, export, or external sharing was completed during this review. iOS was not built or tested.

## Remaining findings, ordered by impact

### High: Export does not render many edits exposed in the editor

`src/media/mediaEngine.ts`, `exportProject`, serializes only a subset of clip fields. Text/stickers, background music, filters/adjustments, flips, crop, and canvas aspect/background are absent from the native request. `android/app/src/main/java/com/clipvero/ClipveroMediaEngineModule.kt`, `exportProject`, also ignores supplied clip speed/volume and export FPS/quality, and always chooses portrait dimensions. Transitions other than `none` are not implemented as advertised: `zoom` applies a constant scale; other named transitions are ignored.

An export can succeed while dropping visible edits or having a different duration. Implement the rendering contract and verify output media against the preview before enabling these as completed export features.

### High: Returning from Export recreates the editor with stale project parameters

`src/navigation/AppNavigator.tsx` unmounts the editor when another screen is shown. `EditorScreen` changes its local project state but leaves the original editor entry in `src/navigation/navigationContext.tsx` unchanged. `ExportScreen` uses `goBack()` for Edit Again, so the recreated editor receives the original project. Autosaved work may still be on disk, but the reopened state can revert and subsequent edits can overwrite it. Preserve the current project in navigation or restore the latest saved project before remounting; regression-test edit → export → Edit Again.

### High: Android Share Video sends text containing a private file path

`src/services/sharingService.ts` uses React Native `Share.share`. The installed Android implementation in `node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/share/ShareModule.kt` uses `text/plain` and `EXTRA_TEXT`, not a video attachment. Export files live in app-private storage. Use a native content URI with temporary read permission and an `ACTION_SEND` video stream; verify a receiving app can read the video.

### High: Picked images are labeled as videos

The native media picker sets `type` to `video` for every result and tries video metadata extraction even for images. Images fall back to invented video dimensions/duration. The image-thumbnail branch checks filename extensions, which content-provider URIs often omit. Detect MIME type via `ContentResolver`, decode image dimensions, and set an explicit image duration in the export pipeline.

### Medium: Preview is a thumbnail slideshow, not a video player

`src/editor/preview/VideoPreviewPlayer.tsx` displays cached thumbnails in an `Image` while a JavaScript interval advances the playhead and separate native players handle audio. This cannot verify actual frame-accurate playback or audio/video sync. Several adjustment and text-animation settings are not rendered. The thumbnail cache also slices larger frame sets when a smaller count is requested, which can omit the end of a source. A real video preview path and media fixtures are still needed.

### Medium: Trim gestures can drift and use outdated callbacks

`src/editor/timeline/ClipItem.tsx` adds cumulative `gestureState.dx` to trim refs that update during the same drag, compounding movement. Its once-created responders retain the initial callback, which can refer to an older project and lose later changes. Pixel deltas are not adjusted for clip speed. Capture gesture-start bounds, use current callbacks, and test repeated moves after another edit. Trim updates also bypass undo history in `EditorScreen`.

### Medium: Cancellation does not settle the original export promise

The native `cancelExport` cancels the transformer and resolves its own promise, but does not retain/reject the original `exportProject` promise. The JavaScript export subscription is removed only in that original call's `finally`. Handle cancellation as a terminal export result and test cancel → retry with no pending listener or stale completion.

### Medium: Other advertised paths remain incomplete

- The sample picker uses remote sample URLs even though bundled samples and a native `getStarterSamples` method exist; that method is never called by the JavaScript picker. Remote failures can produce unrelated fallback media or fail outright.
- The native audio preview uses synchronous preparation on the main thread, can resolve remote sources there, and supports one active background track. Audio fades and overlapping tracks need implementation and timing tests.
- Without the native media module, `MediaEngine.exportProject` returns simulated success and an input/mock URI. This is reachable outside Jest, including the current iOS app, and must not be presented as a completed export.
- Ads and premium state are placeholders; there is no ad or purchase SDK integration. Android release signing still uses the debug key. These are not validated production features.

## Scope and ownership

All pre-existing staged work was preserved. Audit repairs remain unstaged and uncommitted. The earlier Kotlin `BitmapFactory` import fix remains present. No dependency versions were changed, no user media was deleted, and nothing was published.
