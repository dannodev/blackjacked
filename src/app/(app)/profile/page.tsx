import { User } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function ProfilePage() {
  return (
    <ComingSoon
      title="Profile"
      phase="Phase 1"
      blurb="Your stats, goals, and the setup wizard that powers the calorie math."
      icon={<User className="size-6" />}
    />
  );
}