import { parsePlan, type TravelPlan } from "./plannerModel.ts";
import { validDate } from "./model.ts";
export type SavedPlan = TravelPlan & { id: string; updatedAt: string };
export type PlanLibrary = { version: 2; plans: SavedPlan[] };
export const PLAN_LIBRARY_KEY = "veyfar.plans.v2";
export const LEGACY_PLAN_KEY = "veyfar.planner.v1";

export function planIssue(plan: TravelPlan): string | null {
  if (!plan.title.trim()) return "Give your journey a name.";
  if (!plan.stops.length) return "Add at least one destination before saving your plan.";
  if (plan.stops.some(st=>!st.place.city.trim()||!st.place.country.trim())) return "Give each stop a city and country.";
  if ((plan.startDate && !validDate(plan.startDate)) || (plan.endDate && !validDate(plan.endDate))) return "Use real dates in YYYY-MM-DD format, or leave dates blank.";
  if(plan.startDate&&plan.endDate&&plan.endDate<plan.startDate)return "The end date must be on or after the start date.";
  return null;
}
export function loadPlanLibrary(raw: string | null, legacy: string | null): PlanLibrary {
  if (raw !== null) {
    const library=JSON.parse(raw);
    if(library?.version!==2||!Array.isArray(library.plans))throw new Error("Could not read saved journeys.");
    const ids=new Set<string>();
    for(const saved of library.plans) {
      if(typeof saved?.id!=="string"||!saved.id||ids.has(saved.id)||typeof saved.updatedAt!=="string"||Number.isNaN(Date.parse(saved.updatedAt)))throw new Error("Invalid saved journey.");
      const plan=parsePlan(JSON.stringify(saved));
      if(planIssue(plan))throw new Error("Invalid saved journey.");
      ids.add(saved.id);
    }
    return library;
  }
  const plan=legacy?parsePlan(legacy):null;
  return {version:2,plans:plan?.stops.length?[{...plan,id:"legacy-plan",updatedAt:new Date(0).toISOString()}]:[]};
}
export function saveToLibrary(library: PlanLibrary, plan: TravelPlan, id: string): PlanLibrary {
  const issue=planIssue(plan);if(issue)throw new Error(issue);
  return {version:2,plans:[{...plan,title:plan.title.trim(),id,updatedAt:new Date().toISOString()},...library.plans.filter(p=>p.id!==id)]};
}
