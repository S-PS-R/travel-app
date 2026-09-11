import React, { useState } from "react";
import { View, Text, ScrollView, Modal, Pressable, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button, Field, s, colors } from "./ui";
import {
  type Trip,
  type Place,
  type Stop,
  places,
  uid,
  validateTrip,
} from "./model";
export default function TripEditor({
  initial,
  onSave,
  onClose,
}: {
  initial?: Trip;
  onSave: (trip: Trip) => Promise<void>;
  onClose: () => void;
}) {
  const [trip, setTrip] = useState<Trip>(
    initial
      ? JSON.parse(JSON.stringify(initial))
      : {
          id: uid(),
          title: "",
          stops: [],
          notes: "",
          createdAt: new Date().toISOString(),
        },
  );
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState(false);
  const [customPlace, setCustomPlace] = useState({
    city: "",
    country: "",
    lat: "",
    lon: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function add(place: Place) {
    setTrip((t) => ({
      ...t,
      stops: [
        ...t.stops,
        {
          id: uid(),
          place,
          arrival: t.stops.at(-1)?.departure ?? "",
          departure: "",
          stay: "",
          notes: "",
          photos: [],
        },
      ],
    }));
    setQuery("");
    setCustom(false);
  }
  function update(id: string, patch: Partial<Stop>) {
    setTrip((t) => ({
      ...t,
      stops: t.stops.map((st) => (st.id === id ? { ...st, ...patch } : st)),
    }));
  }
  async function photo(stop: Stop) {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.45,
        allowsEditing: true,
      });
      if (!r.canceled) {
        const a = r.assets[0];
        if (!a.base64)
          throw new Error("Unable to read that photo. Try another image.");
        if (a.base64.length > 1400000)
          throw new Error("Choose a smaller photo (under 1 MB).");
        if (stop.photos.length >= 3)
          throw new Error(
            "This first version supports up to three photos per stop.",
          );
        update(stop.id, {
          photos: [
            ...stop.photos,
            `data:${a.mimeType ?? "image/jpeg"};base64,${a.base64}`,
          ],
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add photo.");
    }
  }
  async function save() {
    const issue = validateTrip(trip);
    if (issue) {
      setError(issue);
      return;
    }
    setError("");
    setBusy(true);
    try {
      await onSave({ ...trip, title: trip.title.trim() });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save your trip. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      visible
      animationType="slide"
      transparent
      onRequestClose={() => !busy && onClose()}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#12323888",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: colors.bg,
            width: "100%",
            maxWidth: 720,
            maxHeight: "95%",
            borderRadius: 22,
            overflow: "hidden",
          }}
        >
          <View
            style={[
              s.spread,
              {
                padding: 24,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
              },
            ]}
          >
            <Text style={s.subtitle}>
              {initial ? "Edit your trip" : "A new chapter"}
            </Text>
            <Button quiet disabled={busy} onPress={onClose}>
              Close
            </Button>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, gap: 22 }}
          >
            <Field
              label="Trip name"
              placeholder="e.g. Summer in Italy"
              value={trip.title}
              onChangeText={(title) => setTrip({ ...trip, title })}
              maxLength={120}
            />
            <Field
              label="Trip notes"
              placeholder="What made this trip yours?"
              multiline
              value={trip.notes}
              onChangeText={(notes) => setTrip({ ...trip, notes })}
              maxLength={10000}
            />
            <View style={s.spread}>
              <Text style={s.subtitle}>Your destinations</Text>
              <Text style={s.muted}>{trip.stops.length} stops</Text>
            </View>
            {trip.stops.map((stop, i) => (
              <View key={stop.id} style={s.card}>
                <View style={s.spread}>
                  <View>
                    <Text style={s.eyebrow}>
                      STOP {String(i + 1).padStart(2, "0")}
                    </Text>
                    <Text style={[s.subtitle, { marginTop: 6 }]}>
                      {stop.place.city}
                    </Text>
                    <Text style={s.muted}>{stop.place.country}</Text>
                  </View>
                  <Button
                    quiet
                    onPress={() =>
                      setTrip({
                        ...trip,
                        stops: trip.stops.filter((st) => st.id !== stop.id),
                      })
                    }
                  >
                    Remove
                  </Button>
                </View>
                <View
                  style={[
                    s.row,
                    { alignItems: "flex-start", flexWrap: "wrap" },
                  ]}
                >
                  <Field
                    label="Arrival (YYYY-MM-DD)"
                    placeholder="2025-05-04"
                    value={stop.arrival}
                    onChangeText={(arrival) => update(stop.id, { arrival })}
                    maxLength={10}
                  />
                  <Field
                    label="Departure (YYYY-MM-DD)"
                    placeholder="2025-05-08"
                    value={stop.departure}
                    onChangeText={(departure) => update(stop.id, { departure })}
                    maxLength={10}
                  />
                </View>
                <Field
                  label="Where you stayed"
                  placeholder="Hotel, apartment, or a friend’s place"
                  value={stop.stay}
                  onChangeText={(stay) => update(stop.id, { stay })}
                  maxLength={300}
                />
                <Field
                  label="Memories & recommendations"
                  placeholder="That little café, a favorite walk…"
                  multiline
                  value={stop.notes}
                  onChangeText={(notes) => update(stop.id, { notes })}
                  maxLength={10000}
                />
                <View style={[s.row, { flexWrap: "wrap" }]}>
                  {stop.photos.map((uri, j) => (
                    <View key={j} style={{ gap: 5 }}>
                      <Image
                        source={{ uri }}
                        accessibilityLabel={`Trip photo ${j + 1}`}
                        style={{ width: 100, height: 80, borderRadius: 8 }}
                      />
                      <Button
                        quiet
                        onPress={() =>
                          update(stop.id, {
                            photos: stop.photos.filter((_, k) => k !== j),
                          })
                        }
                      >
                        Remove photo
                      </Button>
                    </View>
                  ))}
                </View>
                <Button quiet onPress={() => photo(stop)}>
                  ＋ Add a photo
                </Button>
              </View>
            ))}
            <View style={s.card}>
              <Field
                label="Add a destination"
                value={query}
                onChangeText={setQuery}
                placeholder="Search cities or countries"
              />
              <View style={[s.row, { flexWrap: "wrap" }]}>
                {places
                  .filter((p) =>
                    `${p.city} ${p.country}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .slice(0, query ? 8 : 5)
                  .map((p) => (
                    <Pressable
                      accessibilityRole="button"
                      key={p.city}
                      onPress={() => add(p)}
                      style={s.pill}
                    >
                      <Text style={{ fontSize: 14, color: colors.teal }}>
                        ＋ {p.city}
                      </Text>
                    </Pressable>
                  ))}
              </View>
              <Button quiet onPress={() => setCustom(!custom)}>
                {custom
                  ? "Cancel custom place"
                  : "Can’t find your place? Add it manually"}
              </Button>
              {custom && (
                <View style={{ gap: 14 }}>
                  <Field
                    label="City / place"
                    value={customPlace.city}
                    onChangeText={(city) =>
                      setCustomPlace({ ...customPlace, city })
                    }
                  />
                  <Field
                    label="Country"
                    value={customPlace.country}
                    onChangeText={(country) =>
                      setCustomPlace({ ...customPlace, country })
                    }
                  />
                  <Text style={s.muted}>
                    Coordinates place your pin precisely. Find them by selecting
                    the place in your preferred map app.
                  </Text>
                  <Field
                    label="Latitude (-90 to 90)"
                    value={customPlace.lat}
                    onChangeText={(lat) =>
                      setCustomPlace({ ...customPlace, lat })
                    }
                  />
                  <Field
                    label="Longitude (-180 to 180)"
                    value={customPlace.lon}
                    onChangeText={(lon) =>
                      setCustomPlace({ ...customPlace, lon })
                    }
                  />
                  <Button
                    onPress={() => {
                      const lat = Number(customPlace.lat),
                        lon = Number(customPlace.lon);
                      if (
                        !customPlace.city.trim() ||
                        !customPlace.country.trim() ||
                        !customPlace.lat.trim() ||
                        !customPlace.lon.trim() ||
                        !Number.isFinite(lat) ||
                        !Number.isFinite(lon) ||
                        Math.abs(lat) > 90 ||
                        Math.abs(lon) > 180
                      ) {
                        setError(
                          "Enter a city, country, and valid coordinates.",
                        );
                        return;
                      }
                      add({
                        city: customPlace.city.trim(),
                        country: customPlace.country.trim(),
                        countryId:
                          places.find(
                            (p) =>
                              p.country.toLowerCase() ===
                              customPlace.country.trim().toLowerCase(),
                          )?.countryId ?? "",
                        lat,
                        lon,
                      });
                      setError("");
                    }}
                  >
                    Add place
                  </Button>
                </View>
              )}
            </View>
          </ScrollView>
          <View
            style={{
              padding: 20,
              gap: 12,
              borderTopWidth: 1,
              borderTopColor: colors.line,
            }}
          >
            {!!error && (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            )}
            <Button disabled={busy} onPress={save}>
              {busy ? "Saving…" : "Save trip"}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
