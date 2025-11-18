/*
* @providesModule react-native-call-detection
*/
import {
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
  Platform,
  PermissionsAndroid
} from 'react-native'
export const permissionDenied = 'PERMISSION DENIED'

const EVENT_NAME = 'CallStateUpdate'
const NativeCallDetector = NativeModules.CallDetectionManager
const NativeCallDetectorAndroid = NativeModules.CallDetectionManagerAndroid

// https://stackoverflow.com/questions/13154445/how-to-get-phone-number-from-an-incoming-call : Amjad Alwareh's answer.
const requestPermissionsAndroid = (permissionMessage) => {
  const requiredPermission = Platform.constants.Release >= 9
    ? PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
    : PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
  return PermissionsAndroid.check(requiredPermission)
    .then((gotPermission) => gotPermission
      ? true
      : PermissionsAndroid.request(requiredPermission, permissionMessage)
        .then((result) => result === PermissionsAndroid.RESULTS.GRANTED)
    )
}

class CallDetectorManager {

  subscription;
  callback
  constructor(callback, readPhoneNumberAndroid = false, permissionDeniedCallback = () => { }, permissionMessage = {
    title: 'Phone State Permission',
    message: 'This app needs access to your phone state in order to react and/or to adapt to incoming calls.'
  }) {
    this.callback = callback
    if (Platform.OS === 'ios') {
      NativeCallDetector && NativeCallDetector.startListener()
      const emitter = new NativeEventEmitter(NativeCallDetector)
      this.subscription = emitter.addListener(EVENT_NAME, (event) =>
        this.handleEvent(event)
      )
    }
    else {
      if (NativeCallDetectorAndroid) {
        if (readPhoneNumberAndroid) {

          requestPermissionsAndroid(permissionMessage)
            .then((permissionGrantedReadState) => {
              if (!permissionGrantedReadState) {
                permissionDeniedCallback(permissionDenied)
              }
            })
            .catch(permissionDeniedCallback)

        }
        NativeCallDetectorAndroid.startListener();
        this.subscription = DeviceEventEmitter.addListener(EVENT_NAME, (event) =>
          this.handleEvent(event)
        )
      }
    }
  }

  dispose() {
    NativeCallDetector && NativeCallDetector.stopListener()
    NativeCallDetectorAndroid && NativeCallDetectorAndroid.stopListener()
    if (this.subscription) {
      this.subscription.remove()
      this.subscription = undefined
    }
  }

  handleEvent(event) {
    if (!event) {
      return
    }

    const state =
      event.state ?? event.callState ?? event.type ?? (typeof event === "string" ? event : null)
    const phoneNumber = event.phoneNumber ?? event.incomingNumber ?? null
    if (state) {
      this.callback(state, phoneNumber)
    }
  }
}
export default module.exports = CallDetectorManager;
