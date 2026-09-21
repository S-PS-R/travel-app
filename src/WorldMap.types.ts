import type { Place, Trip } from "./model";
import type { PlanStop } from "./plannerModel";
import type { FriendPin } from "./friendsModel";
export type WorldMapProps = {
  trips: Trip[];
  selected: string | null;
  onSelect: (place: Place) => void;
  planner?: boolean;
  route?: PlanStop[];
  onAddPlace?: (place: Place) => void;
  friendPins?: FriendPin[];
};
