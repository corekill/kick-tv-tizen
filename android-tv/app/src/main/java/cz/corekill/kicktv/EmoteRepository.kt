package cz.corekill.kicktv

import android.os.Handler
import android.os.Looper
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import org.json.JSONObject
import java.io.IOException

class EmoteRepository(private val client: OkHttpClient) {
    private val main = Handler(Looper.getMainLooper())
    private var global: Map<String, String>? = null

    fun load(userId: Long?, callback: (Map<String, String>) -> Unit) {
        loadGlobal { globalMap ->
            if (userId == null) callback(globalMap)
            else fetch("https://7tv.io/v3/users/kick/$userId") { channel -> callback(globalMap + channel) }
        }
    }

    private fun loadGlobal(callback: (Map<String, String>) -> Unit) {
        global?.let { callback(it); return }
        fetch("https://7tv.io/v3/emote-sets/global") {
            global = it
            callback(it)
        }
    }

    private fun fetch(url: String, callback: (Map<String, String>) -> Unit) {
        val request = Request.Builder().url(url).header("Accept", "application/json").build()
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                main.post { callback(emptyMap()) }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    val map = if (it.isSuccessful) runCatching { parse(JSONObject(it.body?.string().orEmpty())) }.getOrDefault(emptyMap()) else emptyMap()
                    main.post { callback(map) }
                }
            }
        })
    }

    private fun parse(data: JSONObject): Map<String, String> {
        val items = data.optJSONObject("emote_set")?.optJSONArray("emotes") ?: data.optJSONArray("emotes") ?: return emptyMap()
        return buildMap {
            for (index in 0 until items.length()) {
                val entry = items.optJSONObject(index) ?: continue
                val name = entry.optString("name").takeIf { it.isNotBlank() } ?: continue
                val host = entry.optJSONObject("data")?.optJSONObject("host") ?: continue
                val files = host.optJSONArray("files") ?: continue
                var fileName = ""
                for (fileIndex in 0 until files.length()) {
                    val candidate = files.optJSONObject(fileIndex)?.optString("name").orEmpty()
                    if (candidate == "2x.webp") { fileName = candidate; break }
                    if (fileName.isEmpty() && candidate.endsWith(".webp")) fileName = candidate
                }
                var base = host.optString("url")
                if (base.startsWith("//")) base = "https:$base"
                if (base.startsWith("http") && fileName.isNotEmpty()) put(name, "$base/$fileName")
            }
        }
    }
}
