import AsyncStorage from "@react-native-async-storage/async-storage";
import { PinnitItem } from "@/types/pinnit";
import { STORAGE_KEY } from "@env";

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
