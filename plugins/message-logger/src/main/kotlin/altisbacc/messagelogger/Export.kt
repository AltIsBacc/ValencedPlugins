package altisbacc.messagelogger

import android.app.AndroidAppHelper
import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Suppress("DEPRECATION")
internal fun MessageDatabase.exportToDownloads(): String {
    val name = "msglogger-${SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(Date())}.db"

    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        val directory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        check(directory.isDirectory || directory.mkdirs()) { "Downloads folder is unavailable" }
        val target = File(directory, name)
        target.outputStream().use { this.copyTo(it) }
        return target.absolutePath
    }

    val resolver = checkNotNull(AndroidAppHelper.currentApplication()) { "No application context" }.contentResolver
    val values = ContentValues().apply {
        put(MediaStore.Downloads.DISPLAY_NAME, name)
        put(MediaStore.Downloads.MIME_TYPE, "application/octet-stream")
        put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
        put(MediaStore.Downloads.IS_PENDING, 1)
    }

    val uri = checkNotNull(resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)) {
        "Unable to create the export file"
    }

    try {
        checkNotNull(resolver.openOutputStream(uri)) { "Unable to write the export file" }.use { this.copyTo(it) }
        resolver.update(uri, ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) }, null, null)
    } catch (error: Throwable) {
        resolver.delete(uri, null, null)
        throw error
    }

    return "Downloads/$name"
}
