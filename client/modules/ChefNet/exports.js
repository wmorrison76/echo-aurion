// Main shell
export { default as ChefNetShell } from "./ChefNetShell.jsx";

// Panels
export { default as ChefNetFeedPanel } from "./panels/ChefNetFeedPanel.jsx";
export { default as ChefNetVentingPanel } from "./panels/ChefNetVentingPanel.jsx";
export { default as RecognitionPanel } from "./panels/RecognitionPanel.jsx";
export { default as JobBoardPanel } from "./panels/JobBoardPanel.jsx";
export { default as WellbeingPanel } from "./panels/WellbeingPanel.jsx";
export { default as CultureAnalyticsPanel } from "./panels/CultureAnalyticsPanel.jsx";
export { default as PeerMentorPanel } from "./panels/PeerMentorPanel.jsx";
export { default as ResourcesPanel } from "./panels/ResourcesPanel.jsx";
export { default as AdminCultureSettings } from "./panels/AdminCultureSettings.jsx";

// Badge & recognition system
export { default as ChefNetProfilePanel } from "./panels/ChefNetProfilePanel.jsx";
export { default as RecognitionTimelinePanel } from "./panels/RecognitionTimelinePanel.jsx";
export { default as CultureDashboardPanel } from "./panels/CultureDashboardPanel.jsx";

// Utilities
export { FireworksContainer, triggerFireworks } from "./utils/fireworks.jsx";
export { ChefNetNotificationBadge, ChefNetIconWithBadge, useChefNetUnreadCount } from "./utils/ChefNetBadge.jsx";

// Shared utilities
export { useChefNet, useChefNetState, useChefNetDispatch, ChefNetProvider } from "./state/chefnetStore.jsx";
export {
  loadSnapshot,
  createPost,
  createVent,
  createRecognition,
  createJobPost,
} from "./api/apiClient.js";

// Badge data
export { default as chefnetBadges } from "../../shared/chefnet_badges.json";
