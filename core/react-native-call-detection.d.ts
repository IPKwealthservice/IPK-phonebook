declare module "@huddle01/react-native-call-detection" {
  export type CallState =
    | "Incoming"
    | "Disconnected"
    | "Connected"
    | "Dialing"
    | "Offhook"
    | "Missed"
    | "Idle"
    | "OFFHOOK_IDLE";

  export type CallDetectorCallback = (callState: CallState, phoneNumber?: string) => void;

  export type PermissionDeniedCallback = (reason?: string) => void;

  export interface PermissionMessage {
    title: string;
    message: string;
  }

  export default class CallDetectorManager {
    constructor(
      callback: CallDetectorCallback,
      readPhoneNumberAndroid?: boolean,
      permissionDeniedCallback?: PermissionDeniedCallback,
      permissionMessage?: PermissionMessage
    );

    dispose(): void;
  }
}
