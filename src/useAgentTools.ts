import { useEffect, useRef } from "react";
import type { Trip } from "./model";
type Context = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function useAgentTools(trips: Trip[], open: (trip: Trip) => void) {
  const state = useRef({ trips, open });
  state.current = { trips, open };
  useEffect(() => {
    const context =
      typeof document === "undefined"
        ? undefined
        : (document as Document & { modelContext?: Context }).modelContext;
    if (!context?.registerTool) return;
    const life = new AbortController();
    const register = (tool: Parameters<Context["registerTool"]>[0]) => {
      try {
        Promise.resolve(
          context.registerTool(tool, { signal: life.signal }),
        ).catch(() => {});
      } catch {
        /* Browsers without stable WebMCP support use the visible interface. */
      }
    };
    register({
      name: "list_trips",
      description:
        "List the trips currently displayed in the travel journal. May include labeled sample trips when the demo is displayed.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () =>
        state.current.trips.map((t) => ({
          id: t.id,
          title: t.title,
          destinations: t.stops.map((st) => st.place.city),
        })),
    });
    register({
      name: "open_trip_journal",
      description:
        "Open an existing displayed trip in the visible journal. Does not create or modify a trip.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input) => {
        if (
          !input ||
          typeof input !== "object" ||
          !("id" in input) ||
          typeof input.id !== "string"
        )
          throw new Error("A trip id is required.");
        const trip = state.current.trips.find((t) => t.id === input.id);
        if (!trip) throw new Error("Trip not found in the current journal.");
        state.current.open(trip);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        return { opened: trip.id };
      },
    });
    return () => life.abort();
  }, []);
}
