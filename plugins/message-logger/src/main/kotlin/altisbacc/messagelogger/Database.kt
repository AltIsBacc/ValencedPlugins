package altisbacc.messagelogger

import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteStatement
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.OutputStream

internal class MessageDatabase(val file: File) {
    private val lock = Any()
    private val db: SQLiteDatabase

    init {
        file.parentFile?.mkdirs()
        db = SQLiteDatabase.openOrCreateDatabase(file, null)
        db.setForeignKeyConstraintsEnabled(true)
    }

    fun execute(queriesJson: String): String = synchronized(lock) {
        val queries = JSONArray(queriesJson)
        val results = JSONArray()

        db.beginTransaction()
        try {
            for (index in 0 until queries.length()) results.put(runQuery(queries.getJSONObject(index)))
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }

        results.toString()
    }

    fun copyTo(target: OutputStream) = synchronized(lock) {
        file.inputStream().use { it.copyTo(target) }
    }

    fun close() = synchronized(lock) { db.close() }

    private fun runQuery(query: JSONObject): JSONObject {
        val sql = query.getString("sql")
        val params = query.getJSONArray("params")
        val rows = JSONArray()

        if (query.getString("method") == "run") {
            db.compileStatement(sql).use { statement ->
                statement.bindAll(params)
                statement.execute()
            }
        } else {
            val args = Array(params.length()) { index -> params.get(index).takeUnless { it === JSONObject.NULL }?.toString() }
            db.rawQuery(sql, args).use { cursor ->
                val single = query.getString("method") == "get"
                while (cursor.moveToNext()) {
                    val row = cursor.toRow()
                    if (single) return JSONObject().put("rows", row)
                    rows.put(row)
                }
                if (single) return JSONObject().put("rows", JSONArray())
            }
        }

        return JSONObject().put("rows", rows)
    }
}

private fun SQLiteStatement.bindAll(params: JSONArray) {
    for (index in 0 until params.length()) {
        val position = index + 1
        when (val value = params.get(index)) {
            JSONObject.NULL -> bindNull(position)
            is Boolean -> bindLong(position, if (value) 1 else 0)
            is Int -> bindLong(position, value.toLong())
            is Long -> bindLong(position, value)
            is Number -> bindDouble(position, value.toDouble())
            else -> bindString(position, value.toString())
        }
    }
}

private fun Cursor.toRow(): JSONArray {
    val row = JSONArray()
    for (column in 0 until columnCount) {
        when (getType(column)) {
            Cursor.FIELD_TYPE_NULL -> row.put(JSONObject.NULL)
            Cursor.FIELD_TYPE_INTEGER -> row.put(getLong(column))
            Cursor.FIELD_TYPE_FLOAT -> row.put(getDouble(column))
            Cursor.FIELD_TYPE_BLOB -> row.put(JSONObject.NULL)
            else -> row.put(getString(column))
        }
    }
    return row
}
