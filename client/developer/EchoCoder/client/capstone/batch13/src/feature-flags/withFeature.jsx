import React from "react";
import * as FF from "./FeatureFlags.js";

/**
 * withFeature(Component, 'FlagName')
 * Renders null if the flag is off. Wrap critical panels to toggle.
 */
export default function withFeature(Component, flag){
  return function FeatureGated(props){
    return FF.isOn(flag) ? <Component {...props} /> : null;
  }
}
