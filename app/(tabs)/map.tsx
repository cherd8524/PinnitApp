import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { useRouter } from "expo-router";

const FALLBACK_REGION: Region = {
  latitude: 13.7563,
  longitude: 100.5018,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);

  const [region, setRegion] = useState<Region | null>(FALLBACK_REGION);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const isDark = colorScheme === "dark";
  const backgroundColor = useMemo(
    () => (isDark ? "#020617" : "#F8FAFC"),
    [isDark]
  );

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setHasPermission(false);
        return;
      }

      setHasPermission(true);

      // Get initial location
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const nextRegion: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

      setRegion(nextRegion);
      setCurrentLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      mapRef.current?.animateToRegion(nextRegion, 600);

      // Watch position for real-time updates
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // Update every 1 second
          distanceInterval: 5, // Update every 5 meters
        },
        (location) => {
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      );
    })();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleRecenter = async () => {
    if (!hasPermission || !currentLocation) return;

    const nextRegion: Region = {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };

    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 600);
  };

  if (hasPermission === null || !region) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor }]}
    >
      <View style={styles.screen}>
        <View style={styles.mapCard}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            onRegionChangeComplete={setRegion}
            showsUserLocation={true}
            showsMyLocationButton={false}
            followsUserLocation={false}
            userLocationPriority="high"
          />
        </View>

        {currentLocation && (
          <View style={styles.locationPill}>
            <Ionicons
              name="location-sharp"
              size={16}
              color="#007AFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.locationPillText}>
              {currentLocation.latitude.toFixed(5)}°,{" "}
              {currentLocation.longitude.toFixed(5)}°
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.9}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRecenter}
          activeOpacity={0.9}
          style={styles.recenterButton}
        >
          <Ionicons
            name="locate-outline"
            size={22}
            color="#ffffff"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  screen: {
    flex: 1,
  },
  mapCard: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  locationPill: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  locationPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#E5E7EB",
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  recenterButton: {
    position: "absolute",
    bottom: 32,
    right: 24,
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 5,
  },
});
