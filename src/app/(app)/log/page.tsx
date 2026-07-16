import { Plus } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function LogPage() {
  return (
    <ComingSoon
      title="Quick log"
      phase="Phase 1"
      blurb="One-thumb quick log for meals and workouts. The Deficit Ring fills with every entry."
      icon={<Plus className="size-6" />}
    />
  );
}