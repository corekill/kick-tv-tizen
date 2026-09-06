package cz.corekill.kicktv

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

class HistoryStore(context: Context) {
    private val prefs = context.getSharedPreferences("kick_tv", Context.MODE_PRIVATE)

    fun recent(): List<String> {
        val raw = prefs.getString("recent", "[]") ?: "[]"
        return runCatching {
            val values = JSONArray(raw)
            buildList { for (i in 0 until values.length()) add(values.optString(i)) }
        }.getOrDefault(emptyList()).filter { it.isNotBlank() }
    }

    fun remember(slug: String) {
        val values = listOf(slug) + recent().filterNot { it == slug }
        val array = JSONArray()
        values.take(8).forEach(array::put)
        prefs.edit().putString("recent", array.toString()).apply()
    }

    fun chatMode(slug: String): Int? {
        val raw = prefs.getString("chat_modes", "{}") ?: "{}"
        return runCatching {
            val json = JSONObject(raw)
            if (json.has(slug)) json.optInt(slug).coerceIn(0, 4) else null
        }.getOrNull()
    }

    fun rememberChatMode(slug: String, mode: Int) {
        val json = runCatching { JSONObject(prefs.getString("chat_modes", "{}") ?: "{}") }.getOrElse { JSONObject() }
        json.put(slug, mode.coerceIn(0, 4))
        prefs.edit().putString("chat_modes", json.toString()).apply()
    }

    fun chatLayouts(): MutableList<ChatLayout> {
        val defaults = mutableListOf(
            ChatLayout(2, 4, 34, 36, 20),
            ChatLayout(62, 4, 34, 46, 20),
            ChatLayout(2, 55, 38, 39, 18)
        )
        val raw = prefs.getString("chat_layouts", null) ?: return defaults
        return runCatching {
            val array = JSONArray(raw)
            MutableList(3) { index ->
                val source = array.optJSONObject(index) ?: return@MutableList defaults[index]
                normaliseLayout(
                    ChatLayout(
                        source.optInt("right", defaults[index].right),
                        source.optInt("bottom", defaults[index].bottom),
                        source.optInt("width", defaults[index].width),
                        source.optInt("height", defaults[index].height),
                        source.optInt("font", defaults[index].font)
                    )
                )
            }
        }.getOrDefault(defaults)
    }

    fun rememberChatLayouts(layouts: List<ChatLayout>) {
        val array = JSONArray()
        layouts.take(3).forEach { layout ->
            val value = normaliseLayout(layout.copy())
            array.put(JSONObject().put("right", value.right).put("bottom", value.bottom).put("width", value.width).put("height", value.height).put("font", value.font))
        }
        prefs.edit().putString("chat_layouts", array.toString()).apply()
    }

    private fun normaliseLayout(layout: ChatLayout): ChatLayout {
        layout.width = layout.width.coerceIn(18, 50)
        layout.height = layout.height.coerceIn(25, 80)
        layout.right = layout.right.coerceIn(1, 96 - layout.width)
        layout.bottom = layout.bottom.coerceIn(1, 96 - layout.height)
        layout.font = layout.font.coerceIn(12, 26)
        return layout
    }
}
