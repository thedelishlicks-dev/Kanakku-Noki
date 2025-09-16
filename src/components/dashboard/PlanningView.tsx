"use client";

import EventPlanner from "../events/EventPlanner";
import GoalsTracker from "../goals/GoalsTracker";
import EventsDashboard from "../events/EventsDashboard";

export default function PlanningView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <GoalsTracker />
         <EventsDashboard />
       </div>
       <div className="mt-6">
        <EventPlanner />
       </div>
    </div>
  );
}