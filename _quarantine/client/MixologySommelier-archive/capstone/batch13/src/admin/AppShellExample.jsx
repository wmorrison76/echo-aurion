/**
 * AppShellExample.jsx
 * Shows how to wire feature flags into your app shell.
 * You can copy the logic into your real shell/router.
 */
import React from "react";
import withFeature from "../feature-flags/withFeature.jsx";
import { FeatureControlPanel } from "./index.js";

// Import your real panels (paths may vary in your project)
import { EchoMixologyPanel } from "../modules/EchoMixologyAI/EchoMixologyPanel.jsx";
import { SommelierPanel } from "../modules/EchoSommelier/components/SommelierPanel.jsx";

const MixologyGated = withFeature(EchoMixologyPanel, "EchoMixologyAI");
const SommelierGated = withFeature(SommelierPanel, "EchoSommelier");

export default function AppShellExample(){
  return (
    <div className="grid gap-4">
      <FeatureControlPanel />
      <MixologyGated />
      <SommelierGated />
    </div>
  );
}
