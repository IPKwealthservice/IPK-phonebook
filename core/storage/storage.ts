import AsyncStorage from "@react-native-async-storage/async-storage";

// Clears all persisted key/value data from AsyncStorage
export async function storageClear(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    // Swallow errors to avoid crashes on non-critical maintenance action
    console.warn("storageClear failed", error);
  }
}

