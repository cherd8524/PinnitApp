import { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PinnitItem } from "@/types/pinnit";
import { formatTimeAgo } from "@/utils/format";

type PinItemProps = {
  item: PinnitItem;
  onDelete: (id: string) => void;
  onViewMap: (item: PinnitItem) => void;
  onEdit: (item: PinnitItem) => void;
  colors: {
    card: string;
    textPrimary: string;
    textSecondary: string;
  };
};

export function PinItem({
  item,
  onDelete,
  onViewMap,
  onEdit,
  colors,
}: PinItemProps) {
  const [isSwiped, setIsSwiped] = useState(false);
  const screenWidth = Dimensions.get("window").width;
  const paddingHorizontal = 40; // 20 * 2
  const deleteButtonWidth = 80;
  const fullWidth = screenWidth - paddingHorizontal;
  const swipedWidth = fullWidth - deleteButtonWidth;

  const widthAnim = useRef(new Animated.Value(fullWidth)).current;

  const panResponder = useMemo(
    () => {
      let startX = 0;
      let startWidth = fullWidth;
      return PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 5;
        },
        onPanResponderGrant: () => {
          // Store the current position
          widthAnim.stopAnimation((value) => {
            startWidth = value;
          });
          startX = 0;
        },
        onPanResponderMove: (_, gestureState) => {
          // Only allow swiping left (negative dx)
          const newValue = gestureState.dx;
          if (newValue < 0) {
            // Calculate width based on swipe position
            const progress = Math.abs(newValue) / deleteButtonWidth;
            const clampedProgress = Math.min(progress, 1);
            const currentWidth = fullWidth - (deleteButtonWidth * clampedProgress);
            widthAnim.setValue(currentWidth);

            if (newValue < -10 && !isSwiped) {
              setIsSwiped(true);
            } else if (newValue > -10 && isSwiped) {
              setIsSwiped(false);
            }
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          const finalValue = gestureState.dx;
          const swipeThreshold = -50;
          if (finalValue < swipeThreshold) {
            // Swipe left enough to show delete
            setIsSwiped(true);
            Animated.spring(widthAnim, {
              toValue: swipedWidth,
              useNativeDriver: false,
              tension: 50,
              friction: 7,
            }).start();
          } else {
            // Spring back
            setIsSwiped(false);
            Animated.spring(widthAnim, {
              toValue: fullWidth,
              useNativeDriver: false,
              tension: 50,
              friction: 7,
            }).start();
          }
        },
      });
    },
    [item.id, widthAnim, fullWidth, swipedWidth, deleteButtonWidth, isSwiped]
  );

  return (
    <View style={styles.swipeContainer}>
      {/* Delete button background */}
      <View style={styles.deleteButtonContainer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Main card */}
      <Animated.View
        style={[
          styles.pinCard,
          {
            backgroundColor: colors.card,
            shadowColor: "#0F172A",
            width: widthAnim,
            borderTopRightRadius: isSwiped ? 0 : 18,
            borderBottomRightRadius: isSwiped ? 0 : 18,
            borderRightWidth: isSwiped ? 0 : 1,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable
          style={styles.cardContent}
          onLongPress={() => onEdit(item)}
          delayLongPress={400}
        >
          <View style={styles.pinCardTextColumn}>
            <Text
              style={[styles.pinTitle, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.ownerLabel ? (
              <Text
                style={[styles.pinOwner, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                เจ้าของ: {item.ownerLabel}
              </Text>
            ) : null}
            <Text style={styles.pinCoord} numberOfLines={1}>
              {item.latitude.toFixed(4)}°, {item.longitude.toFixed(4)}°
            </Text>
            <Text
              style={[styles.pinMeta, { color: colors.textSecondary }]}
            >
              {formatTimeAgo(item.timestamp)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.viewMapButton}
            onPress={() => onViewMap(item)}
          >
            <Ionicons name="map-outline" size={16} color="#007AFF" />
            <Text style={styles.viewMapLabel}>ดูแผนที่</Text>
          </TouchableOpacity>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    position: "relative",
    marginBottom: 12,
  },
  deleteButtonContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    width: 80,
    height: "100%",
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  pinCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pinCardTextColumn: {
    flex: 1,
    marginRight: 12,
  },
  pinTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  pinOwner: {
    fontSize: 12,
    marginBottom: 2,
  },
  pinCoord: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
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
