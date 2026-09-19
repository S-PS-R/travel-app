import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Native errors propagate: never fall back to plaintext token persistence.
export const sessionStorage = Platform.OS === "web" ? AsyncStorage : {
  async getItem(key: string) {
    // Remove the prototype's plaintext session. Existing native users sign in again.
    await AsyncStorage.removeItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await AsyncStorage.removeItem(key);
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
    await AsyncStorage.removeItem(key);
  },
};
