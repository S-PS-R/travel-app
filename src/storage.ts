import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { type Trip, parseTrips } from "./model";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === "web",
          lock: processLock,
        },
      })
    : null;
if (Platform.OS !== "web" && supabase)
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
const LOCAL_KEY = "wayfarer.trips.v1";
export async function loadTrips(userId?: string): Promise<Trip[]> {
  if (userId && supabase) {
    const { data, error } = await supabase
      .from("trips")
      .select("payload")
      .eq("user_id", userId);
    if (error) throw error;
    return parseTrips((data ?? []).map((row) => row.payload));
  }
  const raw = await AsyncStorage.getItem(LOCAL_KEY);
  if (!raw) return [];
  return parseTrips(JSON.parse(raw));
}
export async function persistTrip(trip: Trip, all: Trip[], userId?: string) {
  if (userId && supabase) {
    const { error } = await supabase
      .from("trips")
      .upsert({ id: trip.id, user_id: userId, payload: trip });
    if (error) throw error;
    return;
  }
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(all));
}
export async function removeTrip(
  id: string,
  remaining: Trip[],
  userId?: string,
) {
  if (userId && supabase) {
    const { error } = await supabase
      .from("trips")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(remaining));
}
