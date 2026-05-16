// Avatar URL mapping
const AVATAR_URLS: Record<string, string> = {
  Echo_B:
    "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2F39958189ec2246e4be04ec1175c785ab?format=webp&width=800",
  Echo_F:
    "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2Fcb864730c3ee4d1e958b4fab1ed482c8?format=webp&width=800",
  Echo_M:
    "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2Ff3fc2b0a09db4996942ac5450acf92b0?format=webp&width=800",
  Echo_R:
    "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2Ff3ac2b1108c24085972e35e79ae182a5?format=webp&width=800",
};

const AVATAR_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-cyan-500",
];

/**
 * Get a consistent avatar color for a user ID
 * Safely handles undefined, null, or empty string user IDs
 */
export const getAvatarColor = (userId?: string | null): string => {
  // Fallback for missing IDs
  if (!userId || userId.trim().length === 0) {
    return AVATAR_COLORS[0]; // Default to first color
  }

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

/**
 * Get a random avatar from the available set
 */
export const getRandomAvatar = (): string => {
  const avatars = Object.keys(AVATAR_URLS);
  return avatars[Math.floor(Math.random() * avatars.length)];
};

/**
 * Get avatar URL by key
 */
export const getAvatarUrl = (key?: string): string => {
  if (!key) return AVATAR_URLS.Echo_B;
  return AVATAR_URLS[key] || AVATAR_URLS.Echo_B;
};

/**
 * Generate avatar for user with fallback to color
 * Supports both predefined avatars and custom uploaded avatars
 * Safely handles undefined or null user IDs
 */
export const generateUserAvatar = (
  userId?: string | null,
): { url?: string; color: string } => {
  const safeUserId = userId || "default-user";

  // Try to get stored avatar for user from global user-avatar key
  const stored = localStorage.getItem("user-avatar");
  if (stored) {
    // Check if it's a predefined avatar
    if (AVATAR_URLS[stored]) {
      return {
        url: AVATAR_URLS[stored],
        color: getAvatarColor(safeUserId),
      };
    }

    // Check if it's a custom uploaded avatar (filename)
    if (stored.startsWith("avatar-") && stored.includes(".")) {
      return {
        url: `/api/avatar/file/${stored}`,
        color: getAvatarColor(safeUserId),
      };
    }

    // Check if it's a base64 encoded custom avatar
    if (stored.startsWith("data:image/")) {
      return {
        url: stored,
        color: getAvatarColor(safeUserId),
      };
    }
  }

  // Try to get stored avatar by userId
  const userSpecificStored = localStorage.getItem(`avatar-${safeUserId}`);
  if (userSpecificStored && AVATAR_URLS[userSpecificStored]) {
    return {
      url: AVATAR_URLS[userSpecificStored],
      color: getAvatarColor(safeUserId),
    };
  }

  // Otherwise use color-based avatar
  return {
    color: getAvatarColor(safeUserId),
  };
};

/**
 * Get initials from name
 * Safely handles undefined, null, or empty string names
 */
export const getInitials = (name?: string | null): string => {
  if (!name || name.trim().length === 0) {
    return "?"; // Default fallback for missing names
  }

  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .substring(0, 2); // Ensure max 2 characters
};

/**
 * Generate avatar HTML component data
 * Safely handles undefined or null userId/userName
 */
export const getAvatarDisplay = (
  userId?: string | null,
  userName?: string | null,
): { url?: string; color: string; initials: string } => {
  const safeUserId = userId || "default-user";
  const safeName = userName || "User";

  const avatar = generateUserAvatar(safeUserId);
  return {
    ...avatar,
    initials: getInitials(safeName),
  };
};
