import AsyncStorage from "@react-native-async-storage/async-storage";
import { PinnitItem } from "@/types/pinnit";
import { STORAGE_KEY } from "@env";

export const MAP_STYLE_KEY = "@pinnit_map_style";

export type MapStyleType = "standard" | "satellite" | "hybrid" | "terrain";

const DEFAULT_MAP_STYLE: MapStyleType = "standard";

export const loadMapStyle = async (): Promise<MapStyleType> => {
  try {
    const saved = await AsyncStorage.getItem(MAP_STYLE_KEY);
    if (
      saved &&
      ["standard", "satellite", "hybrid", "terrain"].includes(saved)
    ) {
      return saved as MapStyleType;
    }
    return DEFAULT_MAP_STYLE;
  } catch (error) {
    console.error("Error loading map style:", error);
    return DEFAULT_MAP_STYLE;
  }
};

export const saveMapStyle = async (style: MapStyleType): Promise<void> => {
  try {
    await AsyncStorage.setItem(MAP_STYLE_KEY, style);
  } catch (error) {
    console.error("Error saving map style:", error);
    throw error;
  }
};

// Load pins from AsyncStorage
export const loadPins = async (): Promise<PinnitItem[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const pins = JSON.parse(data);
      // Sort by timestamp (newest first)
      return pins.sort(
        (a: PinnitItem, b: PinnitItem) => b.timestamp - a.timestamp
      );
    }
    return [];
  } catch (error) {
    console.error("Error loading pins:", error);
    return [];
  }
};

// Save pins to AsyncStorage
export const savePins = async (pins: PinnitItem[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch (error) {
    console.error("Error saving pins:", error);
    throw error;
  }
};
