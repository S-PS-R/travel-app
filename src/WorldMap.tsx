import React, { useMemo, useState } from "react";
import { View, Text, Platform } from "react-native";
import Svg, { Path, Circle, G, Text as SvgText } from "react-native-svg";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import { type Place, type Trip, placeKey, isVisited } from "./model";
import { Button, colors, s } from "./ui";
const countries = (
  feature(
    world as never,
    world.objects.countries as never,
  ) as unknown as GeoJSON.FeatureCollection
).features;
export default function WorldMap({
  trips,
  selected,
  onSelect,
}: {
  trips: Trip[];
  selected: string | null;
  onSelect: (place: Place) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 0]);
  const pins = useMemo(
    () =>
      Array.from(
        new Map(
          trips
            .flatMap((t) => t.stops)
            .map((stop) => [placeKey(stop.place), stop.place]),
        ).values(),
      ),
    [trips],
  );
  const visited = new Set(
    trips.flatMap((t) =>
      t.stops
        .filter(isVisited)
        .map((stop) => String(Number(stop.place.countryId))),
    ),
  );
  const projection = geoNaturalEarth1().scale(170).translate([500, 270]);
  const path = geoPath(projection);
  const size = 1000 / zoom,
    height = 540 / zoom;
  return (
    <View
      style={{
        backgroundColor: "#eaf3f4",
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.line,
      }}
    >
      <View style={[s.spread, { padding: 20, flexWrap: "wrap" }]}>
        <Text style={s.eyebrow}>YOUR WORLD, ONE PLACE AT A TIME</Text>
        <View style={s.row}>
          <Text style={s.muted}>● Visited</Text>
          <Text style={s.muted}>○ Planned</Text>
        </View>
      </View>
      <Svg
        width="100%"
        height={410}
        viewBox={`${500 - size / 2 + center[0]} ${270 - height / 2 + center[1]} ${size} ${height}`}
        accessibilityLabel="World map showing your destinations"
      >
        <Path
          d={path(geoGraticule10()) ?? ""}
          stroke="#dce9eb"
          strokeWidth={0.6}
          fill="none"
        />
        {countries
          .filter((c) => c.id !== "010")
          .map((c, index) => (
            <Path
              key={c.id ?? `region-${index}`}
              d={path(c) ?? ""}
              fill={visited.has(String(Number(c.id))) ? "#8ac4b3" : "#d5e3e1"}
              stroke="#f2f7f5"
              strokeWidth={0.6}
            />
          ))}
        {pins.map((p) => {
          const point = projection([p.lon, p.lat]);
          if (!point) return null;
          const active = selected === placeKey(p);
          const past = trips.some((t) =>
            t.stops.some(
              (st) => placeKey(st.place) === placeKey(p) && isVisited(st),
            ),
          );
          return (
            <G
              key={placeKey(p)}
              onPress={Platform.OS === 'web' ? undefined : () => onSelect(p)}
              onClick={Platform.OS === 'web' ? () => onSelect(p) : undefined}
              tabIndex={Platform.OS === 'web' ? 0 : undefined}
              role={Platform.OS === 'web' ? 'button' : undefined}
              onKeyDown={Platform.OS === 'web' ? (event: {key: string; preventDefault: () => void}) => {if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(p);}} : undefined}
              accessibilityRole="button"
              accessibilityLabel={`Open ${p.city}`}
            >
              <Circle
                cx={point[0]}
                cy={point[1]}
                r={12 / zoom}
                fill="transparent"
              />
              {active && (
                <Circle
                  cx={point[0]}
                  cy={point[1]}
                  r={12 / zoom}
                  fill="#147e7828"
                />
              )}
              <Circle
                cx={point[0]}
                cy={point[1]}
                r={(active ? 6 : 4) / zoom}
                fill={past ? "#147e78" : "white"}
                stroke={past ? "white" : "#147e78"}
                strokeWidth={2 / zoom}
              />
              {(active || zoom > 1.5) && (
                <SvgText
                  x={point[0] + 9 / zoom}
                  y={point[1] - 8 / zoom}
                  fontSize={13 / zoom}
                  fontWeight="600"
                  fill={colors.ink}
                >
                  {p.city}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
      <View style={[s.spread, { padding: 16, flexWrap: "wrap" }]}>
        <Text style={[s.muted, { fontSize: 12 }]}>
          Map: Natural Earth · Select a pin to revisit a place
        </Text>
        <View style={[s.row, { gap: 5, flexWrap: "wrap" }]}>
          {zoom > 1 && (
            <>
              <Button
                quiet
                onPress={() => setCenter(([x, y]) => [x - 80 / zoom, y])}
              >
                ←
              </Button>
              <Button
                quiet
                onPress={() => setCenter(([x, y]) => [x + 80 / zoom, y])}
              >
                →
              </Button>
              <Button
                quiet
                onPress={() => setCenter(([x, y]) => [x, y - 60 / zoom])}
              >
                ↑
              </Button>
              <Button
                quiet
                onPress={() => setCenter(([x, y]) => [x, y + 60 / zoom])}
              >
                ↓
              </Button>
            </>
          )}
          <Button quiet onPress={() => setZoom((z) => Math.max(1, z / 1.5))}>
            −
          </Button>
          <Button
            quiet
            onPress={() => {
              if (selected) {
                const p = pins.find((p) => placeKey(p) === selected);
                if (p) {
                  const xy = projection([p.lon, p.lat])!;
                  setCenter([xy[0] - 500, xy[1] - 270]);
                }
              }
              setZoom((z) => Math.min(6, z * 1.5));
            }}
          >
            +
          </Button>
          <Button
            quiet
            onPress={() => {
              setZoom(1);
              setCenter([0, 0]);
            }}
          >
            Reset
          </Button>
        </View>
      </View>
    </View>
  );
}
