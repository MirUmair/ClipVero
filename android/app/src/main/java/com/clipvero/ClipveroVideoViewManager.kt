package com.clipvero

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class ClipveroVideoViewManager : SimpleViewManager<ClipveroVideoView>() {

    override fun getName(): String = "ClipveroVideoView"

    override fun createViewInstance(reactContext: ThemedReactContext): ClipveroVideoView {
        return ClipveroVideoView(reactContext)
    }

    @ReactProp(name = "videoUri")
    fun setVideoUri(view: ClipveroVideoView, uri: String?) {
        view.setVideoUri(uri)
    }

    @ReactProp(name = "isPlaying", defaultBoolean = false)
    fun setIsPlaying(view: ClipveroVideoView, isPlaying: Boolean) {
        view.setIsPlaying(isPlaying)
    }

    @ReactProp(name = "currentTimeMs", defaultInt = 0)
    fun setCurrentTimeMs(view: ClipveroVideoView, ms: Int) {
        view.setCurrentTimeMs(ms)
    }

    @ReactProp(name = "speed", defaultDouble = 1.0)
    fun setSpeed(view: ClipveroVideoView, speed: Double) {
        view.setSpeed(speed)
    }

    @ReactProp(name = "volume", defaultDouble = 1.0)
    fun setVolume(view: ClipveroVideoView, volume: Double) {
        view.setVolume(volume)
    }

    @ReactProp(name = "isMuted", defaultBoolean = false)
    fun setIsMuted(view: ClipveroVideoView, isMuted: Boolean) {
        view.setIsMuted(isMuted)
    }

    @ReactProp(name = "resizeMode")
    fun setResizeMode(view: ClipveroVideoView, resizeMode: String?) {
        view.setResizeMode(resizeMode)
    }
}
