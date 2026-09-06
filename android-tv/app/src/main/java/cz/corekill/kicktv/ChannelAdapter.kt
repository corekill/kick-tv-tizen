package cz.corekill.kicktv

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import java.util.Locale

class ChannelAdapter(
    private val onClick: (ChannelCard) -> Unit
) : RecyclerView.Adapter<ChannelAdapter.Holder>() {
    private val items = mutableListOf<ChannelCard>()

    fun submit(values: List<ChannelCard>) {
        items.clear()
        items.addAll(values)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        return Holder(LayoutInflater.from(parent.context).inflate(R.layout.item_channel, parent, false))
    }

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: Holder, position: Int) = holder.bind(items[position])

    inner class Holder(view: View) : RecyclerView.ViewHolder(view) {
        private val avatar = view.findViewById<TextView>(R.id.channelAvatar)
        private val name = view.findViewById<TextView>(R.id.channelName)
        private val status = view.findViewById<TextView>(R.id.channelStatus)
        private val meta = view.findViewById<TextView>(R.id.channelMeta)

        init {
            view.setOnClickListener { bindingAdapterPosition.takeIf { it != RecyclerView.NO_POSITION }?.let { onClick(items[it]) } }
            view.setOnFocusChangeListener { target, focused ->
                target.animate().scaleX(if (focused) 1.045f else 1f).scaleY(if (focused) 1.045f else 1f).setDuration(120).start()
                target.elevation = if (focused) 18f else 0f
            }
        }

        fun bind(item: ChannelCard) {
            avatar.text = item.name.firstOrNull()?.uppercase(Locale.getDefault()) ?: "K"
            name.text = item.name
            if (item.isLive) {
                status.text = "● LIVE"
                status.setTextColor(ContextCompat.getColor(itemView.context, R.color.kick_green))
                avatar.background = ContextCompat.getDrawable(itemView.context, R.drawable.bg_badge_live)
                val audience = if (item.viewers > 0) "${compact(item.viewers)} ${itemView.context.getString(R.string.viewers)} · " else ""
                meta.text = audience + item.category
            } else {
                status.text = "○ OFFLINE"
                status.setTextColor(Color.parseColor("#9AA5B1"))
                avatar.background = ContextCompat.getDrawable(itemView.context, R.drawable.bg_badge_offline)
                meta.text = item.category
            }
        }

        private fun compact(value: Int): String = when {
            value >= 1_000_000 -> String.format(Locale.US, "%.1fM", value / 1_000_000f)
            value >= 1_000 -> String.format(Locale.US, "%.1fK", value / 1_000f)
            else -> value.toString()
        }
    }
}
