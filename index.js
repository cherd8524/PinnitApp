/**
 * Custom entry so Expo Router gets a valid require.context('./app').
 * Use this when EXPO_ROUTER_APP_ROOT is not injected (e.g. cache/build issues).
 */
import "@expo/metro-runtime";
import "expo-router/build/fast-refresh";

import { Head } from "expo-router/build/head";
import { ExpoRoot } from "expo-router/build/ExpoRoot";
import { renderRootComponent } from "expo-router/build/renderRootComponent";

// Match route files in app/, exclude +api, +html, +middleware (same idea as expo-router _ctx)
const ctx = require.context(
  "./app",
  true,
  /^\.\/(?!.*(\+api|\+html|\+middleware)).*\.(tsx|ts|jsx|js)$/
);

function App() {
  return (
    <Head.Provider>
      <ExpoRoot context={ctx} />
    </Head.Provider>
  );
}

renderRootComponent(App);
