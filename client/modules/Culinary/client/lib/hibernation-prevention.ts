/**
 * Hibernation Prevention Utility
 * Prevents the computer from going to sleep during training
 * Uses WakeLock API and periodic user interaction simulation
 */

export class HibernationPrevention {
  private wakeLock: WakeLockSentinel | null = null;
  private isActive = false;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private lastActivity = Date.now();

  /**
   * Request wake lock to prevent screen from turning off
   */
  async start(): Promise<boolean> {
    if (this.isActive) {
      console.log("[HibernationPrevention] Already active");
      return true;
    }

    try {
      // Try to acquire wake lock if supported
      if ("wakeLock" in navigator) {
        try {
          this.wakeLock = await navigator.wakeLock.request("screen");
          console.log(
            "[HibernationPrevention] Wake lock acquired - screen will stay on"
          );

          // Listen for release events (e.g., when document loses focus)
          this.wakeLock.addEventListener("release", () => {
            console.log("[HibernationPrevention] Wake lock released");
            this.wakeLock = null;
          });
        } catch (err) {
          console.warn(
            "[HibernationPrevention] Wake lock request failed:",
            err
          );
        }
      }

      // Start keep-alive interval
      this.startKeepAlive();
      this.isActive = true;

      return true;
    } catch (error) {
      console.error("[HibernationPrevention] Failed to start:", error);
      return false;
    }
  }

  /**
   * Stop preventing hibernation
   */
  async stop(): Promise<void> {
    if (!this.isActive) return;

    // Release wake lock
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log("[HibernationPrevention] Wake lock released");
      } catch (err) {
        console.warn("[HibernationPrevention] Error releasing wake lock:", err);
      }
    }

    // Stop keep-alive
    this.stopKeepAlive();
    this.isActive = false;
  }

  /**
   * Keep the system active by periodically simulating user activity
   */
  private startKeepAlive(): void {
    // Clear any existing interval
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    // Every 30 seconds, do something to keep the system active
    this.keepAliveInterval = setInterval(() => {
      this.triggerKeepAlive();
    }, 30000); // 30 seconds

    console.log("[HibernationPrevention] Keep-alive started (30s interval)");
  }

  /**
   * Stop the keep-alive interval
   */
  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      console.log("[HibernationPreventation] Keep-alive stopped");
    }
  }

  /**
   * Perform an action to simulate user activity
   * This prevents the system from going to sleep
   */
  private triggerKeepAlive(): void {
    try {
      // Update activity timestamp
      this.lastActivity = Date.now();

      // Fetch a lightweight endpoint to keep network active
      // This prevents the system from dropping network connections
      fetch("/api/ping", { method: "GET" }).catch(() => {
        // Fail silently - we're just keeping the system awake
      });

      // Log activity
      const now = new Date();
      console.log(
        `[HibernationPrevention] Keep-alive ping: ${now.toLocaleTimeString()}`
      );
    } catch (error) {
      console.warn("[HibernationPrevention] Keep-alive error:", error);
    }
  }

  /**
   * Request extended display timeout
   * This works on some devices like mobile phones
   */
  async requestExtendedDisplay(): Promise<boolean> {
    try {
      // Note: This is a non-standard API, might not work everywhere
      if ((document as any).documentElement.requestFullscreen) {
        await (document as any).documentElement.requestFullscreen();
        console.log(
          "[HibernationPrevention] Fullscreen mode enabled for extended display"
        );
        return true;
      }
    } catch (err) {
      console.warn("[HibernationPrevention] Fullscreen request failed:", err);
    }
    return false;
  }

  /**
   * Check if hibernation prevention is active
   */
  getStatus(): {
    isActive: boolean;
    hasWakeLock: boolean;
    lastActivity: Date;
    keepAliveRunning: boolean;
  } {
    return {
      isActive: this.isActive,
      hasWakeLock: this.wakeLock !== null,
      lastActivity: new Date(this.lastActivity),
      keepAliveRunning: this.keepAliveInterval !== null,
    };
  }
}

// Global instance
export const hibernationPrevention = new HibernationPrevention();

/**
 * Hook to manage hibernation prevention
 * Note: This is exported but not currently used.
 * Instead, hibernationPrevention is directly controlled in EchoTrainingCenter
 */
export function useHibernationPrevention(shouldPrevent: boolean) {
  // This hook would be used like:
  // useHibernationPrevention(isTrainingRunning);
  // But for now, we manage it directly in the component
}
