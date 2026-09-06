package cz.corekill.kicktv

data class ChannelCard(
    val slug: String,
    val name: String,
    val isLive: Boolean = false,
    val viewers: Int = 0,
    val followers: Int = 0,
    val category: String = "Kick",
    val profileUrl: String = ""
)

data class ChannelDetails(
    val slug: String,
    val name: String,
    val isLive: Boolean,
    val playbackUrl: String?,
    val roomId: Long?,
    val userId: Long?,
    val viewers: Int,
    val category: String,
    val profileUrl: String
)

data class ChatMessage(
    val username: String,
    val color: String?,
    val content: String
)

data class ChatLayout(
    var right: Int,
    var bottom: Int,
    var width: Int,
    var height: Int,
    var font: Int
)
