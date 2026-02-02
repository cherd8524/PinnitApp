import { useMemo, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type PinnitItem = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    createdAt: string;
};

const MOCK_PINS: PinnitItem[] = [
    {
        id: "1",
        name: "Home Studio",
        latitude: 13.7563,
        longitude: 100.5018,
        createdAt: "Pinned 2 min ago",
    },
    {
        id: "2",
        name: "Favorite Café",
        latitude: 13.7445,
        longitude: 100.5347,
        createdAt: "Pinned yesterday",
    },
    {
        id: "3",
        name: "Sunset Viewpoint",
        latitude: 18.7883,
        longitude: 98.9853,
        createdAt: "Pinned last week",
    },
];

export default function Index() {
    const colorScheme = useColorScheme();
    const [currentLocation] = useState({
        latitude: 13.7563,
        longitude: 100.5018,
    });

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

    const renderItem = ({ item }: { item: PinnitItem }) => (
        <View
            style={[
                styles.pinCard,
                {
                    backgroundColor: colors.card,
                    shadowColor: "#0F172A",
                },
            ]}
        >
            <View style={styles.pinCardTextColumn}>
                <Text
                    style={[styles.pinTitle, { color: colors.textPrimary }]}
                    numberOfLines={1}
                >
                    {item.name}
                </Text>
                <Text style={styles.pinCoord} numberOfLines={1}>
                    {item.latitude.toFixed(4)}°, {item.longitude.toFixed(4)}°
                </Text>
                <Text
                    style={[styles.pinMeta, { color: colors.textSecondary }]}
                >
                    {item.createdAt}
                </Text>
            </View>

            <TouchableOpacity style={styles.viewMapButton}>
                <Ionicons name="map-outline" size={16} color="#007AFF" />
                <Text style={styles.viewMapLabel}>View Map</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView
            style={[styles.safeArea, { backgroundColor: colors.background }]}
        >
            <View style={styles.screen}>
                {/* Large Title Header */}
                <View style={styles.header}>
                    <Text
                        style={[
                            styles.title,
                            { color: colors.textPrimary },
                            { marginTop: 10 },
                        ]}
                    >
                        Pinnit
                    </Text>
                    <Text
                        style={[
                            styles.subtitle,
                            { color: colors.textSecondary },
                        ]}
                    >
                        Pin the places that matter. Come back to them anytime.
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
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.pinButton}
                        activeOpacity={0.9}
                        onPress={() => {
                            // TODO: integrate with real location & storage
                            console.log("Pin current spot");
                        }}
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
                            {MOCK_PINS.length} locations
                        </Text>
                    </View>

                    <FlatList
                        data={MOCK_PINS}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            </View>
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
        marginBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: "800",
        letterSpacing: -0.5,
    },
    subtitle: {
        marginTop: 8,
        fontSize: 14,
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
    pinCard: {
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
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
});
