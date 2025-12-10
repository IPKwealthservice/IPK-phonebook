package com.anonymous.Ipkphonebook.call

import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.provider.CallLog
import android.telecom.TelecomManager
import android.telephony.PhoneStateListener
import android.telephony.TelephonyManager
import android.os.Handler
import android.os.Looper
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule

@ReactModule(name = CallEventsModule.NAME)
class CallEventsModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  companion object {
    const val NAME = "CallEvents"
  }

  private val telephonyManager: TelephonyManager? =
    context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager

  private var lastState: Int = TelephonyManager.CALL_STATE_IDLE
  private var lastNumber: String? = null
  private var callStartTime: Long = 0L

  private var phoneStateListener: PhoneStateListener? = null
  private val mainHandler = Handler(Looper.getMainLooper())

  override fun getName(): String = NAME

  /**
   * React Native 0.71+ requires native event emitter modules to implement
   * addListener/removeListeners, even if we don't use them on the native side.
   * These are no-ops but silence the yellow-box warnings.
   */
  @ReactMethod
  fun addListener(eventName: String?) {
    // Intentionally empty
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Intentionally empty
  }

  @ReactMethod
  fun initialize(promise: Promise? = null) {
    mainHandler.post {
      if (phoneStateListener == null) {
        phoneStateListener = object : PhoneStateListener() {
          override fun onCallStateChanged(state: Int, phoneNumber: String?) {
            handleStateChange(state, phoneNumber)
          }
        }
      }
      telephonyManager?.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE)
      promise?.resolve(true)
    }
  }

  @ReactMethod
  fun startListening() {
    initialize(null)
  }

  @ReactMethod
  fun stopListening() {
    mainHandler.post {
      telephonyManager?.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE)
    }
  }

  @ReactMethod
  fun isDefaultDialer(promise: Promise) {
    try {
      val telecomManager =
        context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
      val pkg = context.packageName
      val isDefault = telecomManager?.defaultDialerPackage == pkg
      promise.resolve(isDefault == true)
    } catch (e: Exception) {
      promise.reject("dialer_check_failed", e)
    }
  }

  @ReactMethod
  fun requestDefaultDialer(promise: Promise) {
    try {
      val intent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER)
      intent.putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, context.packageName)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      val activity = reactApplicationContext.currentActivity
      activity?.startActivity(intent) ?: run {
        context.startActivity(intent)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("dialer_request_failed", e)
    }
  }

  @ReactMethod
  fun registerPhoneAccount(promise: Promise) {
    // ConnectionService wiring is out of scope; resolve to keep JS flow happy.
    promise.resolve(true)
  }

  @ReactMethod
  fun placeCall(number: String?, promise: Promise) {
    val rawNumber = normalizeNumber(number)
    if (rawNumber.isEmpty()) {
      promise.reject("call_error", "Invalid phone number")
      return
    }

    val hasPermission = ContextCompat.checkSelfPermission(
      context,
      android.Manifest.permission.CALL_PHONE
    ) == PackageManager.PERMISSION_GRANTED

    if (!hasPermission) {
      promise.reject("call_permission", "CALL_PHONE permission not granted")
      return
    }

    try {
      val intent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$rawNumber"))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      promise.resolve(true)
    } catch (e: SecurityException) {
      promise.reject("call_permission", e)
    } catch (e: Exception) {
      promise.reject("call_error", e)
    }
  }

  @ReactMethod
  fun getLastCallForNumber(number: String, sinceMs: Double, promise: Promise) {
    val normalizedTarget = normalizeDigits(number)
    if (normalizedTarget.isEmpty()) {
      promise.resolve(null)
      return
    }

    val resolver = context.contentResolver
    val uri: Uri = CallLog.Calls.CONTENT_URI

    val selection = "${CallLog.Calls.NUMBER} LIKE ? AND ${CallLog.Calls.DATE} >= ?"
    val args = arrayOf("%$normalizedTarget%", sinceMs.toLong().toString())
    val sortOrder = "${CallLog.Calls.DATE} DESC LIMIT 1"

    var cursor: Cursor? = null
    try {
      cursor = resolver.query(uri, null, selection, args, sortOrder)
      if (cursor != null && cursor.moveToFirst()) {
        val durationIdx = cursor.getColumnIndex(CallLog.Calls.DURATION)
        val numberIdx = cursor.getColumnIndex(CallLog.Calls.NUMBER)
        val typeIdx = cursor.getColumnIndex(CallLog.Calls.TYPE)

        val foundNumber = cursor.getString(numberIdx) ?: ""
        val duration = cursor.getLong(durationIdx).coerceAtLeast(0)
        val typeVal = cursor.getInt(typeIdx)

        val result = Arguments.createMap().apply {
          putString("number", foundNumber)
          putDouble("durationSeconds", duration.toDouble())
          putString("type", typeVal.toString())
        }

        promise.resolve(result)
      } else {
        promise.resolve(null)
      }
    } catch (e: SecurityException) {
      promise.reject("calllog_permission", e)
    } catch (e: Exception) {
      promise.reject("calllog_error", e)
    } finally {
      cursor?.close()
    }
  }

  @ReactMethod
  fun getRecentCalls(limit: Int, promise: Promise) {
    val resolver = context.contentResolver
    val uri: Uri = CallLog.Calls.CONTENT_URI
    val projection = arrayOf(
      CallLog.Calls.NUMBER,
      CallLog.Calls.DATE,
      CallLog.Calls.DURATION,
      CallLog.Calls.TYPE
    )
    val safeLimit = when {
      limit <= 0 -> 15
      limit > 100 -> 100
      else -> limit
    }
    val sortOrder = "${CallLog.Calls.DATE} DESC LIMIT $safeLimit"
    var cursor: Cursor? = null

    try {
      cursor = resolver.query(uri, projection, null, null, sortOrder)
      if (cursor == null) {
        promise.resolve(null)
        return
      }

      val numberIdx = cursor.getColumnIndex(CallLog.Calls.NUMBER)
      val dateIdx = cursor.getColumnIndex(CallLog.Calls.DATE)
      val durationIdx = cursor.getColumnIndex(CallLog.Calls.DURATION)
      val typeIdx = cursor.getColumnIndex(CallLog.Calls.TYPE)

      val list = Arguments.createArray()
      while (cursor.moveToNext()) {
        val map = Arguments.createMap()
        map.putString("number", cursor.getString(numberIdx) ?: "")
        map.putDouble("timestamp", cursor.getLong(dateIdx).toDouble())
        map.putDouble("durationSeconds", cursor.getLong(durationIdx).toDouble())
        map.putString("type", cursor.getInt(typeIdx).toString())
        list.pushMap(map)
      }

      promise.resolve(list)
    } catch (e: SecurityException) {
      promise.reject("calllog_permission", e)
    } catch (e: Exception) {
      promise.reject("calllog_error", e)
    } finally {
      cursor?.close()
    }
  }

  private fun handleStateChange(state: Int, incomingNumber: String?) {
    val normalized = normalizeNumber(incomingNumber)

    when (state) {
      TelephonyManager.CALL_STATE_RINGING -> {
        callStartTime = System.currentTimeMillis()
        lastNumber = normalized
        sendEvent("IncomingCall", mapOf("phoneNumber" to normalized))
        sendEvent("CallStateChanged", mapOf("state" to "RINGING", "phoneNumber" to normalized))
      }

      TelephonyManager.CALL_STATE_OFFHOOK -> {
        if (callStartTime == 0L) {
          callStartTime = System.currentTimeMillis()
        }
        if (!normalized.isNullOrEmpty()) {
          lastNumber = normalized
        }
        sendEvent("CallAnswered", mapOf("phoneNumber" to (lastNumber ?: normalized)))
        sendEvent("CallStateChanged", mapOf("state" to "ACTIVE", "phoneNumber" to (lastNumber ?: normalized)))
      }

      TelephonyManager.CALL_STATE_IDLE -> {
        val wasRinging = lastState == TelephonyManager.CALL_STATE_RINGING
        val elapsedSeconds =
          if (callStartTime > 0L) ((System.currentTimeMillis() - callStartTime) / 1000).coerceAtLeast(0) else 0

        if (wasRinging) {
          sendEvent("CallMissed", mapOf("phoneNumber" to (lastNumber ?: normalized)))
        } else {
          sendEvent(
            "CallEnded",
            mapOf(
              "phoneNumber" to (lastNumber ?: normalized),
              "durationSeconds" to elapsedSeconds
            )
          )
        }

        sendEvent("CallStateChanged", mapOf("state" to "IDLE", "phoneNumber" to (lastNumber ?: normalized)))
        callStartTime = 0L
        lastNumber = null
      }
    }

    lastState = state
  }

  private fun sendEvent(event: String, payload: Map<String, Any?>) {
    val params = Arguments.createMap()
    payload.forEach { (key, value) ->
      when (value) {
        null -> params.putNull(key)
        is String -> params.putString(key, value)
        is Int -> params.putInt(key, value)
        is Double -> params.putDouble(key, value)
        is Float -> params.putDouble(key, value.toDouble())
        is Boolean -> params.putBoolean(key, value)
        is Long -> params.putDouble(key, value.toDouble())
        else -> params.putString(key, value.toString())
      }
    }

    context
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(event, params)
  }

  private fun normalizeNumber(value: String?): String {
    if (value.isNullOrEmpty()) return ""
    val cleaned = value.replace(Regex("[^\\d+]"), "")
    return if (cleaned.startsWith("+")) {
      "+" + cleaned.substring(1).replace("+", "")
    } else {
      cleaned.replace("+", "")
    }
  }

  private fun normalizeDigits(value: String?): String {
    if (value.isNullOrEmpty()) return ""
    return value.replace(Regex("\\D"), "")
  }
}
