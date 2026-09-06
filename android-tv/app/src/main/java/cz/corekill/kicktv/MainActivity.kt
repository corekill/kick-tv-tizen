package cz.corekill.kicktv

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.text.TextUtils
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONObject
import java.util.Locale

@UnstableApi
class MainActivity : AppCompatActivity() {
    private val handler = Handler(Looper.getMainLooper())
    private val api = KickApi()
    private lateinit var store: HistoryStore
    private lateinit var chatLayouts: MutableList<ChatLayout>
    private lateinit var chatClient: ChatClient
    private lateinit var emoteRepository: EmoteRepository
    private lateinit var player: ExoPlayer
    private lateinit var trackSelector: DefaultTrackSelector

    private lateinit var home: View
    private lateinit var playerScreen: View
    private lateinit var searchInput: EditText
    private lateinit var searchStatus: TextView
    private lateinit var resultsSection: View
    private lateinit var recentEmpty: View
    private lateinit var resultsAdapter: ChannelAdapter
    private lateinit var recentAdapter: ChannelAdapter
    private lateinit var playerView: PlayerView
    private lateinit var offlinePanel: View
    private lateinit var playerStateBadge: TextView
    private lateinit var playerStateTitle: TextView
    private lateinit var playerStateDetail: TextView
    private lateinit var playerHud: View
    private lateinit var nowPlaying: TextView
    private lateinit var chatPanel: LinearLayout
    private lateinit var chatTitle: TextView
    private lateinit var chatStatus: TextView
    private lateinit var chatDivider: View
    private lateinit var chatWebView: WebView
    private lateinit var chatEditor: View
    private lateinit var editorSubtitle: TextView
    private lateinit var editorRows: LinearLayout
    private lateinit var sparkles: SparkleView

    private var searchRun: Runnable? = null
    private var offlinePoll: Runnable? = null
    private var hudHide: Runnable? = null
    private var currentSlug = ""
    private var currentName = ""
    private var currentDetails: ChannelDetails? = null
    private var chatMode = 0
    private var chatRoomId: Long? = null
    private var chatConnected = false
    private var chatPageReady = false
    private val chatLog = mutableListOf<ChatMessage>()
    private var emotes: Map<String, String> = emptyMap()
    private var emotesRequested = false
    private var chatEditorOpen = false
    private var editorPreset = 0
    private var editorIndex = 0
    private var editorPreviousMode = 0
    private var editorOriginal: List<ChatLayout> = emptyList()
    private var loadingGeneration = 0
    private val secretKeys = ArrayDeque<Int>()
    private var hiddenTaps = 0
    private var lastHiddenTap = 0L

    override fun attachBaseContext(newBase: Context) {
        val current = Locale.getDefault().language
        val locale = Locale(if (current == "cs") "cs" else "en")
        val config = Configuration(newBase.resources.configuration)
        config.setLocale(locale)
        super.attachBaseContext(newBase.createConfigurationContext(config))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            )
        setContentView(R.layout.activity_main)
        store = HistoryStore(this)
        chatLayouts = store.chatLayouts()
        bindViews()
        setupPlayer()
        setupChatView()
        emoteRepository = EmoteRepository(api.client)
        chatClient = ChatClient(api.client, ::setChatConnected, ::appendChatMessage)
        setupLists()
        setupSearch()
        renderHistory()
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN)
        searchInput.setShowSoftInputOnFocus(false)
        searchInput.requestFocus()
    }

    private fun bindViews() {
        home = findViewById(R.id.home)
        playerScreen = findViewById(R.id.playerScreen)
        searchInput = findViewById(R.id.searchInput)
        searchStatus = findViewById(R.id.searchStatus)
        resultsSection = findViewById(R.id.resultsSection)
        recentEmpty = findViewById(R.id.recentEmpty)
        playerView = findViewById(R.id.playerView)
        offlinePanel = findViewById(R.id.offlinePanel)
        playerStateBadge = findViewById(R.id.playerStateBadge)
        playerStateTitle = findViewById(R.id.playerStateTitle)
        playerStateDetail = findViewById(R.id.playerStateDetail)
        playerHud = findViewById(R.id.playerHud)
        nowPlaying = findViewById(R.id.nowPlaying)
        chatPanel = findViewById(R.id.chatPanel)
        chatTitle = findViewById(R.id.chatTitle)
        chatStatus = findViewById(R.id.chatStatus)
        chatDivider = findViewById(R.id.chatDivider)
        chatWebView = findViewById(R.id.chatWebView)
        chatEditor = findViewById(R.id.chatEditor)
        editorSubtitle = findViewById(R.id.editorSubtitle)
        editorRows = findViewById(R.id.editorRows)
        sparkles = findViewById(R.id.sparkles)
        findViewById<View>(R.id.heroBadge).setOnClickListener {
            val now = System.currentTimeMillis()
            hiddenTaps = if (now - lastHiddenTap < 650) hiddenTaps + 1 else 1
            lastHiddenTap = now
            if (hiddenTaps >= 7) {
                sparkles.burst()
                hiddenTaps = 0
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupChatView() {
        chatWebView.setBackgroundColor(Color.TRANSPARENT)
        chatWebView.isFocusable = false
        chatWebView.isClickable = false
        chatWebView.settings.apply {
            javaScriptEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            loadsImagesAutomatically = true
            mediaPlaybackRequiresUserGesture = false
        }
        chatWebView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                chatPageReady = true
                syncChatPage()
            }
        }
        resetChatPage()
    }

    private fun setupPlayer() {
        trackSelector = DefaultTrackSelector(this)
        val http = DefaultHttpDataSource.Factory()
            .setUserAgent("KickTV-Android/0.1")
            .setDefaultRequestProperties(mapOf("Origin" to "https://kick.com", "Referer" to "https://kick.com/"))
        player = ExoPlayer.Builder(this, DefaultRenderersFactory(this))
            .setTrackSelector(trackSelector)
            .setMediaSourceFactory(DefaultMediaSourceFactory(this).setDataSourceFactory(http))
            .build()
        playerView.player = player
        playerView.useController = false
        playerView.setKeepContentOnPlayerReset(false)
        playerView.setShutterBackgroundColor(ContextCompat.getColor(this, R.color.ink))
        playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                if (state == Player.STATE_READY) {
                    offlinePanel.isVisible = false
                    showHudTemporarily()
                } else if (state == Player.STATE_BUFFERING && currentDetails?.isLive == true) {
                    showState("KICK TV", getString(R.string.loading_stream), "")
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                showState("!", getString(R.string.stream_error), error.errorCodeName)
            }
        })
    }

    private fun setupLists() {
        resultsAdapter = ChannelAdapter { openChannel(it.slug) }
        recentAdapter = ChannelAdapter { openChannel(it.slug) }
        findViewById<RecyclerView>(R.id.resultsList).apply {
            layoutManager = LinearLayoutManager(this@MainActivity, RecyclerView.HORIZONTAL, false)
            adapter = resultsAdapter
        }
        findViewById<RecyclerView>(R.id.recentList).apply {
            layoutManager = LinearLayoutManager(this@MainActivity, RecyclerView.HORIZONTAL, false)
            adapter = recentAdapter
        }
    }

    private fun setupSearch() {
        searchInput.setOnClickListener {
            searchInput.setShowSoftInputOnFocus(true)
            (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).showSoftInput(searchInput, InputMethodManager.SHOW_IMPLICIT)
        }
        findViewById<Button>(R.id.watchButton).setOnClickListener { openChannel(searchInput.text.toString()) }
        searchInput.setOnEditorActionListener { _, action, _ ->
            if (action == EditorInfo.IME_ACTION_DONE) {
                openChannel(searchInput.text.toString())
                true
            } else false
        }
        searchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = queueSearch(s?.toString().orEmpty())
            override fun afterTextChanged(s: Editable?) = Unit
        })
    }

    private fun queueSearch(raw: String) {
        searchRun?.let(handler::removeCallbacks)
        val query = raw.trim()
        if (query.length < 2) {
            searchStatus.text = ""
            resultsSection.isVisible = false
            resultsAdapter.submit(emptyList())
            return
        }
        searchStatus.setText(R.string.searching)
        resultsSection.isVisible = true
        val fallback = ChannelCard(cleanSlug(query), query.removePrefix("@"), category = "Kick")
        resultsAdapter.submit(listOf(fallback))
        searchRun = Runnable {
            api.search(query) { result ->
                if (searchInput.text.toString().trim() != query) return@search
                val remote = result.getOrDefault(emptyList())
                val merged = (remote + fallback).distinctBy { it.slug }.take(8)
                resultsAdapter.submit(merged)
                searchStatus.text = ""
            }
        }
        handler.postDelayed(searchRun!!, 350)
    }

    private fun renderHistory() {
        val slugs = store.recent()
        recentEmpty.isVisible = slugs.isEmpty()
        val cards = slugs.map { ChannelCard(it, it, category = getString(R.string.searching)) }.toMutableList()
        recentAdapter.submit(cards)
        slugs.forEachIndexed { index, slug ->
            api.channel(slug) { result ->
                val details = result.getOrNull() ?: return@channel
                if (index >= cards.size || cards[index].slug != slug) return@channel
                cards[index] = details.toCard()
                recentAdapter.submit(cards.toList())
            }
        }
    }

    private fun openChannel(raw: String) {
        val slug = cleanSlug(raw)
        if (slug.isBlank()) return
        loadingGeneration++
        val generation = loadingGeneration
        currentSlug = slug
        currentName = slug
        currentDetails = null
        chatRoomId = null
        chatConnected = false
        emotes = emptyMap()
        emotesRequested = false
        store.remember(slug)
        (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(searchInput.windowToken, 0)
        searchInput.setShowSoftInputOnFocus(false)
        searchInput.clearFocus()
        player.stop()
        player.clearMediaItems()
        home.isVisible = false
        playerScreen.isVisible = true
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        nowPlaying.text = slug
        chatMode = store.chatMode(slug) ?: 0
        applyChatMode()
        clearChat()
        chatClient.disconnect()
        showState("KICK TV", getString(R.string.loading_stream), "")
        requestChannel(slug, generation, false)
    }

    private fun requestChannel(slug: String, generation: Int, polling: Boolean) {
        api.channel(slug) { result ->
            if (generation != loadingGeneration || slug != currentSlug || !playerScreen.isVisible) return@channel
            result.onSuccess { details ->
                currentDetails = details
                currentName = details.name
                nowPlaying.text = if (details.isLive) {
                    "${details.name} · ${details.viewers} ${getString(R.string.viewers)} · ${details.category}"
                } else details.name
                if (details.roomId != null && chatRoomId != details.roomId) {
                    chatRoomId = details.roomId
                    chatClient.connect(details.roomId)
                }
                if (!emotesRequested) {
                    emotesRequested = true
                    emoteRepository.load(details.userId) { loaded ->
                        if (generation == loadingGeneration && slug == currentSlug) {
                            emotes = loaded
                            updateChatStatus()
                            resetChatPage()
                        }
                    }
                }
                if (details.isLive && details.playbackUrl != null) startPlayback(details.playbackUrl)
                else showOffline(details, generation)
            }.onFailure {
                showState("!", getString(R.string.stream_error), it.message.orEmpty())
                scheduleOfflinePoll(slug, generation)
            }
        }
    }

    private fun startPlayback(url: String) {
        offlinePoll?.let(handler::removeCallbacks)
        offlinePoll = null
        showState("LIVE", getString(R.string.loading_stream), "")
        player.setMediaItem(MediaItem.fromUri(url))
        player.prepare()
        player.playWhenReady = true
    }

    private fun showOffline(details: ChannelDetails, generation: Int) {
        player.stop()
        player.clearMediaItems()
        if (store.chatMode(details.slug) == null) {
            chatMode = 1
            applyChatMode()
        }
        showState("OFFLINE", getString(R.string.offline_title, details.name), getString(R.string.offline_detail))
        scheduleOfflinePoll(details.slug, generation)
    }

    private fun scheduleOfflinePoll(slug: String, generation: Int) {
        offlinePoll?.let(handler::removeCallbacks)
        offlinePoll = Runnable { requestChannel(slug, generation, true) }
        handler.postDelayed(offlinePoll!!, 10_000)
    }

    private fun showState(badge: String, title: String, detail: String) {
        offlinePanel.isVisible = true
        playerStateBadge.text = badge
        val isOffline = badge == "OFFLINE" || badge == "!"
        playerStateBadge.background = ContextCompat.getDrawable(this, if (isOffline) R.drawable.bg_badge_offline else R.drawable.bg_badge_live)
        playerStateBadge.setTextColor(ContextCompat.getColor(this, if (isOffline) R.color.muted else R.color.kick_green))
        playerStateTitle.text = title
        playerStateDetail.text = detail
    }

    private fun clearChat() {
        chatLog.clear()
        chatConnected = false
        resetChatPage()
        chatStatus.setText(R.string.connecting)
    }

    private fun setChatConnected(connected: Boolean) {
        chatConnected = connected
        updateChatStatus()
        chatStatus.setTextColor(ContextCompat.getColor(this, if (connected) R.color.kick_green else R.color.muted))
    }

    private fun updateChatStatus() {
        chatStatus.text = when {
            !chatConnected -> getString(R.string.connecting)
            emotes.isNotEmpty() -> getString(R.string.connected_7tv, emotes.size)
            else -> getString(R.string.connected)
        }
    }

    private fun appendChatMessage(message: ChatMessage) {
        chatLog.add(message)
        while (chatLog.size > 35) chatLog.removeAt(0)
        if (chatPageReady) chatWebView.evaluateJavascript("window.addMessage(${JSONObject.quote(messageHtml(message))});", null)
    }

    private fun resetChatPage() {
        chatPageReady = false
        val empty = html(getString(R.string.chat_empty))
        val bodyClass = if (chatMode >= 2) "compact" else ""
        val cssDensity = resources.displayMetrics.density.coerceAtLeast(1f)
        val targetFont = if (chatMode >= 2) chatLayouts[(chatMode - 2).coerceIn(0, 2)].font else 18
        val fontSize = targetFont / cssDensity
        val fullEmote = 34f / cssDensity
        val compactEmote = (targetFont + 14f) / cssDensity
        val page = """
            <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
            <style>
            html,body{margin:0;padding:0;width:100%;height:100%;background:transparent;color:#f7fafc;font-family:sans-serif;overflow:hidden}
            #wrap{box-sizing:border-box;min-height:100%;display:flex;flex-direction:column;justify-content:flex-end;padding:12px 0 2px}
            #empty{position:absolute;left:0;right:0;top:48%;text-align:center;color:#9aa5b1;font-size:${16f / cssDensity}px}
            .msg{font-size:${18f / cssDensity}px;line-height:1.28;padding:${4f / cssDensity}px 0;overflow-wrap:anywhere}.name{font-weight:800;margin-right:${8f / cssDensity}px}
            .emote{display:inline-block;width:auto;height:${fullEmote}px;vertical-align:middle;margin:0 ${2f / cssDensity}px;object-fit:contain}
            body.compact #wrap{padding:0}body.compact #empty{display:none!important}
            body.compact .msg{font-size:${fontSize}px;line-height:1.22;padding:${3f / cssDensity}px 0;text-shadow:0 2px 3px #000,0 0 7px #000}
            body.compact .emote{height:${compactEmote}px;filter:drop-shadow(0 2px 3px #000)}
            </style></head><body class="$bodyClass"><div id="wrap"><div id="empty">$empty</div><div id="messages"></div></div>
            <script>
            const box=document.getElementById('messages'),empty=document.getElementById('empty');
            window.setMessages=function(value){box.innerHTML=value;empty.style.display=value?'none':'block';window.scrollTo(0,document.body.scrollHeight)};
            window.addMessage=function(value){box.insertAdjacentHTML('beforeend',value);empty.style.display='none';while(box.children.length>35)box.firstElementChild.remove();window.scrollTo(0,document.body.scrollHeight)};
            </script></body></html>
        """.trimIndent()
        chatWebView.loadDataWithBaseURL("https://kick.com/", page, "text/html", "UTF-8", null)
    }

    private fun syncChatPage() {
        if (!chatPageReady) return
        chatWebView.evaluateJavascript("window.setMessages(${JSONObject.quote(chatLog.joinToString("") { messageHtml(it) })});", null)
    }

    private fun messageHtml(message: ChatMessage): String {
        val color = message.color?.takeIf { Regex("^#[0-9a-fA-F]{6}$").matches(it) } ?: "#53fc18"
        return "<div class=\"msg\"><span class=\"name\" style=\"color:$color\">${html(message.username)}</span><span>${contentHtml(message.content)}</span></div>"
    }

    private fun contentHtml(content: String): String {
        val kick = Regex("\\[emote:(\\d+):([^]]+)]")
        val out = StringBuilder()
        var cursor = 0
        kick.findAll(content).forEach { match ->
            out.append(sevenTvHtml(content.substring(cursor, match.range.first)))
            val id = match.groupValues[1]
            val name = html(match.groupValues[2])
            out.append("<img class=\"emote\" src=\"https://files.kick.com/emotes/$id/fullsize\" alt=\"$name\" title=\"$name\">")
            cursor = match.range.last + 1
        }
        out.append(sevenTvHtml(content.substring(cursor)))
        return out.toString()
    }

    private fun sevenTvHtml(value: String): String = Regex("\\s+|\\S+").findAll(value).joinToString("") { token ->
        val url = emotes[token.value]
        if (url == null) html(token.value)
        else "<img class=\"emote\" src=\"${html(url)}\" alt=\"${html(token.value)}\" title=\"${html(token.value)}\">"
    }

    private fun html(value: String): String = TextUtils.htmlEncode(value)

    private fun cycleChat() {
        chatMode = (chatMode + 1) % 5
        store.rememberChatMode(currentSlug, chatMode)
        applyChatMode()
        showHudTemporarily()
    }

    private fun applyChatMode() {
        val screenWidth = resources.displayMetrics.widthPixels
        val screenHeight = resources.displayMetrics.heightPixels
        val fullChatWidth = (screenWidth * 0.34f).toInt()
        val preset = if (chatMode >= 2) chatLayouts[(chatMode - 2).coerceIn(0, 2)] else null
        chatPanel.isVisible = chatMode != 0
        chatTitle.isVisible = chatMode == 1
        chatStatus.isVisible = chatMode == 1
        chatDivider.isVisible = chatMode == 1
        chatPanel.setBackgroundColor(if (chatMode == 1) Color.argb(233, 11, 16, 22) else Color.TRANSPARENT)
        val offlineParams = offlinePanel.layoutParams as FrameLayout.LayoutParams
        offlineParams.width = if (chatMode == 1) screenWidth - fullChatWidth else ViewGroup.LayoutParams.MATCH_PARENT
        offlineParams.gravity = Gravity.START or Gravity.CENTER_VERTICAL
        offlineParams.setMargins(0, 0, 0, 0)
        offlinePanel.layoutParams = offlineParams
        if (chatMode == 0) return
        val params = chatPanel.layoutParams as FrameLayout.LayoutParams
        if (chatMode == 1) {
            params.width = fullChatWidth
            params.height = ViewGroup.LayoutParams.MATCH_PARENT
            params.gravity = Gravity.END
            params.setMargins(0, 0, 0, 0)
            chatPanel.setPadding(dp(15), dp(17), dp(15), dp(12))
        } else {
            params.width = (screenWidth * (preset!!.width / 100f)).toInt()
            params.height = (screenHeight * (preset.height / 100f)).toInt()
            params.gravity = Gravity.END or Gravity.BOTTOM
            params.setMargins(
                0,
                0,
                (screenWidth * (preset.right / 100f)).toInt(),
                (screenHeight * (preset.bottom / 100f)).toInt()
            )
            chatPanel.setPadding(0, 0, 0, 0)
        }
        chatPanel.layoutParams = params
        chatWebView.settings.textZoom = 100
        resetChatPage()
    }

    private fun openChatEditor() {
        editorPreviousMode = chatMode
        editorPreset = if (chatMode >= 2) chatMode - 2 else 0
        editorIndex = 0
        editorOriginal = chatLayouts.map { it.copy() }
        chatEditorOpen = true
        chatEditor.isVisible = true
        playerHud.isVisible = false
        chatMode = editorPreset + 2
        applyChatMode()
        renderChatEditor()
    }

    private fun closeChatEditor(save: Boolean) {
        if (save) {
            store.rememberChatLayouts(chatLayouts)
            Toast.makeText(this, R.string.saved, Toast.LENGTH_SHORT).show()
        } else {
            chatLayouts = editorOriginal.map { it.copy() }.toMutableList()
        }
        chatEditorOpen = false
        chatEditor.isVisible = false
        chatMode = editorPreviousMode
        applyChatMode()
        showHudTemporarily()
    }

    private fun renderChatEditor() {
        editorSubtitle.text = getString(R.string.layout_subtitle, editorPreset + 1)
        val layout = chatLayouts[editorPreset]
        val labels = intArrayOf(
            R.string.field_preset,
            R.string.field_right,
            R.string.field_bottom,
            R.string.field_width,
            R.string.field_height,
            R.string.field_font
        )
        val values = arrayOf(
            getString(R.string.preset, editorPreset + 1),
            "${layout.right}%",
            "${layout.bottom}%",
            "${layout.width}%",
            "${layout.height}%",
            "${layout.font}"
        )
        editorRows.removeAllViews()
        labels.forEachIndexed { index, label ->
            editorRows.addView(TextView(this).apply {
                text = "${if (index == editorIndex) "›" else " "} ${getString(label)}     ‹ ${values[index]} ›"
                textSize = 9f
                setTextColor(ContextCompat.getColor(this@MainActivity, if (index == editorIndex) R.color.kick_green else R.color.white))
                setBackgroundColor(if (index == editorIndex) Color.argb(30, 83, 252, 24) else Color.TRANSPARENT)
                setPadding(dp(7), dp(6), dp(7), dp(6))
                layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            })
        }
    }

    private fun moveEditor(direction: Int) {
        editorIndex = (editorIndex + direction + 6) % 6
        renderChatEditor()
    }

    private fun adjustEditor(direction: Int) {
        if (editorIndex == 0) {
            editorPreset = (editorPreset + direction + 3) % 3
            chatMode = editorPreset + 2
        } else {
            val layout = chatLayouts[editorPreset]
            when (editorIndex) {
                1 -> layout.right += direction * 2
                2 -> layout.bottom += direction * 2
                3 -> layout.width += direction * 2
                4 -> layout.height += direction * 3
                5 -> layout.font += direction
            }
            normaliseLayout(layout)
        }
        applyChatMode()
        renderChatEditor()
    }

    private fun normaliseLayout(layout: ChatLayout) {
        layout.width = layout.width.coerceIn(18, 50)
        layout.height = layout.height.coerceIn(25, 80)
        layout.right = layout.right.coerceIn(1, 96 - layout.width)
        layout.bottom = layout.bottom.coerceIn(1, 96 - layout.height)
        layout.font = layout.font.coerceIn(12, 26)
    }

    private fun showQualityDialog() {
        val labels = arrayOf(
            getString(R.string.quality_auto), getString(R.string.quality_1080),
            getString(R.string.quality_720), getString(R.string.quality_480), getString(R.string.quality_360)
        )
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(15), dp(13), dp(15), dp(15))
            setBackgroundResource(R.drawable.bg_panel)
        }
        content.addView(TextView(this).apply {
            setText(R.string.quality)
            setTextColor(ContextCompat.getColor(this@MainActivity, R.color.white))
            textSize = 15f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setPadding(dp(4), 0, dp(4), dp(9))
        })
        val dialog = AlertDialog.Builder(this).setView(content).create()
        labels.forEachIndexed { which, label ->
            content.addView(TextView(this).apply {
                text = label
                textSize = 11f
                gravity = Gravity.CENTER_VERTICAL
                isFocusable = true
                isClickable = true
                setTextColor(ContextCompat.getColor(this@MainActivity, R.color.white))
                setBackgroundResource(R.drawable.bg_quality_item)
                setPadding(dp(11), 0, dp(11), 0)
                layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(32)).apply {
                    if (which > 0) topMargin = dp(4)
                }
                setOnClickListener {
                    val size = when (which) {
                        1 -> 1920 to 1080
                        2 -> 1280 to 720
                        3 -> 854 to 480
                        4 -> 640 to 360
                        else -> Int.MAX_VALUE to Int.MAX_VALUE
                    }
                    trackSelector.setParameters(trackSelector.buildUponParameters().setMaxVideoSize(size.first, size.second))
                    dialog.dismiss()
                    showHudTemporarily()
                }
            })
        }
        dialog.setOnShowListener {
            dialog.window?.apply {
                setBackgroundDrawableResource(android.R.color.transparent)
                setLayout(dp(310), WindowManager.LayoutParams.WRAP_CONTENT)
            }
            content.getChildAt(1)?.requestFocus()
        }
        dialog.show()
    }

    private fun showHudTemporarily() {
        hudHide?.let(handler::removeCallbacks)
        playerHud.isVisible = true
        hudHide = Runnable { if (player.isPlaying) playerHud.isVisible = false }
        handler.postDelayed(hudHide!!, 4500)
    }

    private fun returnHome() {
        loadingGeneration++
        offlinePoll?.let(handler::removeCallbacks)
        hudHide?.let(handler::removeCallbacks)
        player.stop()
        player.clearMediaItems()
        chatClient.disconnect()
        chatRoomId = null
        playerScreen.isVisible = false
        home.isVisible = true
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        renderHistory()
        searchInput.setShowSoftInputOnFocus(false)
        searchInput.requestFocus()
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) trackSecret(event.keyCode)
        if (!playerScreen.isVisible || event.action != KeyEvent.ACTION_DOWN) return super.dispatchKeyEvent(event)
        if (chatEditorOpen) {
            return when (event.keyCode) {
                KeyEvent.KEYCODE_DPAD_UP -> { moveEditor(-1); true }
                KeyEvent.KEYCODE_DPAD_DOWN -> { moveEditor(1); true }
                KeyEvent.KEYCODE_DPAD_LEFT -> { adjustEditor(-1); true }
                KeyEvent.KEYCODE_DPAD_RIGHT -> { adjustEditor(1); true }
                KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER -> { closeChatEditor(true); true }
                KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_ESCAPE -> { closeChatEditor(false); true }
                else -> true
            }
        }
        showHudTemporarily()
        return when (event.keyCode) {
            KeyEvent.KEYCODE_DPAD_UP -> { showQualityDialog(); true }
            KeyEvent.KEYCODE_DPAD_DOWN -> { openChatEditor(); true }
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER -> { cycleChat(); true }
            KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> { if (player.isPlaying) player.pause() else player.play(); true }
            KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_ESCAPE -> { returnHome(); true }
            else -> super.dispatchKeyEvent(event)
        }
    }

    private fun trackSecret(keyCode: Int) {
        val pattern = intArrayOf(
            KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_UP,
            KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT,
            KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT
        )
        secretKeys.addLast(keyCode)
        while (secretKeys.size > pattern.size) secretKeys.removeFirst()
        if (secretKeys.size == pattern.size && secretKeys.toIntArray().contentEquals(pattern)) {
            sparkles.burst()
            secretKeys.clear()
        }
    }

    private fun cleanSlug(value: String): String = value.trim().lowercase(Locale.US)
        .replace(Regex("^https?://(www\\.)?kick\\.com/"), "")
        .replace(Regex("[?#].*$"), "")
        .removePrefix("@")
        .replace(Regex("[^a-z0-9_-]"), "")

    private fun ChannelDetails.toCard() = ChannelCard(
        slug = slug,
        name = name,
        isLive = isLive,
        viewers = viewers,
        category = category,
        profileUrl = profileUrl
    )

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    override fun onDestroy() {
        loadingGeneration++
        handler.removeCallbacksAndMessages(null)
        chatClient.disconnect()
        chatWebView.destroy()
        player.release()
        super.onDestroy()
    }
}
