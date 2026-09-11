import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Image,
  useWindowDimensions,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";
import WorldMap from "./WorldMap";
import TripEditor from "./TripEditor";
import { Button, Field, colors, s, serif } from "./ui";
import {
  type Trip,
  type Place,
  placeKey,
  sampleTrips,
  sortedStops,
  tripStart,
  tripDays,
  dateLabel,
  isVisited,
} from "./model";
import { supabase, loadTrips, persistTrip, removeTrip } from "./storage";
import { useAgentTools } from "./useAgentTools";
export default function App() {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const [trips, setTrips] = useState<Trip[]>([]);
  const [samples] = useState(sampleTrips);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [tab, setTab] = useState<"world" | "trips">("world");
  const [selected, setSelected] = useState<Place | null>(null);
  const [detail, setDetail] = useState<Trip | null>(null);
  const [editor, setEditor] = useState<Trip | true | null>(null);
  const [account, setAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!authReady) return;
    let alive = true;
    setLoading(true);
    setLoadFailed(false);
    setTrips([]);
    setDetail(null);
    setSelected(null);
    setEditor(null);
    setDemo(false);
    loadTrips(session?.user.id)
      .then((data) => {
        if (alive) {
          setTrips(data);
          setDemo(!data.length && !session);
        }
      })
      .catch((e) => {
        if (alive) {
          setLoadFailed(true);
          setError(e.message);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [session?.user.id, authReady]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const shown = demo ? samples : trips;
  const visited = shown.flatMap((t) => t.stops.filter(isVisited));
  const countries = new Set(visited.map((st) => st.place.country.toLowerCase()))
    .size;
  const cityCount = new Set(visited.map((st) => placeKey(st.place))).size;
  const visible = shown
    .filter((t) =>
      `${t.title} ${t.stops.map((s) => s.place.city + " " + s.place.country).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => tripStart(b).localeCompare(tripStart(a)));
  useAgentTools(shown, openTrip);
  async function save(trip: Trip) {
    const next = [...trips.filter((t) => t.id !== trip.id), trip];
    await persistTrip(trip, next, session?.user.id);
    setTrips(next);
    setDemo(false);
    setEditor(null);
    setDetail(trip);
    setSelected(trip.stops[0].place);
    setConfirmDelete(false);
    setNotice("Your trip is saved.");
  }
  async function deleteCurrent() {
    if (!detail) return;
    setDeleting(true);
    try {
      const next = trips.filter((t) => t.id !== detail.id);
      await removeTrip(detail.id, next, session?.user.id);
      setTrips(next);
      setDetail(null);
      setConfirmDelete(false);
      setNotice("Trip removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove trip.");
    } finally {
      setDeleting(false);
    }
  }
  async function auth(signup: boolean) {
    if (!supabase) return;
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const r = signup
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
      if (r.error) throw r.error;
      if (signup && !r.data.session)
        setAuthMessage(
          "Check your email to confirm your account, then sign in here.",
        );
      else {
        setAccount(false);
        setPassword("");
      }
    } catch (e) {
      setAuthMessage(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setAuthBusy(false);
    }
  }
  function openTrip(t: Trip) {
    setDetail(t);
    setConfirmDelete(false);
  }
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop:
          Platform.OS === "ios" ? 50 : Platform.OS === "android" ? 30 : 0,
      }}
    >
      <StatusBar style="dark" />
      <View
        style={[
          s.spread,
          {
            backgroundColor: "white",
            paddingHorizontal: compact ? 20 : 40,
            paddingVertical: 20,
            borderBottomWidth: 1,
            borderBottomColor: colors.line,
            flexWrap: "wrap",
          },
        ]}
      >
        <View style={s.row}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: colors.teal,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 25, color: "white" }}>↗</Text>
          </View>
          <Text style={{ fontFamily: serif, fontSize: 29, color: colors.ink }}>
            wayfarer
          </Text>
        </View>
        <View style={s.row}>
          {(["world", "trips"] as const).map((t) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              key={t}
              onPress={() => setTab(t)}
              style={{
                padding: 12,
                borderBottomWidth: 2,
                borderBottomColor: tab === t ? colors.teal : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: tab === t ? colors.teal : colors.muted,
                }}
              >
                {t === "world" ? "My world" : "My trips"}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button
          quiet
          onPress={() => {
            setAuthMessage("");
            setAccount(true);
          }}
        >
          {session ? "My account" : "Local explorer"}
        </Button>
      </View>
      <ScrollView
        contentContainerStyle={{
          padding: compact ? 20 : 36,
          gap: 24,
          maxWidth: 1600,
          width: "100%",
          alignSelf: "center",
          paddingBottom: 60,
        }}
      >
        <View style={[s.spread, { flexWrap: "wrap" }]}>
          <View style={{ gap: 8 }}>
            <Text style={s.eyebrow}>THE PLACES THAT STAY WITH YOU</Text>
            <Text accessibilityRole="header" style={s.title}>
              {tab === "world"
                ? "A world of memories."
                : "Your travel journal."}
            </Text>
            <Text style={s.muted}>
              {tab === "world"
                ? "Every pin is a place. Every place has a story."
                : "Big adventures and little escapes, all in one place."}
            </Text>
          </View>
          <Button
            disabled={loading || loadFailed}
            onPress={() => setEditor(true)}
          >
            ＋ Add a trip
          </Button>
        </View>
        {demo && (
          <View
            style={[
              s.spread,
              {
                backgroundColor: "#edf3fb",
                padding: 14,
                borderRadius: 10,
                flexWrap: "wrap",
              },
            ]}
          >
            <Text style={[s.muted, { color: "#426184" }]}>
              You’re exploring sample trips. Add your first trip to make this
              world yours.
            </Text>
            <Button
              quiet
              onPress={() => {
                setDemo(false);
                setSelected(null);
              }}
            >
              Start with an empty map
            </Button>
          </View>
        )}
        {!session && !demo && (
          <Text style={s.muted}>
            Saved on this device · Connect an account for cloud saving.
          </Text>
        )}
        {!!error && (
          <View style={s.card}>
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
            <Button quiet onPress={() => setError("")}>
              Dismiss
            </Button>
          </View>
        )}
        {!!notice && (
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: colors.teal, fontSize: 15 }}
          >
            {notice}
          </Text>
        )}
        {loading ? (
          <Text style={s.body}>Opening your world…</Text>
        ) : (
          <>
            <View style={[s.row, { gap: compact ? 22 : 48, flexWrap: "wrap" }]}>
              {[
                [countries, "countries visited"],
                [cityCount, "places explored"],
                [shown.length, "trips collected"],
              ].map(([n, label]) => (
                <View key={label} style={[s.row, { gap: 10 }]}>
                  <Text
                    style={{
                      fontFamily: serif,
                      fontSize: 33,
                      color: colors.ink,
                    }}
                  >
                    {n}
                  </Text>
                  <Text style={s.muted}>{label}</Text>
                </View>
              ))}
            </View>
            {tab === "world" && (
              <View
                style={{
                  flexDirection: compact ? "column" : "row",
                  gap: 24,
                  alignItems: "stretch",
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <WorldMap
                    trips={shown}
                    selected={selected ? placeKey(selected) : null}
                    onSelect={setSelected}
                  />
                </View>
                <View style={[s.card, { width: compact ? "100%" : 300 }]}>
                  <Text style={s.eyebrow}>
                    {selected ? "PLACE JOURNAL" : "COLLECT MOMENTS"}
                  </Text>
                  <Text style={s.subtitle}>
                    {selected ? selected.city : "Where have you been?"}
                  </Text>
                  <Text style={s.muted}>
                    {selected
                      ? selected.country
                      : "Choose a pin on your map, or open a destination below."}
                  </Text>
                  {selected
                    ? shown
                        .filter((t) =>
                          t.stops.some(
                            (st) => placeKey(st.place) === placeKey(selected),
                          ),
                        )
                        .map((t) => (
                          <Pressable
                            accessibilityRole="button"
                            key={t.id}
                            onPress={() => openTrip(t)}
                            style={{
                              gap: 8,
                              paddingVertical: 12,
                              borderTopWidth: 1,
                              borderTopColor: colors.line,
                            }}
                          >
                            <Text style={[s.body, { fontWeight: "600" }]}>
                              {t.title} ↗
                            </Text>
                            {t.stops
                              .filter(
                                (st) =>
                                  placeKey(st.place) === placeKey(selected),
                              )
                              .map((st) => (
                                <Text key={st.id} style={s.muted}>
                                  {dateLabel(st.arrival)} ·{" "}
                                  {st.stay || "Stay not added"}
                                </Text>
                              ))}
                          </Pressable>
                        ))
                    : Array.from(
                        new Map(
                          shown
                            .flatMap((t) => t.stops)
                            .map((st) => [placeKey(st.place), st.place]),
                        ).values(),
                      )
                        .map((p) => (
                          <Pressable
                            accessibilityRole="button"
                            key={placeKey(p)}
                            onPress={() => setSelected(p)}
                            style={[
                              s.spread,
                              {
                                paddingVertical: 10,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.line,
                              },
                            ]}
                          >
                            <Text style={s.body}>{p.city}</Text>
                            <Text style={s.muted}>↗</Text>
                          </Pressable>
                        ))}
                  {!shown.length && (
                    <Button
                      disabled={loadFailed}
                      onPress={() => setEditor(true)}
                    >
                      Add your first place
                    </Button>
                  )}
                </View>
              </View>
            )}
            <View style={[s.spread, { flexWrap: "wrap" }]}>
              <Text style={s.subtitle}>
                {tab === "world" ? "From your journal" : "All trips"}
              </Text>
              <View style={{ width: compact ? "100%" : 280 }}>
                <Field
                  label="Find a trip"
                  placeholder="Search trips or destinations"
                  value={query}
                  onChangeText={setQuery}
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
              {visible.map((t, i) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${t.title}`}
                  key={t.id}
                  onPress={() => openTrip(t)}
                  style={({ pressed }) => ({
                    width: compact ? "100%" : "31.9%",
                    minWidth: compact ? 0 : 230,
                    borderWidth: 1,
                    borderColor: colors.line,
                    borderRadius: 15,
                    overflow: "hidden",
                    backgroundColor: "white",
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  {t.stops.some((st) => st.photos.length) ? (
                    <Image
                      source={{
                        uri: t.stops.find((st) => st.photos.length)!.photos[0],
                      }}
                      style={{ height: 160, width: "100%" }}
                      accessibilityLabel={t.title}
                    />
                  ) : t.id === "demo-italy" ? (
                    <Image
                      source={require("../assets/tuscany.jpg")}
                      style={{ height: 160, width: "100%" }}
                      accessibilityLabel="Tuscan countryside, Italy"
                    />
                  ) : (
                    <View
                      style={{
                        height: 160,
                        backgroundColor: i % 2 ? "#d6e5ed" : "#e1ede7",
                        justifyContent: "center",
                        padding: 24,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          letterSpacing: 2,
                          color: colors.teal,
                        }}
                      >
                        TRAVEL JOURNAL
                      </Text>
                      <Text
                        style={{
                          fontFamily: serif,
                          fontSize: 40,
                          color: colors.ink,
                          marginTop: 10,
                        }}
                      >
                        {t.stops[0]?.place.country ?? "Somewhere new"}
                      </Text>
                    </View>
                  )}
                  <View style={{ padding: 22, gap: 10 }}>
                    <View style={s.spread}>
                      <Text style={s.eyebrow}>{tripStart(t).slice(0, 4)}</Text>
                      <Text style={s.muted}>{tripDays(t)} days</Text>
                    </View>
                    <Text style={s.subtitle}>{t.title}</Text>
                    <Text style={s.muted}>
                      {sortedStops(t)
                        .map((st) => st.place.city)
                        .join(" → ")}
                    </Text>
                    <View style={s.divider} />
                    <View style={s.spread}>
                      <Text style={s.muted}>
                        {t.stops.length} places ·{" "}
                        {t.stops.reduce((n, st) => n + st.photos.length, 0)}{" "}
                        photos
                      </Text>
                      <Text style={{ fontSize: 20, color: colors.teal }}>
                        ↗
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
            {!visible.length && (
              <View style={s.card}>
                <Text style={s.subtitle}>
                  {query
                    ? "No matching trips"
                    : "Your next memory starts here."}
                </Text>
                <Text style={s.muted}>
                  {query
                    ? "Try another city, country, or trip name."
                    : "Add a past trip and watch your map come to life."}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
      {!!detail && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setDetail(null)}
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
                maxHeight: "95%",
                maxWidth: 760,
                width: "100%",
                backgroundColor: colors.bg,
                borderRadius: 20,
                overflow: "hidden",
              }}
            >
              <View style={[s.spread, { padding: 22 }]}>
                <Text style={s.eyebrow}>
                  {demo ? "SAMPLE TRIP" : "YOUR TRIP JOURNAL"}
                </Text>
                <Button quiet onPress={() => setDetail(null)}>
                  Close
                </Button>
              </View>
              <ScrollView contentContainerStyle={{ padding: 24, gap: 24 }}>
                <Text style={s.title}>{detail.title}</Text>
                <Text style={s.muted}>
                  {tripDays(detail)} days · {detail.stops.length} destinations
                </Text>
                <Text style={s.body}>{detail.notes}</Text>
                {sortedStops(detail).map((st, i) => (
                  <View key={st.id} style={s.card}>
                    <Text style={s.eyebrow}>
                      STOP {String(i + 1).padStart(2, "0")} ·{" "}
                      {st.place.country.toUpperCase()}
                    </Text>
                    <Text style={s.subtitle}>{st.place.city}</Text>
                    <Text style={s.muted}>
                      {dateLabel(st.arrival)} — {dateLabel(st.departure)}
                    </Text>
                    {!!st.stay && <Text style={s.body}>⌂ {st.stay}</Text>}
                    {!!st.notes && <Text style={s.body}>{st.notes}</Text>}
                    {st.photos.map((uri, j) => (
                      <Image
                        key={j}
                        source={{ uri }}
                        style={{ width: "100%", height: 220, borderRadius: 10 }}
                        accessibilityLabel={`${st.place.city} photo ${j + 1}`}
                      />
                    ))}
                  </View>
                ))}
                {!demo && (
                  <>
                    <Button
                      onPress={() => {
                        setEditor(detail);
                        setDetail(null);
                      }}
                    >
                      Edit trip
                    </Button>
                    {confirmDelete ? (
                      <View style={{ gap: 12 }}>
                        <Text style={s.error}>
                          Remove this trip and its photos? This cannot be
                          undone.
                        </Text>
                        <Button
                          disabled={deleting}
                          danger
                          quiet
                          onPress={deleteCurrent}
                        >
                          {deleting ? "Removing…" : "Remove permanently"}
                        </Button>
                        <Button quiet onPress={() => setConfirmDelete(false)}>
                          Keep trip
                        </Button>
                      </View>
                    ) : (
                      <Button
                        quiet
                        danger
                        onPress={() => setConfirmDelete(true)}
                      >
                        Remove trip
                      </Button>
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      {!!editor && (
        <TripEditor
          initial={editor === true ? undefined : editor}
          onClose={() => setEditor(null)}
          onSave={save}
        />
      )}
      {account && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setAccount(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "#12323888",
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
          >
            <ScrollView
              style={{ maxHeight: "90%", width: "100%", maxWidth: 460 }}
              contentContainerStyle={s.card}
            >
              <View style={s.spread}>
                <Text style={s.subtitle}>
                  {session ? "Your account" : "Your world, everywhere"}
                </Text>
                <Button quiet onPress={() => setAccount(false)}>
                  Close
                </Button>
              </View>
              {session ? (
                <>
                  <Text style={s.body}>{session.user.email}</Text>
                  <Text style={s.muted}>
                    Your trips are saved to your account. Local trips remain
                    separately on this device.
                  </Text>
                  <Button
                    onPress={async () => {
                      const { error } = await supabase!.auth.signOut();
                      if (error) setAuthMessage(error.message);
                      else setAccount(false);
                    }}
                  >
                    Sign out
                  </Button>
                </>
              ) : supabase ? (
                <>
                  <Text style={s.muted}>
                    Sign in to save trips across devices. Device-local trips
                    stay separate from your account.
                  </Text>
                  <Field
                    label="Email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                  <Field
                    label="Password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                  <Button disabled={authBusy} onPress={() => auth(false)}>
                    {authBusy ? "Please wait…" : "Sign in"}
                  </Button>
                  <Button quiet disabled={authBusy} onPress={() => auth(true)}>
                    Create account
                  </Button>
                </>
              ) : (
                <>
                  <Text style={s.body}>You’re exploring locally.</Text>
                  <Text style={s.muted}>
                    Your trips save on this device. Account creation and cloud
                    saving will be available once the app’s cloud service is
                    connected.
                  </Text>
                  <Text style={s.muted}>
                    Clearing browser or app data removes local trips and photos.
                  </Text>
                  <Button onPress={() => setAccount(false)}>
                    Keep exploring
                  </Button>
                </>
              )}
              {!!authMessage && (
                <Text accessibilityRole="alert" style={s.muted}>
                  {authMessage}
                </Text>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}
