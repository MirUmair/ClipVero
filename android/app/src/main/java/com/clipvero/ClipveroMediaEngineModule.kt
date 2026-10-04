package com.clipvero

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.ClipData
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.media.PlaybackParams
import android.os.Build
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
import android.util.Log
import android.util.AtomicFile
import androidx.core.content.FileProvider
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.effect.Presentation
import androidx.media3.effect.ScaleAndRotateTransformation
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.EditedMediaItemSequence
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ProgressHolder
import androidx.media3.transformer.TransformationRequest
import androidx.media3.transformer.Transformer
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.*
import java.util.concurrent.Executors

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
class ClipveroMediaEngineModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val executor = Executors.newFixedThreadPool(4)
    private val mainHandler = Handler(Looper.getMainLooper())
    private var activeTransformer: Transformer? = null
    @Volatile private var activeExportPromise: Promise? = null
    private var activeOutputFile: File? = null
    private var isCancelled = false
    private var progressRunnable: Runnable? = null

    private var clipAudioPlayer: MediaPlayer? = null
    private var trackAudioPlayer: MediaPlayer? = null
    private var currentPlayingClipUri: String? = null
    private var currentPlayingTrackUri: String? = null

    private var voiceoverRecorder: MediaRecorder? = null
    private var voiceoverOutputFile: File? = null
    private var voiceoverStartTimeMs: Long = 0L

    private var pendingPickerPromise: Promise? = null
    private val PICK_MEDIA_REQUEST_CODE = 41234
    private var pendingAudioPickerPromise: Promise? = null
    private val PICK_AUDIO_REQUEST_CODE = 41235

    private val activityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode == PICK_MEDIA_REQUEST_CODE) {
                val promise = pendingPickerPromise
                pendingPickerPromise = null
                if (promise == null) return

                if (resultCode != Activity.RESULT_OK || data == null) {
                    promise.resolve(Arguments.createArray())
                    return
                }

                executor.execute {
                    try {
                        val results = Arguments.createArray()
                        val clipData = data.clipData
                        val singleUri = data.data

                        val uris = ArrayList<Uri>()
                        if (clipData != null) {
                            for (i in 0 until clipData.itemCount) {
                                uris.add(clipData.getItemAt(i).uri)
                            }
                        } else if (singleUri != null) {
                            uris.add(singleUri)
                        }

                        val cacheDir = File(reactContext.cacheDir, "clipvero_thumbs")
                        if (!cacheDir.exists()) cacheDir.mkdirs()

                        for (uri in uris) {
                            try {
                                val takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION
                                reactContext.contentResolver.takePersistableUriPermission(uri, takeFlags)
                            } catch (_: Exception) {}

                            val retriever = MediaMetadataRetriever()
                            var durationSec = 10.0
                            var width = 1080
                            var height = 1920
                            var thumbUriStr: String? = null
                            var name = "Clip_${System.currentTimeMillis()}"
                            val isImage = reactContext.contentResolver.getType(uri)?.startsWith("image/") == true

                            try {
                                try {
                                    val cursor = reactContext.contentResolver.query(uri, null, null, null, null)
                                    cursor?.use {
                                        if (it.moveToFirst()) {
                                            val nameIndex = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                                            if (nameIndex >= 0) {
                                                val dispName = it.getString(nameIndex)
                                                if (!dispName.isNullOrEmpty()) name = dispName
                                            }
                                        }
                                    }
                                } catch (_: Exception) {}

                                if (isImage) {
                                    val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                                    reactContext.contentResolver.openInputStream(uri)?.use {
                                        BitmapFactory.decodeStream(it, null, options)
                                    }
                                    require(options.outWidth > 0 && options.outHeight > 0) { "Cannot decode image." }
                                    width = options.outWidth
                                    height = options.outHeight
                                    durationSec = 5.0
                                } else {
                                if (uri.scheme == "content") {
                                    retriever.setDataSource(reactContext, uri)
                                } else {
                                    retriever.setDataSource(uri.path)
                                }

                                val durStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                                val wStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)
                                val hStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)

                                if (durStr != null) {
                                    val ms = durStr.toLongOrNull() ?: 10000L
                                    durationSec = ms / 1000.0
                                }
                                if (wStr != null) width = wStr.toIntOrNull() ?: 1080
                                if (hStr != null) height = hStr.toIntOrNull() ?: 1920

                                val bitmap = retriever.getFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                                    ?: retriever.frameAtTime
                                if (bitmap != null) {
                                    val scaled = Bitmap.createScaledBitmap(bitmap, 240, 240, true)
                                    val thumbFile = File(cacheDir, "picked_${System.currentTimeMillis()}_${(Math.random() * 1000).toInt()}.jpg")
                                    FileOutputStream(thumbFile).use { out ->
                                        scaled.compress(Bitmap.CompressFormat.JPEG, 75, out)
                                    }
                                    thumbUriStr = "file://${thumbFile.absolutePath}"
                                    if (scaled != bitmap) scaled.recycle()
                                    bitmap.recycle()
                                }
                                }
                            } catch (e: Exception) {
                                throw IllegalArgumentException("Could not read selected media.", e)
                            } finally {
                                try { retriever.release() } catch (_: Exception) {}
                            }

                            val itemMap = Arguments.createMap()
                            itemMap.putString("uri", uri.toString())
                            itemMap.putString("name", name)
                            itemMap.putString("type", if (isImage) "image" else "video")
                            itemMap.putDouble("duration", durationSec)
                            itemMap.putDouble("originalDuration", durationSec)
                            itemMap.putInt("width", width)
                            itemMap.putInt("height", height)
                            itemMap.putString("thumbnailUri", thumbUriStr ?: uri.toString())
                            results.pushMap(itemMap)
                        }

                        promise.resolve(results)
                    } catch (e: Exception) {
                        promise.reject("PICK_ERROR", "Failed to process picked media: ${e.message}", e)
                    }
                }
            } else if (requestCode == PICK_AUDIO_REQUEST_CODE) {
                val promise = pendingAudioPickerPromise
                pendingAudioPickerPromise = null
                if (promise == null) return

                if (resultCode != Activity.RESULT_OK || data == null || data.data == null) {
                    promise.resolve(null)
                    return
                }

                val uri = data.data!!
                try {
                    val takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION
                    reactContext.contentResolver.takePersistableUriPermission(uri, takeFlags)
                } catch (_: Exception) {}

                executor.execute {
                    val retriever = MediaMetadataRetriever()
                    var durationSec = 15.0
                    var name = "Custom Audio"
                    try {
                        retriever.setDataSource(reactContext, uri)
                        val durStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                        if (durStr != null) {
                            durationSec = (durStr.toLongOrNull() ?: 15000L) / 1000.0
                        }
                        val titleStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE)
                        if (!titleStr.isNullOrEmpty()) {
                            name = titleStr
                        } else {
                            val path = uri.path
                            if (path != null) {
                                name = File(path).name
                            }
                        }
                    } catch (_: Exception) {
                    } finally {
                        try { retriever.release() } catch (_: Exception) {}
                    }

                    val map = Arguments.createMap()
                    map.putString("uri", uri.toString())
                    map.putString("name", name)
                    map.putDouble("duration", durationSec)
                    promise.resolve(map)
                }
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String = "ClipveroMediaEngine"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (_: Exception) {
        }
    }

    private fun parseUri(uriStr: String): Uri {
        return if (uriStr.startsWith("content://") || uriStr.startsWith("file://") || uriStr.startsWith("http://") || uriStr.startsWith("https://")) {
            Uri.parse(uriStr)
        } else {
            Uri.fromFile(File(uriStr))
        }
    }

    private fun extractAssetSampleIfMissing(sampleName: String = "sample1.mp4"): File {
        val samplesDir = File(reactContext.filesDir, "sample_videos")
        if (!samplesDir.exists()) samplesDir.mkdirs()
        val destFile = File(samplesDir, sampleName)
        if (!destFile.exists() || destFile.length() == 0L) {
            try {
                reactContext.assets.open("sample_videos/$sampleName").use { input ->
                    FileOutputStream(destFile).use { output ->
                        input.copyTo(output)
                    }
                }
            } catch (e: Exception) {
                Log.w("ClipveroMediaEngine", "Could not extract sample $sampleName: ${e.message}")
            }
        }
        return destFile
    }

    private fun ensureLocalUri(uriStr: String): Uri {
        // 1. Android Asset scheme (asset:/...)
        if (uriStr.startsWith("asset:/")) {
            val assetPath = uriStr.removePrefix("asset:/").removePrefix("/")
            val safeName = File(assetPath).name
            val assetDir = File(reactContext.filesDir, "asset_cache")
            if (!assetDir.exists()) assetDir.mkdirs()
            val targetFile = File(assetDir, "${Math.abs(assetPath.hashCode())}_$safeName")
            if (!targetFile.exists() || targetFile.length() == 0L) {
                try {
                    reactContext.assets.open(assetPath).use { input ->
                        FileOutputStream(targetFile).use { output ->
                            input.copyTo(output)
                        }
                    }
                } catch (e: Exception) {
                    Log.w("ClipveroMediaEngine", "Could not extract asset $assetPath: ${e.message}")
                }
            }
            if (targetFile.exists() && targetFile.length() > 0) {
                return Uri.fromFile(targetFile)
            }
            throw IllegalArgumentException("Bundled media is unavailable.")
        }

        // 2. Android Content scheme (content://...)
        if (uriStr.startsWith("content://")) {
            try {
                val contentUri = Uri.parse(uriStr)
                val hash = Math.abs(uriStr.hashCode()).toString()
                val contentCacheDir = File(reactContext.cacheDir, "clipvero_content_cache")
                if (!contentCacheDir.exists()) contentCacheDir.mkdirs()

                val mime = try { reactContext.contentResolver.getType(contentUri) } catch (_: Exception) { null }
                val ext = when {
                    mime?.startsWith("image/png") == true -> ".png"
                    mime?.startsWith("image/") == true -> ".jpg"
                    mime?.startsWith("video/3gpp") == true -> ".3gp"
                    mime?.startsWith("video/webm") == true -> ".webm"
                    else -> ".mp4"
                }
                val cachedFile = File(contentCacheDir, "content_${hash}$ext")
                if (!cachedFile.exists() || cachedFile.length() == 0L) {
                    reactContext.contentResolver.openInputStream(contentUri)?.use { input ->
                        FileOutputStream(cachedFile).use { output ->
                            input.copyTo(output)
                        }
                    }
                }
                if (cachedFile.exists() && cachedFile.length() > 0) {
                    return Uri.fromFile(cachedFile)
                }
            } catch (e: Exception) {
                Log.w("ClipveroMediaEngine", "Could not cache content URI: ${e.message}")
            }
            throw IllegalArgumentException("Selected media is unavailable. Please import it again.")
        }

        // 3. Remote HTTP / HTTPS URLs
        if (uriStr.startsWith("http://") || uriStr.startsWith("https://")) {
            try {
                val hash = Math.abs(uriStr.hashCode()).toString()
                val cacheDir = File(reactContext.cacheDir, "clipvero_downloaded")
                if (!cacheDir.exists()) cacheDir.mkdirs()
                val cacheFile = File(cacheDir, "cached_$hash.mp4")
                if (!cacheFile.exists() || cacheFile.length() == 0L) {
                    val url = URL(uriStr)
                    val conn = url.openConnection() as HttpURLConnection
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) Clipvero/1.0")
                    conn.connectTimeout = 8000
                    conn.readTimeout = 8000
                    conn.inputStream.use { input ->
                        FileOutputStream(cacheFile).use { output ->
                            input.copyTo(output)
                        }
                    }
                }
                if (cacheFile.exists() && cacheFile.length() > 0) {
                    return Uri.fromFile(cacheFile)
                }
            } catch (_: Exception) {
            }
            throw IllegalArgumentException("Could not download media. Check your connection and try again.")
        }

        // 4. File URIs (file://...)
        if (uriStr.startsWith("file://")) {
            val path = uriStr.removePrefix("file://")
            val file = File(path)
            if (file.exists() && file.length() > 0) {
                return Uri.fromFile(file)
            }
            if (file.name.startsWith("sample")) {
                val sampleFile = extractAssetSampleIfMissing(file.name)
                if (sampleFile.exists()) return Uri.fromFile(sampleFile)
            }
            throw IllegalArgumentException("Media file is unavailable. Please import it again.")
        }

        // 5. Bare local path
        val file = File(uriStr)
        if (file.exists() && file.length() > 0) {
            return Uri.fromFile(file)
        }

        throw IllegalArgumentException("Media file is unavailable. Please import it again.")
    }

    private fun setRetrieverDataSource(retriever: MediaMetadataRetriever, uriStr: String) {
        if (uriStr.startsWith("asset:/")) {
            val assetPath = uriStr.removePrefix("asset:/")
            try {
                val afd = reactContext.assets.openFd(assetPath)
                retriever.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                return
            } catch (_: Exception) {}
        }
        val resolvedUri = ensureLocalUri(uriStr)
        if (resolvedUri.scheme == "content") {
            reactContext.contentResolver.openFileDescriptor(resolvedUri, "r")?.use { pfd ->
                retriever.setDataSource(pfd.fileDescriptor)
            } ?: run {
                retriever.setDataSource(reactContext, resolvedUri)
            }
        } else if (resolvedUri.scheme == "file" || resolvedUri.scheme == null) {
            retriever.setDataSource(resolvedUri.path ?: uriStr)
        } else {
            retriever.setDataSource(uriStr, HashMap<String, String>())
        }
    }

    @ReactMethod
    fun getStarterSamples(promise: Promise) {
        executor.execute {
            try {
                val samplesDir = File(reactContext.filesDir, "sample_videos")
                if (!samplesDir.exists()) samplesDir.mkdirs()

                val assetManager = reactContext.assets
                val sampleNames = listOf("sample1.mp4", "sample2.mp4", "sample3.mp4")
                val sampleTitles = listOf("Sunset Reel.mp4", "Urban Street.mp4", "Action Shorts.mp4")
                val results = Arguments.createArray()

                for (idx in sampleNames.indices) {
                    val assetName = sampleNames[idx]
                    val destFile = File(samplesDir, assetName)

                    if (!destFile.exists() || destFile.length() == 0L) {
                        try {
                            assetManager.open("sample_videos/$assetName").use { input ->
                                FileOutputStream(destFile).use { output ->
                                    input.copyTo(output)
                                }
                            }
                        } catch (_: Exception) {
                        }
                    }

                    if (destFile.exists() && destFile.length() > 0) {
                        val retriever = MediaMetadataRetriever()
                        var durationSec = 10.0
                        var width = 1080
                        var height = 1920
                        var thumbUriStr: String? = null

                        try {
                            retriever.setDataSource(destFile.absolutePath)
                            val durStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                            if (durStr != null) {
                                val durMs = durStr.toLongOrNull() ?: 10000L
                                durationSec = durMs / 1000.0
                            }
                            val wStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)
                            val hStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)
                            if (wStr != null) width = wStr.toIntOrNull() ?: 1080
                            if (hStr != null) height = hStr.toIntOrNull() ?: 1920

                            val frame = retriever.getFrameAtTime(500000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                            if (frame != null) {
                                val thumbDir = File(reactContext.cacheDir, "sample_thumbs")
                                if (!thumbDir.exists()) thumbDir.mkdirs()
                                val thumbFile = File(thumbDir, "sample_thumb_${idx}.jpg")
                                FileOutputStream(thumbFile).use { out ->
                                    frame.compress(Bitmap.CompressFormat.JPEG, 85, out)
                                }
                                thumbUriStr = "file://${thumbFile.absolutePath}"
                            }
                        } catch (_: Exception) {
                        } finally {
                            try { retriever.release() } catch (_: Exception) {}
                        }

                        val map = Arguments.createMap()
                        map.putString("name", sampleTitles[idx])
                        map.putString("uri", "file://${destFile.absolutePath}")
                        map.putString("type", "video")
                        map.putDouble("duration", durationSec)
                        map.putDouble("originalDuration", durationSec)
                        map.putDouble("trimStart", 0.0)
                        map.putDouble("trimEnd", durationSec)
                        map.putDouble("speed", 1.0)
                        map.putDouble("volume", 1.0)
                        map.putBoolean("isMuted", false)
                        map.putInt("rotation", 0)
                        map.putBoolean("flipHorizontal", false)
                        map.putBoolean("flipVertical", false)
                        map.putString("filterId", "none")
                        map.putInt("width", width)
                        map.putInt("height", height)
                        if (thumbUriStr != null) {
                            map.putString("thumbnailUri", thumbUriStr)
                        }
                        results.pushMap(map)
                    }
                }

                promise.resolve(results)
            } catch (e: Exception) {
                promise.reject("SAMPLES_ERROR", "Failed to load starter samples: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun pickMedia(promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Current activity is null")
            return
        }

        pendingPickerPromise = promise

        try {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "*/*"
                putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("video/*", "image/*"))
                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
            }
            activity.startActivityForResult(intent, PICK_MEDIA_REQUEST_CODE)
        } catch (_: Exception) {
            try {
                val fallbackIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("video/*", "image/*"))
                    putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                }
                activity.startActivityForResult(fallbackIntent, PICK_MEDIA_REQUEST_CODE)
            } catch (e2: Exception) {
                pendingPickerPromise = null
                promise.reject("LAUNCH_PICKER_ERROR", "Failed to launch media picker: ${e2.message}", e2)
            }
        }
    }

    @ReactMethod
    fun getVideoMetadata(uriStr: String, promise: Promise) {
        executor.execute {
            val retriever = MediaMetadataRetriever()
            try {
                setRetrieverDataSource(retriever, uriStr)

                val durationStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                val widthStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)
                val heightStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)
                val rotationStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)
                val bitrateStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE)

                val durationMs = durationStr?.toLongOrNull() ?: 0L
                val width = widthStr?.toIntOrNull() ?: 1080
                val height = heightStr?.toIntOrNull() ?: 1920
                val rotation = rotationStr?.toIntOrNull() ?: 0
                val bitrate = bitrateStr?.toIntOrNull() ?: 0

                val map = Arguments.createMap()
                map.putDouble("duration", durationMs / 1000.0)
                map.putInt("width", width)
                map.putInt("height", height)
                map.putInt("rotation", rotation)
                map.putInt("bitrate", bitrate)

                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject("METADATA_ERROR", "Could not extract metadata: ${e.message}", e)
            } finally {
                try {
                    retriever.release()
                } catch (_: Exception) {}
            }
        }
    }

    @ReactMethod
    fun generateThumbnail(uriStr: String, timeSec: Double, width: Int, height: Int, promise: Promise) {
        executor.execute {
            val retriever = MediaMetadataRetriever()
            try {
                setRetrieverDataSource(retriever, uriStr)

                val timeUs = (timeSec * 1000000).toLong()
                val bitmap = retriever.getFrameAtTime(timeUs, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                    ?: retriever.frameAtTime

                if (bitmap != null) {
                    val scaled = if (width > 0 && height > 0) {
                        Bitmap.createScaledBitmap(bitmap, width, height, true)
                    } else {
                        bitmap
                    }

                    val cacheDir = File(reactContext.cacheDir, "clipvero_thumbs")
                    if (!cacheDir.exists()) cacheDir.mkdirs()

                    val thumbFile = File(cacheDir, "thumb_${System.currentTimeMillis()}_${(timeSec * 10).toInt()}.jpg")
                    FileOutputStream(thumbFile).use { out ->
                        scaled.compress(Bitmap.CompressFormat.JPEG, 80, out)
                    }

                    if (scaled != bitmap) scaled.recycle()
                    bitmap.recycle()

                    promise.resolve("file://${thumbFile.absolutePath}")
                } else {
                    promise.reject("THUMBNAIL_ERROR", "Could not extract frame at $timeSec")
                }
            } catch (e: Exception) {
                promise.reject("THUMBNAIL_ERROR", "Error extracting thumbnail: ${e.message}", e)
            } finally {
                try {
                    retriever.release()
                } catch (_: Exception) {}
            }
        }
    }

    @ReactMethod
    fun generateTimelineThumbnails(uriStr: String, count: Int, promise: Promise) {
        executor.execute {
            val retriever = MediaMetadataRetriever()
            try {
                val thumbs = Arguments.createArray()
                val lower = uriStr.lowercase()
                val isImage = lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp") || lower.endsWith(".bmp")

                if (isImage) {
                    val resolvedUri = ensureLocalUri(uriStr)
                    var imageBitmap: Bitmap? = null
                    if (resolvedUri.scheme == "content") {
                        reactContext.contentResolver.openInputStream(resolvedUri)?.use { input ->
                            imageBitmap = BitmapFactory.decodeStream(input)
                        }
                    } else if (resolvedUri.scheme == "file" || resolvedUri.scheme == null) {
                        imageBitmap = BitmapFactory.decodeFile(resolvedUri.path ?: uriStr)
                    }

                    if (imageBitmap != null) {
                        val cacheDir = File(reactContext.cacheDir, "clipvero_thumbs")
                        if (!cacheDir.exists()) cacheDir.mkdirs()
                        val thumbFile = File(cacheDir, "tl_${System.currentTimeMillis()}_0.jpg")
                        val scaled = Bitmap.createScaledBitmap(imageBitmap!!, 120, 120, true)
                        FileOutputStream(thumbFile).use { out ->
                            scaled.compress(Bitmap.CompressFormat.JPEG, 70, out)
                        }
                        if (scaled != imageBitmap) scaled.recycle()
                        imageBitmap?.recycle()
                        val thumbUri = "file://${thumbFile.absolutePath}"
                        for (i in 0 until count) {
                            thumbs.pushString(thumbUri)
                        }
                        promise.resolve(thumbs)
                        return@execute
                    }
                }

                setRetrieverDataSource(retriever, uriStr)

                val durStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                val durationMs = durStr?.toLongOrNull() ?: 10000L
                val durationUs = durationMs * 1000L

                val intervalUs = if (count > 1) durationUs / (count - 1) else 0L

                val cacheDir = File(reactContext.cacheDir, "clipvero_thumbs")
                if (!cacheDir.exists()) cacheDir.mkdirs()

                val targetW = if (count > 10) 480 else 120
                val targetH = if (count > 10) 640 else 120

                for (i in 0 until count) {
                    val targetUs = i * intervalUs
                    val bitmap = retriever.getFrameAtTime(targetUs, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                        ?: retriever.getFrameAtTime(targetUs, MediaMetadataRetriever.OPTION_CLOSEST)
                        ?: retriever.frameAtTime

                    if (bitmap != null) {
                        val scaled = Bitmap.createScaledBitmap(bitmap, targetW, targetH, true)
                        val thumbFile = File(cacheDir, "tl_${System.currentTimeMillis()}_${i}.jpg")
                        FileOutputStream(thumbFile).use { out ->
                            scaled.compress(Bitmap.CompressFormat.JPEG, if (count > 10) 80 else 70, out)
                        }
                        if (scaled != bitmap) scaled.recycle()
                        bitmap.recycle()
                        thumbs.pushString("file://${thumbFile.absolutePath}")
                    }
                }

                promise.resolve(thumbs)
            } catch (e: Exception) {
                // Ensure fallback is always an image file, never a raw MP4 video path
                try {
                    val fallbackDir = File(reactContext.cacheDir, "clipvero_fallback")
                    if (!fallbackDir.exists()) fallbackDir.mkdirs()
                    val fallbackFile = File(fallbackDir, "fallback_thumb.jpg")
                    if (!fallbackFile.exists() || fallbackFile.length() == 0L) {
                        val blankBmp = Bitmap.createBitmap(360, 640, Bitmap.Config.ARGB_8888)
                        val canvas = android.graphics.Canvas(blankBmp)
                        canvas.drawColor(android.graphics.Color.parseColor("#1A1A1A"))
                        FileOutputStream(fallbackFile).use { out ->
                            blankBmp.compress(Bitmap.CompressFormat.JPEG, 80, out)
                        }
                        blankBmp.recycle()
                    }
                    val fallbackThumbs = Arguments.createArray()
                    for (i in 0 until count) {
                        fallbackThumbs.pushString("file://${fallbackFile.absolutePath}")
                    }
                    promise.resolve(fallbackThumbs)
                } catch (_: Exception) {
                    promise.resolve(Arguments.createArray())
                }
            } finally {
                try {
                    retriever.release()
                } catch (_: Exception) {}
            }
        }
    }

    @ReactMethod
    fun extractAudio(videoUriStr: String, outputName: String, promise: Promise) {
        executor.execute {
            var extractor: MediaExtractor? = null
            var muxer: MediaMuxer? = null
            try {
                val videoUri = parseUri(videoUriStr)
                extractor = MediaExtractor()

                if (videoUriStr.startsWith("http://") || videoUriStr.startsWith("https://")) {
                    extractor.setDataSource(videoUriStr)
                } else if (videoUriStr.startsWith("content://")) {
                    reactContext.contentResolver.openFileDescriptor(videoUri, "r")?.use { pfd ->
                        extractor.setDataSource(pfd.fileDescriptor)
                    } ?: run {
                        extractor.setDataSource(reactContext, videoUri, null)
                    }
                } else {
                    extractor.setDataSource(videoUri.path ?: videoUriStr)
                }

                var audioTrackIndex = -1
                var audioFormat: MediaFormat? = null

                for (i in 0 until extractor.trackCount) {
                    val format = extractor.getTrackFormat(i)
                    val mime = format.getString(MediaFormat.KEY_MIME) ?: ""
                    if (mime.startsWith("audio/")) {
                        audioTrackIndex = i
                        audioFormat = format
                        break
                    }
                }

                if (audioTrackIndex == -1 || audioFormat == null) {
                    promise.reject("NO_AUDIO_TRACK", "No audio track found in the source video.")
                    return@execute
                }

                extractor.selectTrack(audioTrackIndex)

                val audioDir = File(reactContext.filesDir, "extracted_audio")
                if (!audioDir.exists()) audioDir.mkdirs()

                val outputFile = File(audioDir, "${outputName}_${System.currentTimeMillis()}.m4a")
                muxer = MediaMuxer(outputFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
                val muxerAudioTrack = muxer.addTrack(audioFormat)
                muxer.start()

                val maxBufferSize = if (audioFormat.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
                    audioFormat.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE)
                } else {
                    128 * 1024
                }

                val buffer = ByteBuffer.allocate(maxBufferSize)
                val bufferInfo = MediaCodec.BufferInfo()

                while (true) {
                    bufferInfo.offset = 0
                    bufferInfo.size = extractor.readSampleData(buffer, 0)
                    if (bufferInfo.size < 0) {
                        bufferInfo.size = 0
                        break
                    }
                    bufferInfo.presentationTimeUs = extractor.sampleTime
                    val sampleFlags = extractor.sampleFlags
                    require(sampleFlags and MediaExtractor.SAMPLE_FLAG_ENCRYPTED == 0) { "Encrypted audio is unsupported." }
                    bufferInfo.flags = 0
                    if (sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC != 0) {
                        bufferInfo.flags = bufferInfo.flags or MediaCodec.BUFFER_FLAG_KEY_FRAME
                    }
                    if (sampleFlags and MediaExtractor.SAMPLE_FLAG_PARTIAL_FRAME != 0) {
                        bufferInfo.flags = bufferInfo.flags or MediaCodec.BUFFER_FLAG_PARTIAL_FRAME
                    }

                    muxer.writeSampleData(muxerAudioTrack, buffer, bufferInfo)
                    extractor.advance()
                }

                muxer.stop()
                promise.resolve("file://${outputFile.absolutePath}")

            } catch (e: Exception) {
                promise.reject("AUDIO_EXTRACT_ERROR", "Audio extraction failed: ${e.message}", e)
            } finally {
                try { extractor?.release() } catch (_: Exception) {}
                try { muxer?.release() } catch (_: Exception) {}
            }
        }
    }

    @ReactMethod
    @Synchronized
    fun exportProject(configJson: String, promise: Promise) {
        if (activeExportPromise != null) {
            promise.reject("EXPORT_BUSY", "An export is already running.")
            return
        }
        activeExportPromise = promise
        executor.execute {
            try {
                isCancelled = false
                val projectObj = JSONObject(configJson)
                val projectName = projectObj.optString("name", "Clipvero_Export")
                val clipsArray = projectObj.getJSONArray("clips")
                val exportSettings = projectObj.optJSONObject("exportSettings")

                if (clipsArray.length() == 0) {
                    if (activeExportPromise === promise) activeExportPromise = null
                    promise.reject("NO_CLIPS", "Cannot export project with 0 clips.")
                    return@execute
                }

                val exportDir = File(reactContext.filesDir, "exports")
                if (!exportDir.exists()) exportDir.mkdirs()

                val resolution = exportSettings?.optString("resolution", "1080p") ?: "1080p"
                val ratio = projectObj.optString("aspectRatio", "9:16")
                val (outWidth, outHeight) = when (ratio) {
                    "16:9" -> when (resolution) {
                        "720p" -> Pair(1280, 720)
                        "480p" -> Pair(854, 480)
                        else -> Pair(1920, 1080)
                    }
                    "1:1" -> when (resolution) {
                        "720p" -> Pair(720, 720)
                        "480p" -> Pair(480, 480)
                        else -> Pair(1080, 1080)
                    }
                    "4:5" -> when (resolution) {
                        "720p" -> Pair(720, 900)
                        "480p" -> Pair(480, 600)
                        else -> Pair(1080, 1350)
                    }
                    else -> when (resolution) {
                        "720p" -> Pair(720, 1280)
                        "480p" -> Pair(480, 854)
                        else -> Pair(1080, 1920)
                    }
                }

                val safeName = projectName.replace(Regex("[^A-Za-z0-9_-]"), "_").take(80).ifEmpty { "Clipvero" }
                val outputFile = File(exportDir, "${safeName}_${System.currentTimeMillis()}.mp4")

                val editedMediaItems = ArrayList<EditedMediaItem>()

                for (i in 0 until clipsArray.length()) {
                    val clipObj = clipsArray.getJSONObject(i)
                    val uriStr = clipObj.getString("uri")
                    val uri = ensureLocalUri(uriStr)

                    val trimStartSec = clipObj.optDouble("trimStart", 0.0)
                    val trimEndSec = clipObj.optDouble("trimEnd", -1.0)
                    val rotationDeg = clipObj.optInt("rotation", 0)
                    val transitionObj = clipObj.optJSONObject("transition")
                    val transitionType = transitionObj?.optString("type", "none") ?: "none"

                    val pathLower = (uri.path ?: uriStr).lowercase()
                    val isImage = pathLower.endsWith(".jpg") ||
                        pathLower.endsWith(".jpeg") ||
                        pathLower.endsWith(".png") ||
                        pathLower.endsWith(".webp") ||
                        pathLower.endsWith(".bmp") ||
                        clipObj.optString("type") == "image"

                    val mediaItemBuilder = MediaItem.Builder().setUri(uri)

                    if (!isImage) {
                        val clippingConfig = MediaItem.ClippingConfiguration.Builder()
                            .setStartPositionMs((trimStartSec * 1000).toLong())

                        if (trimEndSec > 0 && trimEndSec > trimStartSec) {
                            clippingConfig.setEndPositionMs((trimEndSec * 1000).toLong())
                        }
                        mediaItemBuilder.setClippingConfiguration(clippingConfig.build())
                    } else {
                        val durationSec = if (trimEndSec > trimStartSec) (trimEndSec - trimStartSec) else clipObj.optDouble("duration", 3.0)
                        mediaItemBuilder.setImageDurationMs((durationSec * 1000).toLong())
                    }

                    val effectsList = ArrayList<androidx.media3.common.Effect>()

                    // Apply Rotation
                    if (rotationDeg != 0) {
                        effectsList.add(ScaleAndRotateTransformation.Builder().setRotationDegrees(rotationDeg.toFloat()).build())
                    }

                    // Apply Zoom or Dynamic Transition
                    if (transitionType == "zoom") {
                        effectsList.add(ScaleAndRotateTransformation.Builder().setScale(1.12f, 1.12f).build())
                    }

                    effectsList.add(Presentation.createForWidthAndHeight(outWidth, outHeight, Presentation.LAYOUT_SCALE_TO_FIT))

                    val effects = Effects(emptyList(), effectsList)

                    val removeAudio = isImage || clipObj.optBoolean("isMuted", false) || clipObj.optDouble("volume", 1.0) == 0.0

                    val editedItemBuilder = EditedMediaItem.Builder(mediaItemBuilder.build())
                        .setEffects(effects)
                        .setRemoveAudio(removeAudio)

                    if (isImage) {
                        editedItemBuilder.setFrameRate(30)
                    }

                    editedMediaItems.add(editedItemBuilder.build())
                }

                val hasAnyClipAudio = editedMediaItems.any { !it.removeAudio }
                val videoSequence = EditedMediaItemSequence(editedMediaItems)
                val sequences = ArrayList<EditedMediaItemSequence>()
                sequences.add(videoSequence)

                val audioTracksArray = projectObj.optJSONArray("audioTracks")
                var hasExtraAudio = false
                if (audioTracksArray != null && audioTracksArray.length() > 0) {
                    for (j in 0 until audioTracksArray.length()) {
                        val trackObj = audioTracksArray.getJSONObject(j)
                        val isMuted = trackObj.optBoolean("isMuted", false)
                        val vol = trackObj.optDouble("volume", 1.0)
                        if (isMuted || vol == 0.0) continue
                        val uriStr = trackObj.optString("uri", "")
                        if (uriStr.isEmpty()) continue
                        try {
                            val audioUri = ensureLocalUri(uriStr)
                            val audioItemBuilder = MediaItem.Builder().setUri(audioUri)
                            val trimStart = trackObj.optDouble("trimStart", 0.0)
                            val trimEnd = trackObj.optDouble("trimEnd", -1.0)
                            if (trimStart > 0 || trimEnd > 0) {
                                val clippingConfig = MediaItem.ClippingConfiguration.Builder()
                                    .setStartPositionMs((trimStart * 1000).toLong())
                                if (trimEnd > trimStart) {
                                    clippingConfig.setEndPositionMs((trimEnd * 1000).toLong())
                                }
                                audioItemBuilder.setClippingConfiguration(clippingConfig.build())
                            }
                            val editedAudio = EditedMediaItem.Builder(audioItemBuilder.build())
                                .setRemoveVideo(true)
                                .build()
                            sequences.add(EditedMediaItemSequence(listOf(editedAudio)))
                            hasExtraAudio = true
                        } catch (e: Exception) {
                            throw IllegalArgumentException("Could not include audio track.", e)
                        }
                    }
                }

                val totalHasAudio = hasAnyClipAudio || hasExtraAudio
                val composition = Composition.Builder(sequences)
                    // Media3 aborts if audio first appears after a silent/muted clip
                    // or image. Generate silence for those gaps when audio is enabled.
                    .experimentalSetForceAudioTrack(totalHasAudio)
                    .build()

                mainHandler.post {
                    if (activeExportPromise !== promise) return@post
                    activeOutputFile = outputFile
                    try {
                        val requestBuilder = TransformationRequest.Builder()
                            .setVideoMimeType(MimeTypes.VIDEO_H264)

                        if (totalHasAudio) {
                            requestBuilder.setAudioMimeType(MimeTypes.AUDIO_AAC)
                        }

                        val transformationRequest = requestBuilder.build()

                        val transformer = Transformer.Builder(reactContext)
                            .setTransformationRequest(transformationRequest)
                            .addListener(object : Transformer.Listener {
                                override fun onCompleted(composition: Composition, exportResult: androidx.media3.transformer.ExportResult) {
                                    if (activeExportPromise !== promise) return
                                    stopProgressPolling()
                                    activeTransformer = null
                                    activeExportPromise = null
                                    activeOutputFile = null
                                    val result = Arguments.createMap()
                                    result.putString("outputPath", "file://${outputFile.absolutePath}")
                                    result.putDouble("fileSize", outputFile.length().toDouble())
                                    result.putString("resolution", "${outWidth}x${outHeight}")
                                    promise.resolve(result)
                                }

                                override fun onError(
                                    composition: Composition,
                                    exportResult: androidx.media3.transformer.ExportResult,
                                    exportException: androidx.media3.transformer.ExportException
                                ) {
                                    if (activeExportPromise !== promise) return
                                    stopProgressPolling()
                                    activeTransformer = null
                                    activeExportPromise = null
                                    activeOutputFile = null
                                    if (outputFile.exists()) outputFile.delete()
                                    val errorDetail = exportException.cause?.message ?: exportException.message
                                    val codeName = exportException.errorCodeName
                                    promise.reject("EXPORT_ERROR", "Media3 Export error ($codeName): $errorDetail", exportException)
                                }
                            })
                            .build()

                        activeTransformer = transformer
                        transformer.start(composition, outputFile.absolutePath)
                        startProgressPolling(transformer)

                    } catch (e: Exception) {
                        stopProgressPolling()
                        activeTransformer = null
                        activeExportPromise = null
                        activeOutputFile = null
                        if (outputFile.exists()) outputFile.delete()
                        promise.reject("EXPORT_INIT_ERROR", "Failed to start transformer: ${e.message}", e)
                    }
                }

            } catch (e: Exception) {
                mainHandler.post {
                    if (activeExportPromise === promise) {
                        activeExportPromise = null
                        promise.reject("EXPORT_PARSE_ERROR", "Export configuration failed: ${e.message}", e)
                    }
                }
            }
        }
    }

    private fun startProgressPolling(transformer: Transformer) {
        val progressHolder = ProgressHolder()
        progressRunnable = object : Runnable {
            override fun run() {
                if (isCancelled || activeTransformer == null) return
                val state = transformer.getProgress(progressHolder)
                if (state == Transformer.PROGRESS_STATE_AVAILABLE) {
                    val progressPercent = progressHolder.progress.coerceIn(0, 100)
                    val map = Arguments.createMap()
                    map.putInt("percentage", progressPercent)
                    sendEvent("onClipveroExportProgress", map)
                }
                mainHandler.postDelayed(this, 250)
            }
        }
        mainHandler.post(progressRunnable!!)
    }

    private fun stopProgressPolling() {
        progressRunnable?.let { mainHandler.removeCallbacks(it) }
        progressRunnable = null
    }

    @ReactMethod
    fun cancelExport(promise: Promise) {
        mainHandler.post {
            try {
                isCancelled = true
                stopProgressPolling()
                activeTransformer?.cancel()
                activeTransformer = null
                activeOutputFile?.let {
                    if (it.exists()) it.delete()
                }
                activeOutputFile = null
                activeExportPromise?.reject("EXPORT_CANCELLED", "Export cancelled.")
                activeExportPromise = null
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("CANCEL_ERROR", "Failed to cancel export: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun shareVideo(filePath: String, title: String, promise: Promise) {
        mainHandler.post {
            try {
                val activity = reactContext.currentActivity
                    ?: throw IllegalStateException("No active screen available for sharing.")
                val file = File(Uri.parse(filePath).path ?: filePath).canonicalFile
                val exportDir = File(reactContext.filesDir, "exports").canonicalFile
                require(file.parentFile == exportDir && file.isFile && file.length() > 0) {
                    "The exported video is missing or unavailable."
                }
                val uri = FileProvider.getUriForFile(reactContext, "${reactContext.packageName}.exports", file)
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "video/mp4"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    putExtra(Intent.EXTRA_TITLE, title)
                    clipData = ClipData.newRawUri("video", uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                activity.startActivity(Intent.createChooser(intent, title))
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("SHARE_ERROR", "Could not share video: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun saveFile(filename: String, content: String, promise: Promise) {
        executor.execute {
            try {
                val file = File(reactContext.filesDir, filename)
                require(file.canonicalFile.parentFile == reactContext.filesDir.canonicalFile)
                val atomicFile = AtomicFile(file)
                synchronized(this) {
                    val out = atomicFile.startWrite()
                    try {
                        out.write(content.toByteArray(Charsets.UTF_8))
                        atomicFile.finishWrite(out)
                    } catch (e: Exception) {
                        atomicFile.failWrite(out)
                        throw e
                    }
                }
                promise.resolve(file.absolutePath)
            } catch (e: Exception) {
                promise.reject("SAVE_FILE_ERROR", "Could not save file: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun readFile(filename: String, promise: Promise) {
        executor.execute {
            try {
                val file = File(reactContext.filesDir, filename)
                require(file.canonicalFile.parentFile == reactContext.filesDir.canonicalFile)
                val atomicFile = AtomicFile(file)
                if (!file.exists() && !File("${file.path}.bak").exists()) {
                    promise.resolve(null)
                    return@execute
                }
                val content = synchronized(this) { atomicFile.openRead().bufferedReader(Charsets.UTF_8).use { it.readText() } }
                promise.resolve(content)
            } catch (e: Exception) {
                promise.reject("READ_FILE_ERROR", "Could not read file: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun getStorageDirectory(promise: Promise) {
        promise.resolve(reactContext.filesDir.absolutePath)
    }

    private fun setMediaPlayerSource(player: MediaPlayer, uriStr: String) {
        val resolvedUri = ensureLocalUri(uriStr)
        if (resolvedUri.scheme == "content") {
            try {
                player.setDataSource(reactContext, resolvedUri)
            } catch (e: Exception) {
                reactContext.contentResolver.openFileDescriptor(resolvedUri, "r")?.fileDescriptor?.let { fd ->
                    player.setDataSource(fd)
                }
            }
        } else if (resolvedUri.scheme == "file" || resolvedUri.scheme == null) {
            val path = resolvedUri.path ?: uriStr
            player.setDataSource(path)
        } else if (resolvedUri.scheme == "asset" || uriStr.startsWith("asset:/")) {
            val assetPath = uriStr.removePrefix("asset:/").removePrefix("/")
            val cacheFile = File(reactContext.cacheDir, "asset_${Math.abs(assetPath.hashCode())}.wav")
            if (!cacheFile.exists() || cacheFile.length() == 0L) {
                reactContext.assets.open(assetPath).use { input ->
                    FileOutputStream(cacheFile).use { output ->
                        input.copyTo(output)
                    }
                }
            }
            player.setDataSource(cacheFile.absolutePath)
        } else {
            player.setDataSource(reactContext, resolvedUri)
        }
    }

    @ReactMethod
    fun playPreviewAudio(
        clipUriStr: String?,
        clipVolume: Double,
        clipMuted: Boolean,
        clipSpeed: Double,
        trackUriStr: String?,
        trackVolume: Double,
        trackMuted: Boolean,
        clipPositionMs: Int,
        trackPositionMs: Int,
        promise: Promise
    ) {
        mainHandler.post {
            try {
                // 1. Video Clip Audio Player
                val isImage = clipUriStr?.let {
                    it.endsWith(".jpg", true) || it.endsWith(".jpeg", true) || it.endsWith(".png", true) || it.endsWith(".webp", true)
                } ?: false

                if (!clipUriStr.isNullOrEmpty() && !clipMuted && clipVolume > 0 && !isImage) {
                    val needsNewPlayer = clipAudioPlayer == null || currentPlayingClipUri != clipUriStr
                    if (needsNewPlayer) {
                        try {
                            clipAudioPlayer?.stop()
                            clipAudioPlayer?.release()
                        } catch (_: Exception) {}

                        clipAudioPlayer = MediaPlayer().apply {
                            setMediaPlayerSource(this, clipUriStr)
                            try { prepare() } catch (_: Exception) {}
                        }
                        currentPlayingClipUri = clipUriStr
                    }

                    clipAudioPlayer?.let { player ->
                        val vol = clipVolume.toFloat().coerceIn(0f, 1f)
                        player.setVolume(vol, vol)
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M && clipSpeed > 0) {
                            try {
                                val params = player.playbackParams ?: PlaybackParams()
                                player.playbackParams = params.setSpeed(clipSpeed.toFloat())
                            } catch (_: Exception) {
                                try {
                                    val params = PlaybackParams()
                                    params.speed = clipSpeed.toFloat()
                                    player.playbackParams = params
                                } catch (_: Exception) {}
                            }
                        }
                        if (clipPositionMs >= 0) {
                            try { player.seekTo(clipPositionMs) } catch (_: Exception) {}
                        }
                        try {
                            if (!player.isPlaying) player.start()
                        } catch (_: Exception) {}
                    }
                } else {
                    try {
                        clipAudioPlayer?.let { if (it.isPlaying) it.pause() }
                    } catch (_: Exception) {}
                }

                // 2. Background Track Audio Player
                if (!trackUriStr.isNullOrEmpty() && !trackMuted && trackVolume > 0 && trackPositionMs >= 0) {
                    val needsNewTrack = trackAudioPlayer == null || currentPlayingTrackUri != trackUriStr
                    if (needsNewTrack) {
                        try {
                            trackAudioPlayer?.stop()
                            trackAudioPlayer?.release()
                        } catch (_: Exception) {}

                        trackAudioPlayer = MediaPlayer().apply {
                            setMediaPlayerSource(this, trackUriStr)
                            try { prepare() } catch (_: Exception) {}
                        }
                        currentPlayingTrackUri = trackUriStr
                    }

                    trackAudioPlayer?.let { player ->
                        val vol = trackVolume.toFloat().coerceIn(0f, 1f)
                        player.setVolume(vol, vol)
                        if (trackPositionMs >= 0) {
                            try { player.seekTo(trackPositionMs) } catch (_: Exception) {}
                        }
                        try {
                            if (!player.isPlaying) player.start()
                        } catch (_: Exception) {}
                    }
                } else {
                    try {
                        trackAudioPlayer?.let { if (it.isPlaying) it.pause() }
                    } catch (_: Exception) {}
                }

                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun pausePreviewAudio(promise: Promise) {
        mainHandler.post {
            try {
                clipAudioPlayer?.let { if (it.isPlaying) it.pause() }
                trackAudioPlayer?.let { if (it.isPlaying) it.pause() }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun seekPreviewAudio(clipPositionMs: Int, trackPositionMs: Int, promise: Promise) {
        mainHandler.post {
            try {
                if (clipPositionMs >= 0) {
                    try { clipAudioPlayer?.seekTo(clipPositionMs) } catch (_: Exception) {}
                }
                if (trackPositionMs >= 0) {
                    try { trackAudioPlayer?.seekTo(trackPositionMs) } catch (_: Exception) {}
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun setPreviewAudioVolume(
        clipVolume: Double,
        clipMuted: Boolean,
        trackVolume: Double,
        trackMuted: Boolean,
        promise: Promise
    ) {
        mainHandler.post {
            try {
                clipAudioPlayer?.let {
                    val vol = if (clipMuted) 0f else clipVolume.toFloat().coerceIn(0f, 1f)
                    it.setVolume(vol, vol)
                }
                trackAudioPlayer?.let {
                    val vol = if (trackMuted) 0f else trackVolume.toFloat().coerceIn(0f, 1f)
                    it.setVolume(vol, vol)
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun stopPreviewAudio(promise: Promise) {
        mainHandler.post {
            try {
                clipAudioPlayer?.stop()
                clipAudioPlayer?.release()
                clipAudioPlayer = null
                currentPlayingClipUri = null

                trackAudioPlayer?.stop()
                trackAudioPlayer?.release()
                trackAudioPlayer = null
                currentPlayingTrackUri = null

                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun pickAudio(promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity is null")
            return
        }
        pendingAudioPickerPromise = promise
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "audio/*"
            addCategory(Intent.CATEGORY_OPENABLE)
            putExtra(Intent.EXTRA_LOCAL_ONLY, true)
        }
        activity.startActivityForResult(intent, PICK_AUDIO_REQUEST_CODE)
    }

    @ReactMethod
    fun getStarterMusic(promise: Promise) {
        executor.execute {
            try {
                val musicDir = File(reactContext.filesDir, "sample_audio")
                if (!musicDir.exists()) musicDir.mkdirs()

                val destFile = File(musicDir, "sample_audio.wav")
                if (!destFile.exists() || destFile.length() == 0L) {
                    try {
                        reactContext.assets.open("sample_audio.wav").use { input ->
                            FileOutputStream(destFile).use { output ->
                                input.copyTo(output)
                            }
                        }
                    } catch (_: Exception) {}
                }

                val results = Arguments.createArray()
                if (destFile.exists() && destFile.length() > 0) {
                    val map = Arguments.createMap()
                    map.putString("name", "Upbeat Reel Beat")
                    map.putString("uri", "file://${destFile.absolutePath}")
                    map.putDouble("duration", 15.0)
                    results.pushMap(map)
                }

                promise.resolve(results)
            } catch (e: Exception) {
                promise.reject("MUSIC_ERROR", "Failed to load music: ${e.message}", e)
            }
        }
    }

    private fun writeWavFile(file: File, sampleRate: Int, samples: ShortArray) {
        val totalAudioLen = samples.size * 2
        val totalDataLen = totalAudioLen + 36
        val byteRate = sampleRate * 2

        FileOutputStream(file).use { out ->
            out.write("RIFF".toByteArray())
            out.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(totalDataLen).array())
            out.write("WAVE".toByteArray())
            out.write("fmt ".toByteArray())
            out.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(16).array())
            out.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(1.toShort()).array())
            out.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(1.toShort()).array())
            out.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(sampleRate).array())
            out.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(byteRate).array())
            out.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(2.toShort()).array())
            out.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(16.toShort()).array())
            out.write("data".toByteArray())
            out.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(totalAudioLen).array())

            val buffer = ByteBuffer.allocate(samples.size * 2).order(ByteOrder.LITTLE_ENDIAN)
            for (s in samples) {
                buffer.putShort(s)
            }
            out.write(buffer.array())
        }
    }

    @ReactMethod
    fun startVoiceoverRecording(promise: Promise) {
        mainHandler.post {
            try {
                if (androidx.core.content.ContextCompat.checkSelfPermission(
                        reactContext,
                        android.Manifest.permission.RECORD_AUDIO
                    ) != android.content.pm.PackageManager.PERMISSION_GRANTED
                ) {
                    promise.reject("PERMISSION_DENIED", "Microphone permission RECORD_AUDIO has not been granted")
                    return@post
                }

                try {
                    voiceoverRecorder?.stop()
                } catch (_: Exception) {}
                try {
                    voiceoverRecorder?.release()
                } catch (_: Exception) {}
                voiceoverRecorder = null

                val voiceoverDir = File(reactContext.filesDir, "voiceovers")
                if (!voiceoverDir.exists()) voiceoverDir.mkdirs()

                val fileName = "vo_${System.currentTimeMillis()}.m4a"
                val file = File(voiceoverDir, fileName)
                voiceoverOutputFile = file
                voiceoverStartTimeMs = System.currentTimeMillis()

                val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    MediaRecorder(reactContext)
                } else {
                    @Suppress("DEPRECATION")
                    MediaRecorder()
                }

                recorder.setAudioSource(MediaRecorder.AudioSource.MIC)
                recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                recorder.setAudioEncodingBitRate(128000)
                recorder.setAudioSamplingRate(44100)
                recorder.setOutputFile(file.absolutePath)
                recorder.prepare()
                recorder.start()
                voiceoverRecorder = recorder

                val result = Arguments.createMap().apply {
                    putBoolean("isRecording", true)
                    putString("filePath", "file://${file.absolutePath}")
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("VOICEOVER_START_ERROR", "Failed to start voiceover: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun stopVoiceoverRecording(promise: Promise) {
        mainHandler.post {
            try {
                voiceoverRecorder?.let {
                    try { it.stop() } catch (_: Exception) {}
                    try { it.release() } catch (_: Exception) {}
                }
                voiceoverRecorder = null

                val file = voiceoverOutputFile
                if (file != null && file.exists()) {
                    val durationSec = Math.max(0.5, (System.currentTimeMillis() - voiceoverStartTimeMs) / 1000.0)
                    val result = Arguments.createMap().apply {
                        putString("uri", "file://${file.absolutePath}")
                        putString("name", "Voiceover")
                        putDouble("duration", durationSec)
                    }
                    promise.resolve(result)
                } else {
                    promise.reject("VOICEOVER_ERROR", "Voiceover file not found")
                }
            } catch (e: Exception) {
                promise.reject("VOICEOVER_STOP_ERROR", "Failed to stop voiceover: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun getSoundEffects(promise: Promise) {
        executor.execute {
            try {
                val sfxDir = File(reactContext.filesDir, "sample_sfx")
                if (!sfxDir.exists()) sfxDir.mkdirs()

                val sampleRate = 22050
                val effectsList = listOf(
                    Triple("swoosh.wav", "Whoosh Transition", 0.45),
                    Triple("pop.wav", "Pop / Bubble", 0.15),
                    Triple("ding.wav", "Success Ding", 0.8),
                    Triple("click.wav", "Camera Click", 0.08),
                    Triple("bell.wav", "Clear Bell", 1.2),
                    Triple("riser.wav", "Tension Riser", 0.7)
                )

                val results = Arguments.createArray()

                for ((filename, title, duration) in effectsList) {
                    val file = File(sfxDir, filename)
                    if (!file.exists() || file.length() == 0L) {
                        val numSamples = (sampleRate * duration).toInt()
                        val samples = ShortArray(numSamples)

                        when (filename) {
                            "swoosh.wav" -> {
                                for (i in 0 until numSamples) {
                                    val t = i.toDouble() / sampleRate
                                    val progress = t / duration
                                    val freq = 200.0 + 800.0 * sin(progress * PI)
                                    val env = sin(progress * PI)
                                    val noise = (Math.random() * 2.0 - 1.0) * 0.4
                                    val tone = sin(2.0 * PI * freq * t) * 0.6
                                    samples[i] = ((tone + noise) * env * 24000.0).toInt().coerceIn(-32768, 32767).toShort()
                                }
                            }
                            "pop.wav" -> {
                                for (i in 0 until numSamples) {
                                    val t = i.toDouble() / sampleRate
                                    val progress = t / duration
                                    val freq = 600.0 * (1.0 - progress * 0.7)
                                    val env = (1.0 - progress) * (1.0 - progress)
                                    samples[i] = (sin(2.0 * PI * freq * t) * env * 28000.0).toInt().coerceIn(-32768, 32767).toShort()
                                }
                            }
                            "ding.wav" -> {
                                for (i in 0 until numSamples) {
                                    val t = i.toDouble() / sampleRate
                                    val env = exp(-4.0 * (t / duration))
                                    val tone = sin(2.0 * PI * 1318.5 * t) + 0.3 * sin(2.0 * PI * 2637.0 * t)
                                    samples[i] = (tone * env * 20000.0).toInt().coerceIn(-32768, 32767).toShort()
                                }
                            }
                            "click.wav" -> {
                                for (i in 0 until numSamples) {
                                    val t = i.toDouble() / sampleRate
                                    val env = exp(-30.0 * (t / duration))
                                    val noise = (Math.random() * 2.0 - 1.0)
                                    samples[i] = (noise * env * 28000.0).toInt().coerceIn(-32768, 32767).toShort()
                                }
                            }
                            "bell.wav" -> {
                                for (i in 0 until numSamples) {
                                    val t = i.toDouble() / sampleRate
                                    val env = exp(-2.5 * (t / duration))
                                    val tone = sin(2.0 * PI * 880.0 * t) + 0.5 * sin(2.0 * PI * 1760.0 * t) + 0.25 * sin(2.0 * PI * 2640.0 * t)
                                    samples[i] = (tone * env * 18000.0).toInt().coerceIn(-32768, 32767).toShort()
                                }
                            }
                            else -> { // riser.wav
                                for (i in 0 until numSamples) {
                                    val t = i.toDouble() / sampleRate
                                    val progress = t / duration
                                    val freq = 180.0 + 1200.0 * (progress * progress)
                                    val env = progress
                                    samples[i] = (sin(2.0 * PI * freq * t) * env * 24000.0).toInt().coerceIn(-32768, 32767).toShort()
                                }
                            }
                        }
                        writeWavFile(file, sampleRate, samples)
                    }

                    if (file.exists() && file.length() > 0) {
                        val map = Arguments.createMap().apply {
                            putString("id", "sfx_${filename.substringBefore('.')}")
                            putString("name", title)
                            putString("uri", "file://${file.absolutePath}")
                            putDouble("duration", duration)
                        }
                        results.pushMap(map)
                    }
                }

                promise.resolve(results)
            } catch (e: Exception) {
                promise.reject("SFX_ERROR", "Failed to load SFX: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun setImmersiveMode(enabled: Boolean, promise: Promise) {
        mainHandler.post {
            try {
                val activity = reactContext.currentActivity
                if (activity is MainActivity) {
                    if (enabled) {
                        activity.hideNavigationButtons()
                    } else {
                        activity.showNavigationButtons()
                    }
                    promise.resolve(true)
                } else if (activity != null) {
                    if (enabled) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            activity.window.insetsController?.let { controller ->
                                controller.hide(WindowInsets.Type.navigationBars())
                                controller.systemBarsBehavior =
                                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                            }
                        } else {
                            @Suppress("DEPRECATION")
                            activity.window.decorView.systemUiVisibility = (
                                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            )
                        }
                    } else {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            activity.window.insetsController?.show(WindowInsets.Type.navigationBars())
                        } else {
                            @Suppress("DEPRECATION")
                            activity.window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
                        }
                    }
                    promise.resolve(true)
                } else {
                    promise.resolve(false)
                }
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    override fun invalidate() {
        super.invalidate()
        try {
            clipAudioPlayer?.release()
            clipAudioPlayer = null
            trackAudioPlayer?.release()
            trackAudioPlayer = null
        } catch (_: Exception) {}
    }
}
