// Helper function to format time ago
export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 60) {
    return "ปักหมุดเมื่อสักครู่";
  } else if (minutes < 60) {
    return `ปักหมุดเมื่อ ${minutes} นาทีที่แล้ว`;
  } else if (hours < 24) {
    return `ปักหมุดเมื่อ ${hours} ชั่วโมงที่แล้ว`;
  } else if (days < 7) {
    return `ปักหมุดเมื่อ ${days} วันที่แล้ว`;
  } else if (weeks < 4) {
    return `ปักหมุดเมื่อ ${weeks} สัปดาห์ที่แล้ว`;
  } else {
    const date = new Date(timestamp);
    return `ปักหมุดเมื่อ ${date.toLocaleDateString("th-TH")}`;
  }
};
