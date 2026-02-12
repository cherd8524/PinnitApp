export type PinnitItem = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  timestamp: number; // Unix timestamp for sorting and time calculation
  /** ชื่อเจ้าของ pin (จากบัญชี หรือ "รายการในเครื่อง") — ใช้แสดงใน list */
  ownerLabel?: string;
};
