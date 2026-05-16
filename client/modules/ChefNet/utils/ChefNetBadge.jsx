import React from "react";

export function ChefNetNotificationBadge({ count = 0 }) {
  if (!count || count <= 0) return null;

  const displayCount = count > 99 ? "99+" : count;

  return (
    <div
      className="absolute top-0 right-0 min-w-5 h-5 rounded-full bg-red-600 dark:bg-red-500 text-white text-xs font-bold flex items-center justify-center border border-white dark:border-slate-950 shadow-lg"
      style={{
        transform: "translate(25%, -25%)",
      }}
    >
      {displayCount}
    </div>
  );
}

export function ChefNetIconWithBadge({ unreadCount = 0 }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <span className="text-xl">💬</span>
      {unreadCount > 0 && <ChefNetNotificationBadge count={unreadCount} />}
    </div>
  );
}

/**
 * Hook to get unread message count from ChefNet state
 * Can be used in sidebar or anywhere you want to display the badge
 */
export function useChefNetUnreadCount(state) {
  if (!state) return 0;

  // Count unread posts, vents, and recognitions
  const unreadPosts = state.posts?.filter((p) => !p.read)?.length || 0;
  const unreadVents = state.ventingMessages?.filter((v) => !v.read)?.length || 0;
  const unreadRecs = state.recognitions?.filter((r) => !r.read)?.length || 0;

  return unreadPosts + unreadVents + unreadRecs;
}
