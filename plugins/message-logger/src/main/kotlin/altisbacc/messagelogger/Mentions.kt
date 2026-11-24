package altisbacc.messagelogger

import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.TextPaint
import android.text.TextUtils
import android.text.style.CharacterStyle
import android.text.style.UpdateAppearance

private const val MENTION_START = '\uE0A5'
private const val MENTION_SEPARATOR = '\uE0A6'
private const val MENTION_END = '\uE0A7'

internal fun SpannableStringBuilder.styleMentions() {
    if (TextUtils.indexOf(this, MENTION_START) < 0) return

    while (true) {
        val text = toString()
        val start = text.lastIndexOf(MENTION_START)
        if (start < 0) return

        val separator = text.indexOf(MENTION_SEPARATOR, start)
        val end = text.indexOf(MENTION_END, start)
        if (separator !in 0..end) {
            delete(start, start + 1)
            continue
        }

        val color = text.substring(start + 1, separator).toIntOrNull()
        delete(end, end + 1)
        delete(start, separator + 1)

        val mentionEnd = start + end - separator - 1
        if (color != null) setSpan(MentionColorSpan(color), start, mentionEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    }
}

private class MentionColorSpan(private val color: Int) : CharacterStyle(), UpdateAppearance {
    override fun updateDrawState(paint: TextPaint) {
        paint.color = color
        paint.shader = null
    }
}
