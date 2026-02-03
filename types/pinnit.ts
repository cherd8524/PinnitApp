export type PinnitItem = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  timestamp: number; // Unix timestamp for sorting and time calculation
};
