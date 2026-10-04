package com.video.editor

import android.content.Context
import android.graphics.Matrix
import android.graphics.SurfaceTexture
import android.media.MediaPlayer
import android.media.PlaybackParams
import android.net.Uri
import android.os.Build
import android.view.Gravity
import android.view.Surface
import android.view.TextureView
import android.widget.FrameLayout
import java.io.File

class ClipveroVideoView(context: Context) : FrameLayout(context), TextureView.SurfaceTextureListener {

    private val textureView: TextureView = TextureView(context)
    private var mediaPlayer: MediaPlayer? = null
    private var surface: Surface? = null

    private var videoUriStr: String? = null
    private var isPlayingState: Boolean = false
    private var currentTimeMs: Int = 0
    private var playbackSpeed: Float = 1.0f
    private var volumeLevel: Float = 1.0f
    private var isMutedState: Boolean = false
    private var resizeModeState: String = "contain"

    private var isPrepared: Boolean = false
    private var videoWidth: Int = 0
    private var videoHeight: Int = 0

    init {
        val params = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT, Gravity.CENTER)
        textureView.layoutParams = params
        textureView.surfaceTextureListener = this
        addView(textureView)
    }

    override fun onSurfaceTextureAvailable(surfaceTexture: SurfaceTexture, width: Int, height: Int) {
        surface = Surface(surfaceTexture)
        mediaPlayer?.setSurface(surface)
        if (isPrepared) {
            adjustAspectRatio()
            if (isPlayingState && mediaPlayer?.isPlaying == false) {
                mediaPlayer?.start()
            }
        } else if (!videoUriStr.isNullOrEmpty()) {
            initMediaPlayer()
        }
    }

    override fun onSurfaceTextureSizeChanged(surfaceTexture: SurfaceTexture, width: Int, height: Int) {
        adjustAspectRatio()
    }

    override fun onSurfaceTextureDestroyed(surfaceTexture: SurfaceTexture): Boolean {
        surface?.release()
        surface = null
        mediaPlayer?.setSurface(null)
        return true
    }

    override fun onSurfaceTextureUpdated(surfaceTexture: SurfaceTexture) {
        // Frame rendered
    }

    fun setVideoUri(uri: String?) {
        if (uri == videoUriStr && mediaPlayer != null) return
        videoUriStr = uri
        initMediaPlayer()
    }

    fun setIsPlaying(playing: Boolean) {
        isPlayingState = playing
        mediaPlayer?.let { player ->
            if (isPrepared) {
                if (playing) {
                    if (!player.isPlaying) {
                        player.start()
                    }
                } else {
                    if (player.isPlaying) {
                        player.pause()
                    }
                }
            }
        }
    }

    fun setCurrentTimeMs(ms: Int) {
        currentTimeMs = ms
        // Only seek if paused or if position has jumped significantly
        mediaPlayer?.let { player ->
            if (isPrepared && !isPlayingState) {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        player.seekTo(ms.toLong(), MediaPlayer.SEEK_CLOSEST)
                    } else {
                        player.seekTo(ms)
                    }
                } catch (_: Exception) {}
            }
        }
    }

    fun setSpeed(speed: Double) {
        playbackSpeed = speed.toFloat().coerceAtLeast(0.1f)
        applySpeed()
    }

    fun setVolume(vol: Double) {
        volumeLevel = vol.toFloat().coerceIn(0f, 1f)
        applyVolume()
    }

    fun setIsMuted(muted: Boolean) {
        isMutedState = muted
        applyVolume()
    }

    fun setResizeMode(mode: String?) {
        resizeModeState = mode ?: "contain"
        adjustAspectRatio()
    }

    private fun initMediaPlayer() {
        val uriStr = videoUriStr
        if (uriStr.isNullOrEmpty()) {
            cleanupMediaPlayer()
            return
        }

        cleanupMediaPlayer()
        isPrepared = false

        try {
            val player = MediaPlayer()
            mediaPlayer = player

            if (surface != null) {
                player.setSurface(surface)
            }

            // Set Data Source
            if (uriStr.startsWith("asset:/") || uriStr.startsWith("file:///android_asset/")) {
                val cleanPath = uriStr.replace("file:///android_asset/", "").replace("asset:/", "")
                val afd = context.assets.openFd(cleanPath)
                player.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                afd.close()
            } else if (uriStr.startsWith("content://") || uriStr.startsWith("file://") || uriStr.startsWith("http://") || uriStr.startsWith("https://")) {
                player.setDataSource(context, Uri.parse(uriStr))
            } else {
                player.setDataSource(context, Uri.fromFile(File(uriStr)))
            }

            player.setOnPreparedListener { mp ->
                isPrepared = true
                videoWidth = mp.videoWidth
                videoHeight = mp.videoHeight
                adjustAspectRatio()
                applyVolume()
                applySpeed()

                if (currentTimeMs > 0) {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            mp.seekTo(currentTimeMs.toLong(), MediaPlayer.SEEK_CLOSEST)
                        } else {
                            mp.seekTo(currentTimeMs)
                        }
                    } catch (_: Exception) {}
                }

                if (isPlayingState) {
                    mp.start()
                }
            }

            player.setOnVideoSizeChangedListener { _, width, height ->
                videoWidth = width
                videoHeight = height
                adjustAspectRatio()
            }

            player.setOnErrorListener { _, _, _ ->
                true // Handled
            }

            player.prepareAsync()
        } catch (_: Exception) {
            cleanupMediaPlayer()
        }
    }

    private fun applyVolume() {
        val vol = if (isMutedState) 0f else volumeLevel
        try {
            mediaPlayer?.setVolume(vol, vol)
        } catch (_: Exception) {}
    }

    private fun applySpeed() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                mediaPlayer?.let { player ->
                    val params = player.playbackParams ?: PlaybackParams()
                    player.playbackParams = params.setSpeed(playbackSpeed)
                }
            } catch (_: Exception) {}
        }
    }

    private fun adjustAspectRatio() {
        val viewWidth = width
        val viewHeight = height
        if (viewWidth == 0 || viewHeight == 0 || videoWidth == 0 || videoHeight == 0) return

        val viewRatio = viewWidth.toDouble() / viewHeight.toDouble()
        val videoRatio = videoWidth.toDouble() / videoHeight.toDouble()

        var scaleX = 1.0
        var scaleY = 1.0

        if (resizeModeState == "cover") {
            if (viewRatio > videoRatio) {
                scaleY = (viewWidth.toDouble() / videoWidth.toDouble()) / (viewHeight.toDouble() / videoHeight.toDouble())
            } else {
                scaleX = (viewHeight.toDouble() / videoHeight.toDouble()) / (viewWidth.toDouble() / videoWidth.toDouble())
            }
        } else {
            // "contain"
            if (viewRatio > videoRatio) {
                scaleX = videoRatio / viewRatio
            } else {
                scaleY = viewRatio / videoRatio
            }
        }

        val matrix = Matrix()
        val pivotX = viewWidth / 2f
        val pivotY = viewHeight / 2f
        matrix.setScale(scaleX.toFloat(), scaleY.toFloat(), pivotX, pivotY)
        textureView.setTransform(matrix)
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        if (changed) {
            adjustAspectRatio()
        }
    }

    private fun cleanupMediaPlayer() {
        try {
            mediaPlayer?.stop()
        } catch (_: Exception) {}
        try {
            mediaPlayer?.reset()
        } catch (_: Exception) {}
        try {
            mediaPlayer?.release()
        } catch (_: Exception) {}
        mediaPlayer = null
        isPrepared = false
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        cleanupMediaPlayer()
        surface?.release()
        surface = null
    }
}
