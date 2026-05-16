/** * Builder.io Widget Registration * Registers all custom components as Builder widgets */ // Import all custom components
import PublishTogglePanel from "@/components/scheduler/PublishTogglePanel";
import EmployeeSkillMatrix from "@/components/lms/EmployeeSkillMatrix";
import MultiPropertyDashboard from "@/components/analytics/MultiPropertyDashboard";
import LaborSurface3D from "@/components/analytics/LaborSurface3D";
import PredictiveOpsDashboard from "@/components/analytics/PredictiveOpsDashboard";
import LanguageSelector from "@/components/system/LanguageSelector"; /** * Register all widgets with Builder.io */
export function registerBuilderWidgets() {
  const luccca = (window as any).LUCCCA;
  if (!luccca?.registerWidget) {
    console.warn("Builder.io LUCCCA not available");
    return;
  } // Scheduler widgets luccca.registerWidget("PublishTogglePanel", PublishTogglePanel); // LMS widgets luccca.registerWidget("EmployeeSkillMatrix", EmployeeSkillMatrix); // Analytics widgets luccca.registerWidget("MultiPropertyDashboard", MultiPropertyDashboard); luccca.registerWidget("LaborSurface3D", LaborSurface3D); luccca.registerWidget("PredictiveOpsDashboard", PredictiveOpsDashboard); // System widgets luccca.registerWidget("LanguageSelector", LanguageSelector); console.log("✓ All Builder.io widgets registered");
} /** * Get all registered widget metadata */
export function getWidgetMetadata() {
  return [
    {
      id: "PublishTogglePanel",
      name: "Publish Schedule Toggle",
      description: "Publish/reopen schedules with acknowledgement tracking",
      category: "Scheduling",
      icon: "📋",
    },
    {
      id: "EmployeeSkillMatrix",
      name: "Employee Skills",
      description: "Display and manage employee skill certifications",
      category: "LMS",
      icon: "🎓",
    },
    {
      id: "MultiPropertyDashboard",
      name: "Multi-Property Dashboard",
      description: "Organization-wide metrics and property comparison",
      category: "Analytics",
      icon: "📊",
    },
    {
      id: "LaborSurface3D",
      name: "3D Labor Trends",
      description: "3D visualization of labor % trends",
      category: "Analytics",
      icon: "📈",
    },
    {
      id: "PredictiveOpsDashboard",
      name: "Predictive Operations",
      description:
        "AI-driven anomaly detection across labor, maintenance, and finance",
      category: "Analytics",
      icon: "🔮",
    },
    {
      id: "LanguageSelector",
      name: "Language Selector",
      description: "Switch between 6 languages (EN, FR, IT, DE, PT, ES)",
      category: "System",
      icon: "🌐",
    },
  ];
}
