import React from "react";
import RecoveryGuard from "../RecoveryGuard.js";
export default function withRecovery(Component){
  return function Recovered(props){
    return <RecoveryGuard><Component {...props} /></RecoveryGuard>;
  }
}
