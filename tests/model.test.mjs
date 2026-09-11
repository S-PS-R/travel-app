import test from "node:test";
import assert from "node:assert/strict";
import {
  sampleTrips,
  validateTrip,
  validDate,
  tripDays,
  placeKey,
  sortedStops,
  parseTrips,
} from "../src/model.ts";
test("saved JSON round-trips and malformed records are rejected", () => {
  const trips = sampleTrips();
  assert.deepEqual(parseTrips(JSON.parse(JSON.stringify(trips))), trips);
  assert.throws(() => parseTrips([{}]), /invalid/);
  assert.throws(() => parseTrips({}), /could not be read/);
  const t = sampleTrips();
  t[0].stops[0].photos = ["javascript:alert(1)"];
  assert.throws(() => parseTrips(t), /invalid/);
});
test("sample trips have valid non-overlapping destinations", () => {
  for (const trip of sampleTrips()) assert.equal(validateTrip(trip), null);
});
test("rejects impossible dates and backwards date ranges", () => {
  assert.equal(validDate("2025-02-29"), false);
  assert.equal(validDate("2024-02-29"), true);
  const t = sampleTrips()[0];
  t.stops[0].departure = "2025-05-01";
  assert.match(validateTrip(t), /Departure/);
});
test("requires a trip name and a destination", () => {
  const t = sampleTrips()[0];
  t.title = " ";
  assert.match(validateTrip(t), /name/);
  t.title = "Trip";
  t.stops = [];
  assert.match(validateTrip(t), /destination/);
});
test("rejects invalid coordinates and overlapping stays", () => {
  const t = sampleTrips()[0];
  t.stops[0].place = { ...t.stops[0].place, lat: Infinity };
  assert.match(validateTrip(t), /latitude/);
  t.stops[0].place.lat = 41;
  t.stops[1].arrival = "2025-05-07";
  assert.match(validateTrip(t), /overlap/);
});
test("supports repeated visits and counts inclusive trip duration", () => {
  const t = sampleTrips()[0];
  assert.equal(tripDays(t), 13);
  const st = structuredClone(t.stops[0]);
  st.id = "return";
  st.arrival = "2025-05-18";
  st.departure = "2025-05-20";
  t.stops.unshift(st);
  assert.equal(validateTrip(t), null);
  assert.equal(tripDays(t), 17);
  assert.equal(sortedStops(t)[0].arrival, "2025-05-04");
  assert.equal(placeKey(st.place), placeKey(t.stops[1].place));
});
