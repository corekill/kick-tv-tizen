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
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

class KickApi {
    private val main = Handler(Looper.getMainLooper())
    val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .callTimeout(18, TimeUnit.SECONDS)
        .build()

    fun search(query: String, callback: (Result<List<ChannelCard>>) -> Unit) {
        val encoded = URLEncoder.encode(query, "UTF-8")
        request("https://www.kickstats.com/api/search?query=$encoded") { result ->
            callback(result.mapCatching { body ->
                val channels = JSONObject(body).optJSONArray("channels")
                buildList {
                    if (channels != null) for (index in 0 until minOf(channels.length(), 8)) {
                        val item = channels.optJSONObject(index) ?: continue
                        val slug = item.optString("slug").trim()
                        if (slug.isEmpty()) continue
                        add(
                            ChannelCard(
                                slug = slug,
                                name = item.optString("username", slug),
                                isLive = item.optBoolean("is_live"),
                                followers = item.optInt("followers_count"),
                                category = item.optJSONObject("category")?.optString("name")?.takeIf { it.isNotBlank() } ?: "Kick",
                                profileUrl = item.optString("profile_pic")
                            )
                        )
                    }
                }
            })
        }
    }

    fun channel(slug: String, callback: (Result<ChannelDetails>) -> Unit) {
        val encoded = URLEncoder.encode(slug, "UTF-8")
        request("https://kick.com/api/v2/channels/$encoded") { result ->
            callback(result.mapCatching { parseChannel(slug, JSONObject(it)) })
        }
    }

    private fun request(url: String, callback: (Result<String>) -> Unit) {
        val request = Request.Builder()
            .url(url)
            .header("Accept", "application/json")
            .header("User-Agent", "KickTV-Android/0.1")
            .build()
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                deliver { callback(Result.failure(e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    val body = it.body?.string().orEmpty()
                    if (!it.isSuccessful) deliver { callback(Result.failure(IOException("HTTP ${it.code}"))) }
                    else deliver { callback(Result.success(body)) }
                }
            }
        })
    }

    private fun parseChannel(fallbackSlug: String, data: JSONObject): ChannelDetails {
        val stream = data.optJSONObject("livestream")
        val user = data.optJSONObject("user")
        val categoryObject = stream?.optJSONObject("category")
            ?: stream?.optJSONArray("categories")?.optJSONObject(0)
            ?: data.optJSONArray("recent_categories")?.optJSONObject(0)
        val playback = data.optString("playback_url").takeIf { it.startsWith("http") }
        val isLive = stream != null && stream.optBoolean("is_live", true) && playback != null
        return ChannelDetails(
            slug = data.optString("slug", fallbackSlug),
            name = user?.optString("username")?.takeIf { it.isNotBlank() }
                ?: data.optString("username").takeIf { it.isNotBlank() }
                ?: fallbackSlug,
            isLive = isLive,
            playbackUrl = playback,
            roomId = data.optJSONObject("chatroom")?.optLong("id")?.takeIf { it > 0 },
            userId = data.optLong("user_id").takeIf { it > 0 }
                ?: user?.optLong("id")?.takeIf { it > 0 },
            viewers = stream?.optInt("viewer_count") ?: 0,
            category = categoryObject?.optString("name")?.takeIf { it.isNotBlank() } ?: "Kick",
            profileUrl = user?.optString("profile_pic")?.takeIf { it.startsWith("http") }.orEmpty()
        )
    }

    private fun deliver(block: () -> Unit) = main.post(block)
}
