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
    return "Pinned just now";
  } else if (minutes < 60) {
    return `Pinned ${minutes} min${minutes > 1 ? "s" : ""} ago`;
  } else if (hours < 24) {
    return `Pinned ${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (days < 7) {
    return `Pinned ${days} day${days > 1 ? "s" : ""} ago`;
  } else if (weeks < 4) {
    return `Pinned ${weeks} week${weeks > 1 ? "s" : ""} ago`;
  } else {
    const date = new Date(timestamp);
    return `Pinned on ${date.toLocaleDateString()}`;
  }
};
