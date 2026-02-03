import { GEOCODE_API_KEY, GEOCODE_API_URL } from "@env";

// Reverse geocoding function
export const getLocationName = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    const url = `${GEOCODE_API_URL}?lat=${latitude}&lon=${longitude}&api_key=${GEOCODE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.name) {
      return data.name;
    }
    return "Location Name";
  } catch (error) {
    console.error("Error fetching location name:", error);
    return "Location Name";
  }
};
