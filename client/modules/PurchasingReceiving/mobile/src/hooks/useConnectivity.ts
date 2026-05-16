import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
interface NetInfoState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}
export function useConnectivity() {
  const [state, setState] = useState<NetInfoState>({
    isConnected: true,
    isInternetReachable: true,
    type: "unknown",
  });
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
      });
    });
    return () => unsubscribe();
  }, []);
  return state;
}
