import { useEffect, useState } from "react";

let netInfoModule: { fetch: () => Promise<{ isConnected: boolean | null }>; addEventListener: (cb: (s: { isConnected: boolean | null }) => void) => () => void } | null = null;
try {
  netInfoModule = require("@react-native-community/netinfo");
} catch {
  // NetInfo not installed; assume online
}

export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    if (!netInfoModule) return;
    netInfoModule.fetch().then((s) => setIsOnline(s.isConnected ?? true));
    const unsub = netInfoModule.addEventListener((s) =>
      setIsOnline(s.isConnected ?? true)
    );
    return () => unsub();
  }, []);
  return isOnline;
}
