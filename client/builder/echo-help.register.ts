import { Builder } from "@builder.io/react";
import EchoHelpOrb from "./components/EchoHelpOrb";
import ContextHelpTooltip from "./components/ContextHelpTooltip";
import SkillDashboard from "./components/SkillDashboard";
import BadgeWall from "./components/BadgeWall";
import LeaderboardPanel from "./components/LeaderboardPanel";
import CertificateCard from "./components/CertificateCard";

export function registerEchoHelpComponents() {
  Builder.registerComponent(EchoHelpOrb, {
    name: "EchoHelpOrb",
    description: "Floating help orb for asking questions and accessing missions",
    inputs: [
      {
        name: "defaultMode",
        type: "string",
        enum: ["ask", "search", "missions"],
        defaultValue: "ask",
        description: "Initial tab to show when orb opens",
      },
      {
        name: "showAskEcho",
        type: "boolean",
        defaultValue: true,
        description: "Show Ask Echo tab",
      },
      {
        name: "showSearch",
        type: "boolean",
        defaultValue: true,
        description: "Show Search KB tab",
      },
      {
        name: "showMissions",
        type: "boolean",
        defaultValue: true,
        description: "Show Missions tab",
      },
      {
        name: "allowedModules",
        type: "list",
        subFields: [{ name: "module", type: "string" }],
        description: "Limit orb to specific modules (empty = all)",
      },
    ],
  });

  Builder.registerComponent(ContextHelpTooltip, {
    name: "ContextHelpTooltip",
    description: "Question mark icon that shows contextual help on hover",
    inputs: [
      {
        name: "contextId",
        type: "string",
        required: true,
        description: "The context ID for this help (e.g., labor-forecast-panel-filters)",
      },
      {
        name: "placement",
        type: "string",
        enum: ["top", "right", "bottom", "left"],
        defaultValue: "top",
        description: "Position of the tooltip",
      },
      {
        name: "iconVariant",
        type: "string",
        enum: ["question", "info", "echo-mini"],
        defaultValue: "question",
        description: "Icon style",
      },
    ],
  });

  Builder.registerComponent(SkillDashboard, {
    name: "SkillDashboard",
    description: "Display user skills and XP progress by domain",
    inputs: [
      {
        name: "skills",
        type: "list",
        subFields: [
          { name: "userId", type: "string" },
          { name: "skillId", type: "string" },
          { name: "xp", type: "number" },
          { name: "level", type: "number" },
          { name: "lastUpdatedAt", type: "string" },
        ],
        description: "Array of user skill states",
      },
      {
        name: "skillDefs",
        type: "list",
        subFields: [
          { name: "id", type: "string" },
          { name: "name", type: "string" },
          { name: "domain", type: "string" },
          { name: "description", type: "string" },
          { name: "maxXp", type: "number" },
        ],
        description: "Skill definitions (name, domain, description)",
      },
    ],
  });

  Builder.registerComponent(BadgeWall, {
    name: "BadgeWall",
    description: "Display earned and locked badges",
    inputs: [
      {
        name: "badgeIds",
        type: "list",
        subFields: [{ name: "id", type: "string" }],
        description: "IDs of earned badges",
      },
      {
        name: "badgeDefs",
        type: "list",
        subFields: [
          { name: "id", type: "string" },
          { name: "name", type: "string" },
          { name: "description", type: "string" },
        ],
        description: "Badge definitions",
      },
    ],
  });

  Builder.registerComponent(LeaderboardPanel, {
    name: "LeaderboardPanel",
    description: "Team leaderboard showing XP and levels",
    inputs: [
      {
        name: "entries",
        type: "list",
        subFields: [
          { name: "userId", type: "string" },
          { name: "displayName", type: "string" },
          { name: "totalXp", type: "number" },
          { name: "level", type: "number" },
        ],
        description: "Leaderboard entries",
      },
    ],
  });

  Builder.registerComponent(CertificateCard, {
    name: "CertificateCard",
    description: "Display a certificate of program completion",
    inputs: [
      {
        name: "userName",
        type: "string",
        required: true,
        description: "Name of the user",
      },
      {
        name: "programName",
        type: "string",
        required: true,
        description: "Name of the learning program",
      },
      {
        name: "completion",
        type: "number",
        defaultValue: 0.8,
        description: "Completion percentage (0-1)",
      },
      {
        name: "issuedAt",
        type: "string",
        description: "ISO date string of when certificate was issued",
      },
    ],
  });
}
