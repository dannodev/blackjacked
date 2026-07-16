import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function StatsPage() {
  return (
    <ComingSoon
      title="Stats"
      phase="Phase 3"
      blurb="Weight trends, deficit-vs-loss overlay, and a progress photos carousel."
      icon={<BarChart3 className="size-6" />}
    />
  );
}