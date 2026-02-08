import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { PinnitItem } from "@/types/pinnit";
import { getLocationName } from "@/utils/geocoding";
import { formatTimeAgo } from "@/utils/format";
import { loadMapStyle } from "@/utils/storage";
import { loadPins, savePins, runPendingSync } from "@/utils/pinsSync";
import { useNetworkStatus } from "@/utils/network";
import { supabase } from "@/lib/supabase";

const FALLBACK_REGION: Region = {
  latitude: 13.7563,
  longitude: 100.5018,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    latitude?: string;
    longitude?: string;
    name?: string;
    timestamp?: string;
  }>();
  const mapRef = useRef<MapView | null>(null);

  const [region, setRegion] = useState<Region | null>(FALLBACK_REGION);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    name?: string;
  } | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinName, setPinName] = useState("");
  const [isLoadingPinName, setIsLoadingPinName] = useState(false);
  const [pinLocation, setPinLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [allPins, setAllPins] = useState<PinnitItem[]>([]);
  const [mapType, setMapType] = useState<
    "standard" | "satellite" | "hybrid" | "terrain"
  >("standard");

  const isDark = colorScheme === "dark";
  const isOnline = useNetworkStatus();
  const backgroundColor = useMemo(
    () => (isDark ? "#020617" : "#F8FAFC"),
    [isDark]
  );

  // Function to animate to selected location
  const animateToSelectedLocation = useCallback((lat: number, lon: number) => {
    const targetRegion: Region = {
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setRegion(targetRegion);

    // Wait for map to be ready, then animate
    if (isMapReady && mapRef.current) {
      mapRef.current.animateToRegion(targetRegion, 800);
    } else {
      // If map not ready yet, try again after a short delay
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.animateToRegion(targetRegion, 800);
        }
      }, 300);
    }
  }, [isMapReady]);

  // Handle params from navigation
  useEffect(() => {
    if (params.latitude && params.longitude) {
      const lat = parseFloat(params.latitude);
      const lon = parseFloat(params.longitude);

      if (!isNaN(lat) && !isNaN(lon)) {
        setSelectedLocation({
          latitude: lat,
          longitude: lon,
          name: params.name,
        });

        // Animate to location
        animateToSelectedLocation(lat, lon);
      }
    } else {
      // If no params, clear selected location
      setSelectedLocation(null);
    }
  }, [params.latitude, params.longitude, params.name, params.timestamp, isMapReady, animateToSelectedLocation]);

  // Use focus effect to ensure animation when screen is focused and params exist
  // Also reload pins when screen is focused (to show newly added pins from other screens)
  useFocusEffect(
    useCallback(() => {
      // Reload pins when screen is focused
      const loadAllPins = async () => {
        try {
          if (isOnline) await runPendingSync();
          const pins = await loadPins(isOnline);
          setAllPins(pins);
        } catch (error) {
          console.error("Error loading pins:", error);
        }
      };
      loadAllPins();

      // Check params when screen is focused
      if (params.latitude && params.longitude) {
        const lat = parseFloat(params.latitude);
        const lon = parseFloat(params.longitude);

        if (!isNaN(lat) && !isNaN(lon)) {
          setSelectedLocation({
            latitude: lat,
            longitude: lon,
            name: params.name,
          });

          // Animate to location when map is ready
          if (isMapReady && mapRef.current) {
            setTimeout(() => {
              animateToSelectedLocation(lat, lon);
            }, 200);
          }
        }
      } else {
        // If no params, clear selected location
        setSelectedLocation(null);
      }
    }, [params.latitude, params.longitude, params.name, params.timestamp, isMapReady, animateToSelectedLocation, isOnline])
  );

  // Re-animate when map becomes ready and we have a selected location
  useEffect(() => {
    if (isMapReady && selectedLocation) {
      animateToSelectedLocation(
        selectedLocation.latitude,
        selectedLocation.longitude
      );
    }
  }, [isMapReady, selectedLocation]);

  const handleMapReady = () => {
    setIsMapReady(true);

    // If we have a selected location, animate to it
    if (selectedLocation) {
      setTimeout(() => {
        animateToSelectedLocation(
          selectedLocation.latitude,
          selectedLocation.longitude
        );
      }, 100);
    }
  };

  // Open pin modal for a given coordinate
  const openPinModalForCoordinate = async (coordinate: {
    latitude: number;
    longitude: number;
  }) => {
    setPinLocation({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });
    setShowPinModal(true);
    setPinName("");
    setIsLoadingPinName(true);

    try {
      const locationName = await getLocationName(
        coordinate.latitude,
        coordinate.longitude
      );
      setPinName(locationName);
    } catch (error) {
      console.error("Error fetching location name:", error);
      setPinName("ชื่อตำแหน่ง");
    } finally {
      setIsLoadingPinName(false);
    }
  };

  const handleMapPress = async (event: any) => {
    const { coordinate } = event.nativeEvent;
    if (coordinate) {
      openPinModalForCoordinate(coordinate);
    }
  };

  const handleConfirmPin = async () => {
    if (!pinLocation) return;

    const finalName = pinName.trim() || "ชื่อตำแหน่ง";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const ownerLabel = session?.user
        ? (session.user.user_metadata?.full_name ?? session.user.user_metadata?.username ?? "บัญชีของฉัน")
        : "เครื่องนี้";

      const existingPins = await loadPins(isOnline);
      const timestamp = Date.now();
      const newPin: PinnitItem = {
        id: `pin_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        name: finalName,
        latitude: pinLocation.latitude,
        longitude: pinLocation.longitude,
        createdAt: formatTimeAgo(timestamp),
        timestamp: timestamp,
        ownerLabel,
      };

      const updatedPins = [newPin, ...existingPins];
      await savePins(updatedPins, isOnline);
      setAllPins(updatedPins); // Update all pins state

      setShowPinModal(false);
      setPinName("");
      setPinLocation(null);
      Alert.alert("สำเร็จ", "ปักหมุดตำแหน่งเรียบร้อยแล้ว!");
    } catch (error) {
      console.error("Error pinning location:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถปักหมุดตำแหน่งได้ กรุณาลองอีกครั้ง");
    }
  };

  const handleCancelPin = () => {
    setShowPinModal(false);
    setPinName("");
    setPinLocation(null);
  };

  const handleFocusSelectedLocation = () => {
    if (selectedLocation) {
      animateToSelectedLocation(
        selectedLocation.latitude,
        selectedLocation.longitude
      );
    }
  };

  const handleClearSelectedLocation = () => {
    setSelectedLocation(null);
    // Clear params by replacing the route without params
    // This prevents location from reappearing when returning to map
    router.replace({
      pathname: "/map",
    });
    // Reset to current location if available
    if (currentLocation) {
      const nextRegion: Region = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 600);
    }
  };

  // Load all pins and map style when component mounts
  useEffect(() => {
    const loadAllPins = async () => {
      try {
        const pins = await loadPins(isOnline);
        setAllPins(pins);
      } catch (error) {
        console.error("Error loading pins:", error);
      }
    };
    const loadMapStylePref = async () => {
      try {
        const style = await loadMapStyle();
        setMapType(style);
      } catch (error) {
        console.error("Error loading map style:", error);
      }
    };
    loadAllPins();
    loadMapStylePref();
  }, [isOnline]);

  // Reload pins and map style when screen is focused (e.g. returning from settings)
  useFocusEffect(
    useCallback(() => {
      const loadAllPins = async () => {
        try {
          if (isOnline) await runPendingSync();
          const pins = await loadPins(isOnline);
          setAllPins(pins);
        } catch (error) {
          console.error("Error loading pins:", error);
        }
      };
      const loadMapStylePref = async () => {
        try {
          const style = await loadMapStyle();
          setMapType(style);
        } catch (error) {
          console.error("Error loading map style:", error);
        }
      };
      loadAllPins();
      loadMapStylePref();
    }, [isOnline])
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

      // If we have a selected location from params, don't override it
      if (selectedLocation) {
        return;
      }

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
  }, [selectedLocation]);


  const handleBack = () => {
    // Navigate to home tab instead of going back
    // Since we're in a tab navigator, we can use router.replace to switch tabs
    router.replace("/");
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

  const handleZoomIn = () => {
    if (!region) return;

    const zoomFactor = 0.7; // Zoom in (smaller delta = more zoomed in)
    const newLatitudeDelta = Math.max(0.001, region.latitudeDelta * zoomFactor);
    const newLongitudeDelta = Math.max(0.001, region.longitudeDelta * zoomFactor);

    const newRegion: Region = {
      latitude: region.latitude,
      longitude: region.longitude,
      latitudeDelta: newLatitudeDelta,
      longitudeDelta: newLongitudeDelta,
    };

    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 200);
  };

  const handleZoomOut = () => {
    if (!region) return;

    const zoomFactor = 1.4; // Zoom out (larger delta = more zoomed out)
    const newLatitudeDelta = Math.min(10, region.latitudeDelta * zoomFactor);
    const newLongitudeDelta = Math.min(10, region.longitudeDelta * zoomFactor);

    const newRegion: Region = {
      latitude: region.latitude,
      longitude: region.longitude,
      latitudeDelta: newLatitudeDelta,
      longitudeDelta: newLongitudeDelta,
    };

    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 200);
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
            mapType={mapType}
            onRegionChangeComplete={setRegion}
            onMapReady={handleMapReady}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={false}
            followsUserLocation={false}
            userLocationPriority="high"
          >
            {/* Display all pinned locations */}
            {allPins.map((pin) => (
              <Marker
                key={pin.id}
                identifier={`pin-${pin.id}`}
                coordinate={{
                  latitude: pin.latitude,
                  longitude: pin.longitude,
                }}
                title={pin.name}
                description={`${pin.latitude.toFixed(6)}, ${pin.longitude.toFixed(6)}`}
                tappable={true}
              />
            ))}
            {/* Display selected location marker (from View Map) if exists */}
            {selectedLocation && (
              <Marker
                identifier="selected-location-marker"
                coordinate={{
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                }}
                title={selectedLocation.name || "ตำแหน่งที่เลือก"}
                description={`${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`}
                tappable={true}
                pinColor="#007AFF" // Different color for selected location
              />
            )}
          </MapView>
        </View>

        {selectedLocation ? (
          <View style={styles.locationPill}>
            <TouchableOpacity
              style={styles.locationPillContent}
              onPress={handleFocusSelectedLocation}
              activeOpacity={0.8}
            >
              <Ionicons
                name="pin"
                size={16}
                color="#007AFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.locationPillText} numberOfLines={1}>
                {selectedLocation.name || "ตำแหน่งที่เลือก"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClearSelectedLocation}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={16} color="#E5E7EB" />
            </TouchableOpacity>
          </View>
        ) : currentLocation ? (
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
        ) : null}

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

        <View style={styles.zoomControls}>
          <TouchableOpacity
            onPress={handleZoomIn}
            activeOpacity={0.8}
            style={styles.zoomButton}
          >
            <Ionicons
              name="add"
              size={24}
              color="#111827"
            />
          </TouchableOpacity>
          <View style={styles.zoomDivider} />
          <TouchableOpacity
            onPress={handleZoomOut}
            activeOpacity={0.8}
            style={styles.zoomButton}
          >
            <Ionicons
              name="remove"
              size={24}
              color="#111827"
            />
          </TouchableOpacity>
        </View>

        {/* Pin Location Modal */}
        <Modal
          visible={showPinModal}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCancelPin}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
                },
              ]}
            >
              <Text
                style={[
                  styles.modalTitle,
                  { color: isDark ? "#F9FAFB" : "#020617" },
                ]}
              >
                ปักหมุดตำแหน่ง
              </Text>
              <Text
                style={[
                  styles.modalSubtitle,
                  { color: isDark ? "#9CA3AF" : "#6B7280" },
                ]}
              >
                กรอกชื่อตำแหน่งนี้
              </Text>

              <View style={styles.inputContainer}>
                {isLoadingPinName ? (
                  <View style={styles.inputLoadingContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text
                      style={[
                        styles.inputLoadingText,
                        { color: isDark ? "#9CA3AF" : "#6B7280" },
                        { marginLeft: 8 },
                      ]}
                    >
                      กำลังดึงชื่อตำแหน่ง...
                    </Text>
                  </View>
                ) : (
                  <TextInput
                    style={[
                      styles.nameInput,
                      {
                        backgroundColor: isDark ? "#111827" : "#F9FAFB",
                        color: isDark ? "#F9FAFB" : "#020617",
                        borderColor: isDark ? "#374151" : "#E5E7EB",
                      },
                    ]}
                    placeholder="ชื่อตำแหน่ง"
                    placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                    value={pinName}
                    onChangeText={setPinName}
                    autoFocus={true}
                  />
                )}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.cancelButton,
                    {
                      borderColor: isDark ? "#374151" : "#E5E7EB",
                    },
                  ]}
                  onPress={handleCancelPin}
                >
                  <Text
                    style={[
                      styles.cancelButtonText,
                      { color: isDark ? "#F9FAFB" : "#020617" },
                    ]}
                  >
                    ยกเลิก
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleConfirmPin}
                  disabled={isLoadingPinName}
                >
                  <Text style={styles.confirmButtonText}>ปักหมุด</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    maxWidth: "85%",
    zIndex: 1,
  },
  locationPillContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#E5E7EB",
    marginRight: 8,
  },
  closeButton: {
    marginLeft: 4,
    padding: 2,
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
    zIndex: 1,
  },
  recenterButton: {
    position: "absolute",
    bottom: 100,
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
  zoomControls: {
    position: "absolute",
    bottom: 164,
    right: 24,
    width: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  zoomButton: {
    height: 48,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomDivider: {
    width: "80%",
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  inputLoadingText: {
    fontSize: 14,
  },
  nameInput: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  confirmButton: {
    backgroundColor: "#007AFF",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
