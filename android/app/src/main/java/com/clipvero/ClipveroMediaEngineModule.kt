package com.clipvero

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
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
import java.nio.ByteBuffer
import java.util.concurrent.Executors

class ClipveroMediaEngineModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val executor = Executors.newFixedThreadPool(4)
    private val mainHandler = Handler(Looper.getMainLooper())
    private var activeTransformer: Transformer? = null
    private var activeOutputFile: File? = null
    private var isCancelled = false
    private var progressRunnable: Runnable? = null

    private var pendingPickerPromise: Promise? = null
    private val PICK_MEDIA_REQUEST_CODE = 41234

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
                            } catch (_: Exception) {
                            } finally {
                                try { retriever.release() } catch (_: Exception) {}
                            }

                            val itemMap = Arguments.createMap()
                            itemMap.putString("uri", uri.toString())
                            itemMap.putString("name", name)
                            itemMap.putString("type", "video")
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
        return if (uriStr.startsWith("content://") || uriStr.startsWith("file://")) {
            Uri.parse(uriStr)
        } else {
            Uri.fromFile(File(uriStr))
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
                val uri = parseUri(uriStr)
                if (uriStr.startsWith("content://")) {
                    reactContext.contentResolver.openFileDescriptor(uri, "r")?.use { pfd ->
                        retriever.setDataSource(pfd.fileDescriptor)
                    } ?: run {
                        retriever.setDataSource(reactContext, uri)
                    }
                } else {
                    retriever.setDataSource(uri.path)
                }

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
                val uri = parseUri(uriStr)
                if (uriStr.startsWith("content://")) {
                    reactContext.contentResolver.openFileDescriptor(uri, "r")?.use { pfd ->
                        retriever.setDataSource(pfd.fileDescriptor)
                    } ?: run {
                        retriever.setDataSource(reactContext, uri)
                    }
                } else {
                    retriever.setDataSource(uri.path)
                }

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
                val uri = parseUri(uriStr)
                if (uriStr.startsWith("content://")) {
                    reactContext.contentResolver.openFileDescriptor(uri, "r")?.use { pfd ->
                        retriever.setDataSource(pfd.fileDescriptor)
                    } ?: run {
                        retriever.setDataSource(reactContext, uri)
                    }
                } else {
                    retriever.setDataSource(uri.path)
                }

                val durStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                val durationMs = durStr?.toLongOrNull() ?: 10000L
                val durationUs = durationMs * 1000L

                val intervalUs = if (count > 1) durationUs / (count - 1) else 0L
                val thumbs = Arguments.createArray()

                val cacheDir = File(reactContext.cacheDir, "clipvero_thumbs")
                if (!cacheDir.exists()) cacheDir.mkdirs()

                for (i in 0 until count) {
                    val targetUs = i * intervalUs
                    val bitmap = retriever.getFrameAtTime(targetUs, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                        ?: retriever.frameAtTime

                    if (bitmap != null) {
                        val scaled = Bitmap.createScaledBitmap(bitmap, 120, 120, true)
                        val thumbFile = File(cacheDir, "tl_${System.currentTimeMillis()}_${i}.jpg")
                        FileOutputStream(thumbFile).use { out ->
                            scaled.compress(Bitmap.CompressFormat.JPEG, 70, out)
                        }
                        if (scaled != bitmap) scaled.recycle()
                        bitmap.recycle()
                        thumbs.pushString("file://${thumbFile.absolutePath}")
                    }
                }

                promise.resolve(thumbs)
            } catch (e: Exception) {
                promise.reject("TIMELINE_THUMBNAIL_ERROR", "Failed to generate timeline frames: ${e.message}", e)
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

                if (videoUriStr.startsWith("content://")) {
                    reactContext.contentResolver.openFileDescriptor(videoUri, "r")?.use { pfd ->
                        extractor.setDataSource(pfd.fileDescriptor)
                    } ?: run {
                        extractor.setDataSource(reactContext, videoUri, null)
                    }
                } else {
                    extractor.setDataSource(videoUri.path!!)
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
                    bufferInfo.flags = extractor.sampleFlags

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
    fun exportProject(configJson: String, promise: Promise) {
        executor.execute {
            try {
                isCancelled = false
                val projectObj = JSONObject(configJson)
                val projectName = projectObj.optString("name", "Clipvero_Export")
                val clipsArray = projectObj.getJSONArray("clips")
                val exportSettings = projectObj.optJSONObject("exportSettings")

                if (clipsArray.length() == 0) {
                    promise.reject("NO_CLIPS", "Cannot export project with 0 clips.")
                    return@execute
                }

                val exportDir = File(reactContext.filesDir, "exports")
                if (!exportDir.exists()) exportDir.mkdirs()

                val resolution = exportSettings?.optString("resolution", "1080p") ?: "1080p"
                val outHeight = when (resolution) {
                    "720p" -> 1280
                    "480p" -> 854
                    else -> 1920
                }
                val outWidth = when (resolution) {
                    "720p" -> 720
                    "480p" -> 480
                    else -> 1080
                }

                val outputFile = File(exportDir, "${projectName}_${System.currentTimeMillis()}.mp4")
                activeOutputFile = outputFile

                val editedMediaItems = ArrayList<EditedMediaItem>()

                for (i in 0 until clipsArray.length()) {
                    val clipObj = clipsArray.getJSONObject(i)
                    val uriStr = clipObj.getString("uri")
                    val uri = parseUri(uriStr)

                    val trimStartSec = clipObj.optDouble("trimStart", 0.0)
                    val trimEndSec = clipObj.optDouble("trimEnd", -1.0)
                    val rotationDeg = clipObj.optInt("rotation", 0)
                    val transitionObj = clipObj.optJSONObject("transition")
                    val transitionType = transitionObj?.optString("type", "none") ?: "none"

                    val mediaItemBuilder = MediaItem.Builder().setUri(uri)

                    val clippingConfig = MediaItem.ClippingConfiguration.Builder()
                        .setStartPositionMs((trimStartSec * 1000).toLong())

                    if (trimEndSec > 0) {
                        clippingConfig.setEndPositionMs((trimEndSec * 1000).toLong())
                    }
                    mediaItemBuilder.setClippingConfiguration(clippingConfig.build())

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

                    val editedItem = EditedMediaItem.Builder(mediaItemBuilder.build())
                        .setEffects(effects)
                        .setRemoveAudio(clipObj.optBoolean("isMuted", false))
                        .build()

                    editedMediaItems.add(editedItem)
                }

                val sequence = EditedMediaItemSequence(editedMediaItems)
                val composition = Composition.Builder(listOf(sequence)).build()

                mainHandler.post {
                    try {
                        val transformationRequest = TransformationRequest.Builder()
                            .setVideoMimeType(MimeTypes.VIDEO_H264)
                            .setAudioMimeType(MimeTypes.AUDIO_AAC)
                            .build()

                        val transformer = Transformer.Builder(reactContext)
                            .setTransformationRequest(transformationRequest)
                            .addListener(object : Transformer.Listener {
                                override fun onCompleted(composition: Composition, exportResult: androidx.media3.transformer.ExportResult) {
                                    stopProgressPolling()
                                    activeTransformer = null
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
                                    stopProgressPolling()
                                    activeTransformer = null
                                    if (outputFile.exists()) outputFile.delete()
                                    promise.reject("EXPORT_ERROR", "Media3 Export error: ${exportException.message}", exportException)
                                }
                            })
                            .build()

                        activeTransformer = transformer
                        transformer.start(composition, outputFile.absolutePath)
                        startProgressPolling(transformer)

                    } catch (e: Exception) {
                        if (outputFile.exists()) outputFile.delete()
                        promise.reject("EXPORT_INIT_ERROR", "Failed to start transformer: ${e.message}", e)
                    }
                }

            } catch (e: Exception) {
                promise.reject("EXPORT_PARSE_ERROR", "Export configuration failed: ${e.message}", e)
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
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("CANCEL_ERROR", "Failed to cancel export: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun saveFile(filename: String, content: String, promise: Promise) {
        executor.execute {
            try {
                val file = File(reactContext.filesDir, filename)
                FileOutputStream(file).use { out ->
                    out.write(content.toByteArray(Charsets.UTF_8))
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
                if (!file.exists()) {
                    promise.resolve(null)
                    return@execute
                }
                val content = file.readText(Charsets.UTF_8)
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
}

