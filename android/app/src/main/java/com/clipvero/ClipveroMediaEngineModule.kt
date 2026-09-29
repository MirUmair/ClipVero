package com.clipvero

import android.content.Context
import android.graphics.Bitmap
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import android.net.Uri
import android.os.Handler
import android.os.Looper
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
import com.facebook.react.bridge.Arguments
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

    override fun getName(): String = "ClipveroMediaEngine"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            // Context might not be active
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
    fun getVideoMetadata(uriStr: String, promise: Promise) {
        executor.execute {
            val retriever = MediaMetadataRetriever()
            try {
                val uri = parseUri(uriStr)
                if (uri.scheme == "content") {
                    retriever.setDataSource(reactContext, uri)
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
                promise.reject("METADATA_ERROR", "Failed to retrieve metadata: ${e.message}", e)
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
                if (uri.scheme == "content") {
                    retriever.setDataSource(reactContext, uri)
                } else {
                    retriever.setDataSource(uri.path)
                }

                val timeUs = (timeSec * 1_000_000).toLong()
                val bitmap = retriever.getFrameAtTime(timeUs, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                    ?: retriever.frameAtTime

                if (bitmap == null) {
                    promise.reject("THUMBNAIL_ERROR", "Could not extract frame at $timeSec s")
                    return@execute
                }

                val targetW = if (width > 0) width else 240
                val targetH = if (height > 0) height else (bitmap.height * targetW / bitmap.width)
                val scaled = Bitmap.createScaledBitmap(bitmap, targetW, targetH, true)

                val cacheDir = File(reactContext.cacheDir, "clipvero_thumbs")
                if (!cacheDir.exists()) cacheDir.mkdirs()

                val thumbFile = File(cacheDir, "thumb_${System.currentTimeMillis()}_${(Math.random() * 1000).toInt()}.jpg")
                FileOutputStream(thumbFile).use { out ->
                    scaled.compress(Bitmap.CompressFormat.JPEG, 80, out)
                }

                if (scaled != bitmap) scaled.recycle()
                bitmap.recycle()

                promise.resolve("file://${thumbFile.absolutePath}")
            } catch (e: Exception) {
                promise.reject("THUMBNAIL_ERROR", "Thumbnail error: ${e.message}", e)
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
                if (uri.scheme == "content") {
                    retriever.setDataSource(reactContext, uri)
                } else {
                    retriever.setDataSource(uri.path)
                }

                val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 1000L
                val numThumbs = count.coerceIn(1, 20)
                val intervalMs = durationMs / numThumbs

                val cacheDir = File(reactContext.cacheDir, "clipvero_timeline_thumbs")
                if (!cacheDir.exists()) cacheDir.mkdirs()

                val results: WritableArray = Arguments.createArray()

                for (i in 0 until numThumbs) {
                    val frameTimeUs = (i * intervalMs + intervalMs / 2) * 1000L
                    val bitmap = retriever.getFrameAtTime(frameTimeUs, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                        ?: retriever.frameAtTime

                    if (bitmap != null) {
                        val scaled = Bitmap.createScaledBitmap(bitmap, 120, 80, true)
                        val thumbFile = File(cacheDir, "tl_${System.currentTimeMillis()}_${i}.jpg")
                        FileOutputStream(thumbFile).use { out ->
                            scaled.compress(Bitmap.CompressFormat.JPEG, 70, out)
                        }
                        if (scaled != bitmap) scaled.recycle()
                        bitmap.recycle()
                        results.pushString("file://${thumbFile.absolutePath}")
                    }
                }

                promise.resolve(results)
            } catch (e: Exception) {
                promise.reject("TIMELINE_THUMB_ERROR", "Failed to extract timeline thumbnails: ${e.message}", e)
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
            val extractor = MediaExtractor()
            var muxer: MediaMuxer? = null
            try {
                val uri = parseUri(videoUriStr)
                if (uri.scheme == "content") {
                    extractor.setDataSource(reactContext, uri, null)
                } else {
                    extractor.setDataSource(uri.path!!)
                }

                var audioTrackIndex = -1
                for (i in 0 until extractor.trackCount) {
                    val format = extractor.getTrackFormat(i)
                    val mime = format.getString(MediaFormat.KEY_MIME) ?: ""
                    if (mime.startsWith("audio/")) {
                        audioTrackIndex = i
                        break
                    }
                }

                if (audioTrackIndex < 0) {
                    promise.reject("NO_AUDIO", "No audio track found in the media")
                    return@execute
                }

                extractor.selectTrack(audioTrackIndex)
                val format = extractor.getTrackFormat(audioTrackIndex)

                val exportDir = File(reactContext.filesDir, "extracted_audio")
                if (!exportDir.exists()) exportDir.mkdirs()
                val outputFile = File(exportDir, "${outputName}_${System.currentTimeMillis()}.m4a")

                muxer = MediaMuxer(outputFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
                val muxerTrack = muxer.addTrack(format)
                muxer.start()

                val buffer = ByteBuffer.allocate(1024 * 1024)
                val bufferInfo = MediaCodec.BufferInfo()

                while (true) {
                    bufferInfo.size = extractor.readSampleData(buffer, 0)
                    if (bufferInfo.size < 0) break
                    bufferInfo.presentationTimeUs = extractor.sampleTime
                    bufferInfo.flags = extractor.sampleFlags
                    muxer.writeSampleData(muxerTrack, buffer, bufferInfo)
                    extractor.advance()
                }

                promise.resolve("file://${outputFile.absolutePath}")
            } catch (e: Exception) {
                promise.reject("EXTRACT_AUDIO_ERROR", "Audio extraction failed: ${e.message}", e)
            } finally {
                try {
                    extractor.release()
                    muxer?.stop()
                    muxer?.release()
                } catch (_: Exception) {}
            }
        }
    }

    @ReactMethod
    fun exportProject(configJsonStr: String, promise: Promise) {
        executor.execute {
            try {
                isCancelled = false
                val config = JSONObject(configJsonStr)
                val clipsArray = config.getJSONArray("clips")
                val exportSettings = config.optJSONObject("exportSettings")
                val projectName = config.optString("name", "Clipvero_Export")

                if (clipsArray.length() == 0) {
                    promise.reject("EMPTY_PROJECT", "No clips to export")
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

                // Build Media3 EditedMediaItemSequence for seamless multi-clip composition
                val editedMediaItems = ArrayList<EditedMediaItem>()

                for (i in 0 until clipsArray.length()) {
                    val clipObj = clipsArray.getJSONObject(i)
                    val uriStr = clipObj.getString("uri")
                    val uri = parseUri(uriStr)

                    val trimStartSec = clipObj.optDouble("trimStart", 0.0)
                    val trimEndSec = clipObj.optDouble("trimEnd", -1.0)
                    val rotationDeg = clipObj.optInt("rotation", 0)

                    val mediaItemBuilder = MediaItem.Builder().setUri(uri)

                    val clippingConfig = MediaItem.ClippingConfiguration.Builder()
                        .setStartPositionMs((trimStartSec * 1000).toLong())

                    if (trimEndSec > 0) {
                        clippingConfig.setEndPositionMs((trimEndSec * 1000).toLong())
                    }
                    mediaItemBuilder.setClippingConfiguration(clippingConfig.build())

                    val effectsList = ArrayList<androidx.media3.common.Effect>()
                    if (rotationDeg != 0) {
                        effectsList.add(ScaleAndRotateTransformation.Builder().setRotationDegrees(rotationDeg.toFloat()).build())
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
