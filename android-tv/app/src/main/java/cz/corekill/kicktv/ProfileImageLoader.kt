package cz.corekill.kicktv

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.util.LruCache
import android.widget.ImageView
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import java.io.IOException
import java.util.WeakHashMap

class ProfileImageLoader(private val client: OkHttpClient) {
    private val main = Handler(Looper.getMainLooper())
    private val calls = WeakHashMap<ImageView, Call>()
    private val cache = object : LruCache<String, Bitmap>(4 * 1024 * 1024) {
        override fun sizeOf(key: String, value: Bitmap) = value.byteCount
    }

    fun load(view: ImageView, rawUrl: String, onLoaded: () -> Unit) {
        clear(view)
        val url = when {
            rawUrl.startsWith("//") -> "https:$rawUrl"
            rawUrl.startsWith("https://") -> rawUrl
            else -> return
        }
        view.tag = url
        cache.get(url)?.let {
            view.setImageBitmap(it)
            onLoaded()
            return
        }
        val call = client.newCall(Request.Builder().url(url).build())
        calls[view] = call
        call.enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) = finish(view, url, null, onLoaded)

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    val bitmap = if (it.isSuccessful) BitmapFactory.decodeStream(it.body?.byteStream()) else null
                    if (bitmap != null) cache.put(url, bitmap)
                    finish(view, url, bitmap, onLoaded)
                }
            }
        })
    }

    fun clear(view: ImageView) {
        calls.remove(view)?.cancel()
        view.tag = null
        view.setImageDrawable(null)
    }

    private fun finish(view: ImageView, url: String, bitmap: Bitmap?, onLoaded: () -> Unit) {
        main.post {
            if (view.tag != url) return@post
            calls.remove(view)
            if (bitmap != null) {
                view.setImageBitmap(bitmap)
                onLoaded()
            }
        }
    }
}
