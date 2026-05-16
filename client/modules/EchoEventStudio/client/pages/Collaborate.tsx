import PlaceholderPage from "./PlaceholderPage";
import { Users } from "lucide-react";
const features = [
  "Real-time collaborative design editing",
  "Virtual conference room integration",
  "Spatial commenting and feedback system",
  "Version control with AI context understanding",
  "Team permission and role management",
  "Automated compliance and accessibility checks",
  "Intelligent feedback aggregation",
  "Cross-platform synchronization",
];
export default function Collaborate() {
  return (
    <PlaceholderPage
      title="Collaborative Workflows"
      description="Seamless collaboration platform for teams, clients, and vendors with real-time editing, virtual meetings, and intelligent feedback systems."
      icon={<Users className="h-8 w-8 text-primary" />}
      features={features}
    />
  );
}
