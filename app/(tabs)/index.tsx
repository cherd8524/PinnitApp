import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import { PinnitItem } from "@/types/pinnit";
import { getLocationName } from "@/utils/geocoding";
import { formatTimeAgo } from "@/utils/format";
import { loadPins, savePins } from "@/utils/storage";
import { PinItem } from "@/components/PinItem";

export default function Index() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const [currentLocation, setCurrentLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [pins, setPins] = useState<PinnitItem[]>([]);
    const [isLoadingPins, setIsLoadingPins] = useState(true);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinName, setPinName] = useState("");
    const [isLoadingPinName, setIsLoadingPinName] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingPin, setEditingPin] = useState<PinnitItem | null>(null);
    const [editPinName, setEditPinName] = useState("");

    const isDark = colorScheme === "dark";

    const colors = useMemo(
        () => ({
            background: isDark ? "#020617" : "#F8FAFC",
            card: isDark ? "#020617" : "#FFFFFF",
            textPrimary: isDark ? "#F9FAFB" : "#020617",
            textSecondary: isDark ? "#9CA3AF" : "#6B7280",
        }),
        [isDark]
    );

    // Load pins on mount
    useEffect(() => {
        (async () => {
            const loadedPins = await loadPins();
            setPins(loadedPins);
            setIsLoadingPins(false);
        })();
    }, []);

    // Reload pins when screen is focused (to show newly added pins from Map screen)
    useFocusEffect(
        useCallback(() => {
            const loadAllPins = async () => {
                try {
                    const loadedPins = await loadPins();
                    setPins(loadedPins);
                } catch (error) {
                    console.error("Error loading pins:", error);
                }
            };
            loadAllPins();
        }, [])
    );

    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        (async () => {
            try {
                const { status } =
                    await Location.requestForegroundPermissionsAsync();

                if (status !== "granted") {
                    setIsLoadingLocation(false);
                    return;
                }

                // Get initial location
                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });

                setCurrentLocation({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
                setIsLoadingLocation(false);

                // Watch position for real-time updates
                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 2000, // Update every 2 seconds
                        distanceInterval: 10, // Update every 10 meters
                    },
                    (location) => {
                        setCurrentLocation({
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        });
                    }
                );
            } catch (error) {
                console.error("Error getting location:", error);
                setIsLoadingLocation(false);
            }
        })();

        return () => {
            if (subscription) {
                subscription.remove();
            }
        };
    }, []);

    const handlePinCurrentSpot = async () => {
        if (!currentLocation) return;

        // Show modal and fetch location name
        setShowPinModal(true);
        setPinName("");
        setIsLoadingPinName(true);

        try {
            const locationName = await getLocationName(
                currentLocation.latitude,
                currentLocation.longitude
            );
            setPinName(locationName);
        } catch (error) {
            console.error("Error fetching location name:", error);
            setPinName("Location Name");
        } finally {
            setIsLoadingPinName(false);
        }
    };

    const handleConfirmPin = async () => {
        if (!currentLocation) return;

        const finalName = pinName.trim() || "Location Name";

        try {
            const timestamp = Date.now();
            const newPin: PinnitItem = {
                id: `pin_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
                name: finalName,
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                createdAt: formatTimeAgo(timestamp),
                timestamp: timestamp,
            };

            const updatedPins = [newPin, ...pins];
            await savePins(updatedPins);
            setPins(updatedPins);

            setShowPinModal(false);
            setPinName("");
            Alert.alert("Success", "Location pinned successfully!");
        } catch (error) {
            console.error("Error pinning location:", error);
            Alert.alert("Error", "Failed to pin location. Please try again.");
        }
    };

    const handleCancelPin = () => {
        setShowPinModal(false);
        setPinName("");
    };

    const handleDeletePin = async (pinId: string) => {
        Alert.alert(
            "Delete Location",
            "Are you sure you want to delete this location?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const updatedPins = pins.filter(
                                (pin) => pin.id !== pinId
                            );
                            await savePins(updatedPins);
                            setPins(updatedPins);
                        } catch (error) {
                            console.error("Error deleting pin:", error);
                            Alert.alert(
                                "Error",
                                "Failed to delete location. Please try again."
                            );
                        }
                    },
                },
            ]
        );
    };

    const handleStartEditPin = (item: PinnitItem) => {
        setEditingPin(item);
        setEditPinName(item.name);
        setIsEditModalVisible(true);
    };

    const handleCancelEditPin = () => {
        setIsEditModalVisible(false);
        setEditingPin(null);
        setEditPinName("");
    };

    const handleConfirmEditPin = async () => {
        if (!editingPin) return;

        const finalName = editPinName.trim();
        if (!finalName) {
            Alert.alert("Invalid name", "Please enter a name for this location.");
            return;
        }

        try {
            const updatedPins = pins.map((pin) =>
                pin.id === editingPin.id ? { ...pin, name: finalName } : pin
            );
            await savePins(updatedPins);
            setPins(updatedPins);
            handleCancelEditPin();
        } catch (error) {
            console.error("Error updating pin name:", error);
            Alert.alert(
                "Error",
                "Failed to update location name. Please try again."
            );
        }
    };

    const handleViewMap = (item: PinnitItem) => {
        router.push({
            pathname: "/map",
            params: {
                latitude: item.latitude.toString(),
                longitude: item.longitude.toString(),
                name: item.name,
                timestamp: Date.now().toString(), // Add timestamp to force re-render
            },
        });
    };


    const renderItem = ({ item }: { item: PinnitItem }) => (
        <PinItem
            item={item}
            onDelete={handleDeletePin}
            onViewMap={handleViewMap}
            onEdit={handleStartEditPin}
            colors={colors}
        />
    );

    return (
        <SafeAreaView
            style={[styles.safeArea, { backgroundColor: colors.background }]}
        >
            <View style={styles.screen}>
                {/* Large Title Header */}
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <View>
                            <Text
                                style={[
                                    styles.appLabel,
                                    { color: colors.textSecondary },
                                ]}
                            >
                                Your personal pinboard
                            </Text>
                            <Text
                                style={[
                                    styles.title,
                                    { color: colors.textPrimary },
                                ]}
                            >
                                Pinnit
                            </Text>
                        </View>
                        <View style={styles.headerBadge}>
                            <Ionicons
                                name="pin-outline"
                                size={14}
                                color="#1D4ED8"
                            />
                            <Text style={styles.headerBadgeText}>
                                Saved spots
                            </Text>
                        </View>
                    </View>

                    <Text
                        style={[
                            styles.subtitle,
                            { color: colors.textSecondary },
                        ]}
                    >
                        Pin the places that matter and jump back with a single
                        tap.
                    </Text>
                </View>

                {/* Current Location Card */}
                <View
                    style={[
                        styles.locationCard,
                        {
                            backgroundColor: colors.card,
                            shadowColor: "#0F172A",
                        },
                    ]}
                >
                    <View style={styles.locationRow}>
                        <View style={styles.locationIconWrapper}>
                            <Ionicons
                                name="navigate"
                                size={20}
                                color="#007AFF"
                            />
                        </View>
                        <View style={styles.locationTextColumn}>
                            <Text style={styles.locationLabel}>
                                Current Location
                            </Text>
                            {isLoadingLocation ? (
                                <View style={styles.loadingRow}>
                                    <ActivityIndicator
                                        size="small"
                                        color="#007AFF"
                                    />
                                    <Text
                                        style={[
                                            styles.locationCoord,
                                            { color: colors.textSecondary },
                                            { marginLeft: 8 },
                                        ]}
                                    >
                                        Getting location...
                                    </Text>
                                </View>
                            ) : currentLocation ? (
                                <Text
                                    style={[
                                        styles.locationCoord,
                                        { color: colors.textPrimary },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {currentLocation.latitude.toFixed(5)}°,{" "}
                                    {currentLocation.longitude.toFixed(5)}°
                                </Text>
                            ) : (
                                <Text
                                    style={[
                                        styles.locationCoord,
                                        { color: colors.textSecondary },
                                    ]}
                                >
                                    Location unavailable
                                </Text>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.pinButton,
                            (!currentLocation || isLoadingLocation) &&
                            styles.pinButtonDisabled,
                        ]}
                        activeOpacity={0.9}
                        disabled={!currentLocation || isLoadingLocation}
                        onPress={handlePinCurrentSpot}
                    >
                        <Ionicons
                            name="pin-outline"
                            size={18}
                            color="#ffffff"
                        />
                        <Text style={styles.pinButtonLabel}>
                            Pin Current Spot
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Pinned Spots List */}
                <View style={styles.listContainer}>
                    <View style={styles.listHeaderRow}>
                        <Text
                            style={[
                                styles.listTitle,
                                { color: colors.textPrimary },
                            ]}
                        >
                            Saved Spots
                        </Text>
                        <Text
                            style={[
                                styles.listMeta,
                                { color: colors.textSecondary },
                            ]}
                        >
                            {pins.length} location{pins.length !== 1 ? "s" : ""}
                        </Text>
                    </View>

                    {isLoadingPins ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#007AFF" />
                        </View>
                    ) : pins.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons
                                name="location-outline"
                                size={48}
                                color={colors.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.emptyText,
                                    { color: colors.textSecondary },
                                ]}
                            >
                                No pinned locations yet
                            </Text>
                            <Text
                                style={[
                                    styles.emptySubtext,
                                    { color: colors.textSecondary },
                                ]}
                            >
                                Pin your current location to get started
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={pins}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </View>

            {/* Pin Name Modal */}
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
                                backgroundColor: colors.card,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.modalTitle,
                                { color: colors.textPrimary },
                            ]}
                        >
                            Pin Location
                        </Text>
                        <Text
                            style={[
                                styles.modalSubtitle,
                                { color: colors.textSecondary },
                            ]}
                        >
                            Enter a name for this location
                        </Text>

                        <View style={styles.inputContainer}>
                            {isLoadingPinName ? (
                                <View style={styles.inputLoadingContainer}>
                                    <ActivityIndicator
                                        size="small"
                                        color="#007AFF"
                                    />
                                    <Text
                                        style={[
                                            styles.inputLoadingText,
                                            { color: colors.textSecondary },
                                        ]}
                                    >
                                        Getting location name...
                                    </Text>
                                </View>
                            ) : (
                                <TextInput
                                    style={[
                                        styles.nameInput,
                                        {
                                            backgroundColor: isDark
                                                ? "#1F2937"
                                                : "#F9FAFB",
                                            color: colors.textPrimary,
                                            borderColor: isDark
                                                ? "#374151"
                                                : "#E5E7EB",
                                        },
                                    ]}
                                    placeholder="Location Name"
                                    placeholderTextColor={colors.textSecondary}
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
                                        borderColor: isDark
                                            ? "#374151"
                                            : "#E5E7EB",
                                    },
                                ]}
                                onPress={handleCancelPin}
                            >
                                <Text
                                    style={[
                                        styles.cancelButtonText,
                                        { color: colors.textPrimary },
                                    ]}
                                >
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.confirmButton,
                                ]}
                                onPress={handleConfirmPin}
                                disabled={isLoadingPinName}
                            >
                                <Text style={styles.confirmButtonText}>
                                    Pin
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Pin Name Modal */}
            <Modal
                visible={isEditModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCancelEditPin}
            >
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.modalContent,
                            {
                                backgroundColor: colors.card,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.modalTitle,
                                { color: colors.textPrimary },
                            ]}
                        >
                            Edit Location Name
                        </Text>
                        <Text
                            style={[
                                styles.modalSubtitle,
                                { color: colors.textSecondary },
                            ]}
                        >
                            Update the name for this saved location
                        </Text>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[
                                    styles.nameInput,
                                    {
                                        backgroundColor: isDark
                                            ? "#1F2937"
                                            : "#F9FAFB",
                                        color: colors.textPrimary,
                                        borderColor: isDark
                                            ? "#374151"
                                            : "#E5E7EB",
                                    },
                                ]}
                                placeholder="Location Name"
                                placeholderTextColor={colors.textSecondary}
                                value={editPinName}
                                onChangeText={setEditPinName}
                                autoFocus={true}
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.cancelButton,
                                    {
                                        borderColor: isDark
                                            ? "#374151"
                                            : "#E5E7EB",
                                    },
                                ]}
                                onPress={handleCancelEditPin}
                            >
                                <Text
                                    style={[
                                        styles.cancelButtonText,
                                        { color: colors.textPrimary },
                                    ]}
                                >
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.confirmButton,
                                ]}
                                onPress={handleConfirmEditPin}
                            >
                                <Text style={styles.confirmButtonText}>
                                    Save
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,

    },
    screen: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 34,
        fontWeight: "800",
        letterSpacing: -0.5,
    },
    headerTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    appLabel: {
        fontSize: 11,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 1.2,
        marginBottom: 4,
    },
    headerBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#EEF2FF",
        gap: 4,
    },
    headerBadgeText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#1D4ED8",
    },
    subtitle: {
        marginTop: 10,
        fontSize: 13,
        lineHeight: 18,
    },
    locationCard: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    locationIconWrapper: {
        marginRight: 12,
        height: 36,
        width: 36,
        borderRadius: 18,
        backgroundColor: "#DBEAFE",
        alignItems: "center",
        justifyContent: "center",
    },
    locationTextColumn: {
        flex: 1,
    },
    locationLabel: {
        fontSize: 11,
        fontWeight: "600",
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: "#2563EB",
    },
    locationCoord: {
        marginTop: 2,
        fontSize: 14,
    },
    loadingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
    },
    pinButton: {
        marginTop: 8,
        height: 48,
        borderRadius: 999,
        backgroundColor: "#007AFF",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        shadowColor: "#60A5FA",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 5,
    },
    pinButtonLabel: {
        fontSize: 13,
        fontWeight: "600",
        letterSpacing: 1,
        textTransform: "uppercase",
        color: "#FFFFFF",
    },
    pinButtonDisabled: {
        opacity: 0.5,
    },
    listContainer: {
        flex: 1,
    },
    listHeaderRow: {
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: "600",
    },
    listMeta: {
        fontSize: 12,
    },
    listContent: {
        paddingTop: 4,
        paddingBottom: 8,
    },
    swipeContainer: {
        marginBottom: 12,
        position: "relative",
        borderRadius: 18,
        overflow: "hidden",
    },
    deleteButtonContainer: {
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        width: 80,
        borderTopRightRadius: 18,
        borderBottomRightRadius: 18,
        overflow: "hidden",
    },
    deleteButton: {
        width: 80,
        height: "100%",
        backgroundColor: "#EF4444",
        justifyContent: "center",
        alignItems: "center",
    },
    pinCard: {
        borderRadius: 18,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    pinCardTextColumn: {
        flex: 1,
        marginRight: 12,
    },
    pinTitle: {
        fontSize: 15,
        fontWeight: "600",
    },
    pinCoord: {
        marginTop: 4,
        fontSize: 12,
        color: "#6B7280",
    },
    pinMeta: {
        marginTop: 4,
        fontSize: 11,
    },
    viewMapButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "#EFF6FF",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    viewMapLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#2563EB",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: "600",
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        textAlign: "center",
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
        marginLeft: 12,
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
