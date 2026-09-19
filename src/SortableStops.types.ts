import type { ReactNode } from "react";
import type { PlanStop } from "./plannerModel";
export type SortableStopsProps = {
  stops:PlanStop[]; compact:boolean; disabled:boolean;
  onMove:(fromId:string,toId:string)=>void;
  onDragging:(dragging:boolean)=>void;
  renderStop:(stop:PlanStop,index:number,handle:ReactNode)=>ReactNode;
};
