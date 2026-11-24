package altisbacc.messagelogger

import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.TextPaint
import android.text.TextUtils
import android.text.style.CharacterStyle
import android.text.style.ForegroundColorSpan
import android.text.style.RelativeSizeSpan
import android.text.style.UpdateAppearance

private const val HISTORY_START = '\uE0A0'
private const val HISTORY_END = '\uE0A1'
private const val EDITED_START = '\uE0A2'
private const val EDITED_SEPARATOR = '\uE0A3'
private const val EDITED_END = '\uE0A4'

private const val HISTORY_ALPHA = 0.5f

private const val EDITED_SIZE = 0.75f

internal fun SpannableStringBuilder.styleHistory() {
    if (TextUtils.indexOf(this, HISTORY_START) < 0 && TextUtils.indexOf(this, EDITED_START) < 0) return

    while (true) {
        val text = toString()
        val start = maxOf(text.lastIndexOf(HISTORY_START), text.lastIndexOf(EDITED_START))
        if (start < 0) return

        if (text[start] == HISTORY_START) {
            val end = text.indexOf(HISTORY_END, start)
            if (end >= 0) delete(end, end + 1)
            delete(start, start + 1)

            val contentEnd = if (end >= 0) end - 1 else length
            setSpan(FadeSpan(HISTORY_ALPHA), start, contentEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            continue
        }

        val separator = text.indexOf(EDITED_SEPARATOR, start)
        val end = text.indexOf(EDITED_END, start)
        if (separator !in 0..end) {
            delete(start, start + 1)
            continue
        }

        val color = text.substring(start + 1, separator).toIntOrNull()
        delete(end, end + 1)
        delete(start, separator + 1)

        val labelEnd = start + end - separator - 1
        setSpan(RelativeSizeSpan(EDITED_SIZE), start, labelEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        if (color != null) setSpan(ForegroundColorSpan(color), start, labelEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    }
}

private class FadeSpan(private val alpha: Float) : CharacterStyle(), UpdateAppearance {
    override fun updateDrawState(paint: TextPaint) {
        paint.alpha = (paint.alpha * alpha).toInt()
    }
}
