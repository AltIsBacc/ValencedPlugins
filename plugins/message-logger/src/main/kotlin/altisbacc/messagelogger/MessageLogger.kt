@file:JvmName("MessageLogger")

package altisbacc.messagelogger

import app.valenced.bridge.asDelegate
import app.valenced.plugins.plugin
import app.valenced.xposed.api.registerNativeAsyncMethod
import app.valenced.xposed.api.registerNativeMethod
import java.io.File

private const val DATABASE_FILE = "msglogger.db"

@Suppress("UNUSED")
val messageLogger = plugin {
    var hooks: LoggerHooks? = null
    var database: MessageDatabase? = null

    start {
        hooks = LoggerHooks(dexFinder)
        val opened = MessageDatabase(File(storageDir, DATABASE_FILE)).also { database = it }

        registerNativeMethod("altisbacc.message-logger.setDimmed") { args ->
            hooks?.setDimmed(args[0] as String, args[1] as Boolean)
            null
        }

        registerNativeMethod("altisbacc.message-logger.clear") {
            hooks?.clear()
            null
        }

        registerNativeAsyncMethod("altisbacc.message-logger.sql") { args ->
            val queries by args.asDelegate().string()
            opened.execute(queries)
        }

        registerNativeAsyncMethod("altisbacc.message-logger.export") {
            opened.exportToDownloads()
        }
    }

    stop {
        hooks?.dispose()
        hooks = null
        database?.close()
        database = null
    }
}
