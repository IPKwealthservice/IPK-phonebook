package com.anonymous.Ipkphonebook.call

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager

class CallReceiver : BroadcastReceiver() {
  private var lastState: Int = TelephonyManager.CALL_STATE_IDLE
  private var startTime: Long = 0L
  private var lastNumber: String? = null
  private var isIncoming: Boolean = false

  override fun onReceive(context: Context, intent: Intent) {
    val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
    val number = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER)
      ?: intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
      ?: lastNumber

    val state = when (stateStr) {
      TelephonyManager.EXTRA_STATE_RINGING -> TelephonyManager.CALL_STATE_RINGING
      TelephonyManager.EXTRA_STATE_OFFHOOK -> TelephonyManager.CALL_STATE_OFFHOOK
      TelephonyManager.EXTRA_STATE_IDLE -> TelephonyManager.CALL_STATE_IDLE
      else -> return
    }

    handleCallState(context, state, number)
  }

  private fun handleCallState(context: Context, state: Int, number: String?) {
    when (state) {
      TelephonyManager.CALL_STATE_RINGING -> {
        isIncoming = true
        startTime = System.currentTimeMillis()
        lastNumber = number
      }
      TelephonyManager.CALL_STATE_OFFHOOK -> {
        // Transition to active call
        if (lastState != TelephonyManager.CALL_STATE_RINGING) {
          isIncoming = false
          startTime = System.currentTimeMillis()
          lastNumber = number
        }
      }
      TelephonyManager.CALL_STATE_IDLE -> {
        val duration =
          if (startTime > 0L) (System.currentTimeMillis() - startTime) / 1000 else 0L

        if (lastState == TelephonyManager.CALL_STATE_RINGING) {
          // Missed call
        } else {
          // Call ended (incoming or outgoing)
          bringAppToFront(context)
        }

        startTime = 0L
        lastNumber = null
      }
    }

    lastState = state
  }

  private fun bringAppToFront(context: Context) {
    val pm = context.packageManager
    val launchIntent = pm.getLaunchIntentForPackage(context.packageName) ?: return
    launchIntent.addFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED or
        Intent.FLAG_ACTIVITY_SINGLE_TOP
    )
    context.startActivity(launchIntent)
  }
}
