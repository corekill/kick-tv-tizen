package cz.corekill.kicktv

import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import okhttp3.OkHttpClient
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.io.IOException
import java.util.UUID
import java.util.concurrent.TimeUnit

class ChatClient(
    private val client: OkHttpClient,
    private val onStatus: (Boolean) -> Unit,
    private val onMessage: (ChatMessage) -> Unit,
    private val preferences: SharedPreferences
) {
    private val main = Handler(Looper.getMainLooper())
    private var socket: WebSocket? = null
    private var roomId: Long? = null
    private var reconnect: Runnable? = null
    @Volatile private var active = false
    private var channelId: Long? = null
    @Volatile private var sequence = 0
    private var connectionCall: Call? = null
    private val resolver = client.newBuilder().callTimeout(5, TimeUnit.SECONDS).build()

    fun connect(newRoomId: Long?, newChannelId: Long? = null) {
        disconnect()
        if (newRoomId == null) return
        active = true
        roomId = newRoomId
        channelId = newChannelId
        resolve(newRoomId)
    }

    fun disconnect() {
        active = false
        sequence++
        connectionCall?.cancel()
        connectionCall = null
        reconnect?.let(main::removeCallbacks)
        reconnect = null
        socket?.close(1000, null)
        socket = null
        roomId = null
        onStatus(false)
    }

    private fun connectionUrl(key: String?, cluster: String?): String? {
        if (key == null || cluster == null || !key.matches(Regex("[A-Za-z0-9]{8,64}")) || !cluster.matches(Regex("[a-z0-9-]{1,24}"))) return null
        return "wss://ws-$cluster.pusher.com/app/$key?protocol=7&client=js&version=8.4.0&flash=false"
    }

    private fun resolve(id: Long) {
        val generation = ++sequence
        val fallback = connectionUrl(preferences.getString("key", null), preferences.getString("cluster", null))
            ?: connectionUrl("34bf7a0ff419a2a775b9", "us2")!!
        fun deliver(url: String) = main.post {
            if (active && roomId == id && generation == sequence) open(id, url, generation)
        }
        val channel = channelId ?: run { deliver(fallback); return }
        val body = JSONObject().put("client", JSONObject().put("id", UUID.randomUUID().toString()).put("type", "web"))
            .put("capabilities", JSONObject().put("accepted_providers", org.json.JSONArray().put(JSONObject().put("provider", "pusher"))))
        val request = Request.Builder().url("https://web.kick.com/api/v1/realtime/channels/$channel/chat/connection")
            .header("Accept", "application/json")
            .post(body.toString().toRequestBody("application/json".toMediaType())).build()
        connectionCall = resolver.newCall(request).also { call ->
            call.enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) { deliver(fallback) }
                override fun onResponse(call: Call, response: Response) {
                    var url = fallback
                    response.use {
                        runCatching {
                            if (!it.isSuccessful) return@runCatching
                            val data = JSONObject(it.body?.string().orEmpty()).getJSONObject("data")
                            if (data.optString("mode") != "websocket") return@runCatching
                            val connections = data.getJSONArray("connections")
                            for (index in 0 until connections.length()) {
                                val item = connections.getJSONObject(index)
                                if (item.optString("provider") != "pusher") continue
                                val credentials = item.getJSONObject("credentials")
                                val key = credentials.optString("app_key")
                                val cluster = credentials.optString("cluster")
                                val resolved = connectionUrl(key, cluster) ?: continue
                                url = resolved
                                preferences.edit().putString("key", key).putString("cluster", cluster).apply()
                                break
                            }
                        }
                    }
                    deliver(url)
                }
            })
        }
    }

    private fun open(id: Long, url: String, generation: Int) {
        val request = Request.Builder()
            .url(url)
            .build()
        socket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) {
                if (generation != sequence || !active) return
                runCatching {
                    val packet = JSONObject(text)
                    val event = packet.optString("event")
                    when {
                        event == "pusher:connection_established" -> {
                            val payload = JSONObject().put("event", "pusher:subscribe").put(
                                "data", JSONObject().put("auth", "").put("channel", "chatrooms.$id.v2")
                            )
                            webSocket.send(payload.toString())
                        }
                        event == "pusher_internal:subscription_succeeded" -> main.post { if (generation == sequence && active) onStatus(true) }
                        event == "pusher:ping" -> webSocket.send(JSONObject().put("event", "pusher:pong").put("data", JSONObject()).toString())
                        event.contains("ChatMessage") -> parseMessage(packet)?.let { message -> main.post { if (generation == sequence && active) onMessage(message) } }
                    }
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) = scheduleReconnect(id, generation)
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) = scheduleReconnect(id, generation)
        })
    }

    private fun parseMessage(packet: JSONObject): ChatMessage? {
        val raw = packet.opt("data")
        val data = when (raw) {
            is JSONObject -> raw
            is String -> JSONObject(raw)
            else -> return null
        }
        val sender = data.optJSONObject("sender") ?: data.optJSONObject("user") ?: JSONObject()
        val content = data.optString("content").takeIf { it.isNotBlank() }
            ?: data.optJSONObject("message")?.optString("message")?.takeIf { it.isNotBlank() }
            ?: return null
        return ChatMessage(
            username = sender.optString("username", "Kick"),
            color = sender.optJSONObject("identity")?.optString("color"),
            content = content
        )
    }

    private fun scheduleReconnect(id: Long, generation: Int) {
        main.post {
            if (!active || roomId != id || generation != sequence) return@post
            onStatus(false)
            reconnect?.let(main::removeCallbacks)
            reconnect = Runnable { if (active && roomId == id && generation == sequence) resolve(id) }
            main.postDelayed(reconnect!!, 3500)
        }
    }
}
