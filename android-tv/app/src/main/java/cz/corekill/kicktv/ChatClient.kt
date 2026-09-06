package cz.corekill.kicktv

import android.os.Handler
import android.os.Looper
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject

class ChatClient(
    private val client: OkHttpClient,
    private val onStatus: (Boolean) -> Unit,
    private val onMessage: (ChatMessage) -> Unit
) {
    private val main = Handler(Looper.getMainLooper())
    private var socket: WebSocket? = null
    private var roomId: Long? = null
    private var reconnect: Runnable? = null
    private var active = false

    fun connect(newRoomId: Long?) {
        disconnect()
        if (newRoomId == null) return
        active = true
        roomId = newRoomId
        open(newRoomId)
    }

    fun disconnect() {
        active = false
        reconnect?.let(main::removeCallbacks)
        reconnect = null
        socket?.close(1000, null)
        socket = null
        roomId = null
        onStatus(false)
    }

    private fun open(id: Long) {
        val request = Request.Builder()
            .url("wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false")
            .build()
        socket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) {
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
                        event == "pusher_internal:subscription_succeeded" -> main.post { onStatus(true) }
                        event == "pusher:ping" -> webSocket.send(JSONObject().put("event", "pusher:pong").put("data", JSONObject()).toString())
                        event.contains("ChatMessage") -> parseMessage(packet)?.let { message -> main.post { onMessage(message) } }
                    }
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) = scheduleReconnect(id)
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) = scheduleReconnect(id)
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

    private fun scheduleReconnect(id: Long) {
        main.post {
            if (!active || roomId != id) return@post
            onStatus(false)
            reconnect?.let(main::removeCallbacks)
            reconnect = Runnable { if (active && roomId == id) open(id) }
            main.postDelayed(reconnect!!, 3500)
        }
    }
}
