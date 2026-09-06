package cz.corekill.kicktv

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

class SparkleView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : View(context, attrs) {
    private data class Dot(val angle: Float, val speed: Float, val size: Float, val color: Int)
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var progress = 1f
    private val dots = List(38) {
        Dot(
            angle = Random.nextFloat() * 6.283f,
            speed = Random.nextFloat() * 0.55f + 0.45f,
            size = Random.nextFloat() * 7f + 3f,
            color = if (it % 3 == 0) Color.WHITE else Color.rgb(83, 252, 24)
        )
    }

    fun burst() {
        ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 950
            addUpdateListener {
                progress = it.animatedValue as Float
                invalidate()
            }
            start()
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (progress >= 1f) return
        val cx = width * 0.5f
        val cy = height * 0.5f
        dots.forEachIndexed { index, dot ->
            val distance = (80f + minOf(width, height) * 0.38f * progress) * dot.speed
            val wobble = sin(progress * 8f + index) * 18f
            val x = cx + cos(dot.angle) * distance + wobble
            val y = cy + sin(dot.angle) * distance - 85f * progress * progress
            paint.color = dot.color
            paint.alpha = ((1f - progress) * 235).toInt().coerceIn(0, 255)
            canvas.drawCircle(x, y, dot.size * (1f - progress * 0.35f), paint)
        }
    }
}
