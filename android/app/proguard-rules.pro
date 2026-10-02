# Clipvero Production ProGuard & R8 Optimization Rules

# ==============================================================================
# React Native & Native Bridge Rules
# ==============================================================================
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Keep React Native NativeModules and methods
-keepclassmembers class * extends com.facebook.react.bridge.NativeModule {
    @com.facebook.react.bridge.ReactMethod *;
    @com.facebook.react.bridge.ReactMethodSync *;
}
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }
-keep class * implements com.facebook.react.ReactPackage { *; }

# Keep Clipvero Native Engine Module & Package
-keep class com.clipvero.** { *; }
-keepclassmembers class com.clipvero.** { *; }

# ==============================================================================
# AndroidX Media3 (Transformer, Effect, Common)
# ==============================================================================
# Preserve Media3 Transformer and codecs for audio/video export
-keep class androidx.media3.transformer.** { *; }
-keep class androidx.media3.effect.** { *; }
-keep class androidx.media3.common.** { *; }
-keep class androidx.media3.datasource.** { *; }
-keep class androidx.media3.extractor.** { *; }

# Keep OpenGL Shader programs and GL effects used by Media3
-keep class androidx.media3.effect.GlEffect { *; }
-keep class androidx.media3.effect.GlMatrixProvider { *; }
-keep class androidx.media3.effect.SingleColorLut { *; }
-keep class androidx.media3.effect.Crop { *; }
-keep class androidx.media3.effect.ScaleAndRotateTransformation { *; }

# Keep MediaCodec and AudioProcessor classes
-keep class android.media.MediaCodec** { *; }
-keep class android.media.MediaFormat** { *; }
-keep class android.media.MediaMetadataRetriever** { *; }

# ==============================================================================
# Kotlin Coroutines & Standard Library
# ==============================================================================
-keep class kotlinx.coroutines.** { *; }
-keepclassmembers class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**
-dontwarn kotlin.Unit
