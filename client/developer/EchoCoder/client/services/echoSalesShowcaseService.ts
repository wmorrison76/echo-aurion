/**
 * EchoAI Sales Showcase Service
 * Manages interactive demo profiles for tradeshows and client presentations
 * Features: Pre-loaded data, offline mode, interactive workflows
 */

export interface ShowcaseProfile {
  id: string;
  name: string;
  description: string;
  type: "hospitality" | "restaurant" | "venue" | "catering" | "custom";
  featured_modules: string[];
  sample_data: Record<string, any>;
  workflows: string[]; // Demo workflows to showcase
  duration_minutes: number;
  offline_capable: boolean;
  cache: {
    is_cached: boolean;
    cached_responses: Record<string, any>;
    cache_size_mb: number;
  };
}

export interface ShowcaseDemo {
  profileId: string;
  demoStep: number;
  totalSteps: number;
  stepName: string;
  description: string;
  interactiveElements: Array<{
    element: string;
    action: string;
    expectedResult: string;
  }>;
  sampleData: Record<string, any>;
  nextAction: "click" | "fill" | "observe" | "explain";
}

export class EchoSalesShowcaseService {
  private activeProfile: ShowcaseProfile | null = null;
  private currentStep: number = 0;
  private cacheDatabase: Map<string, any> = new Map();

  /**
   * Load a showcase profile
   */
  async loadProfile(profileId: string): Promise<ShowcaseProfile> {
    // In production, this would fetch from database
    // For now, return hardcoded profiles
    const profiles: Record<string, ShowcaseProfile> = {
      "upscale-restaurant": {
        id: "upscale-restaurant",
        name: "Upscale Restaurant - Full Demo",
        description:
          "Complete restaurant management system with reservations, menu, staff, and analytics",
        type: "restaurant",
        featured_modules: [
          "Reservations",
          "Menu Management",
          "Staff Scheduling",
          "Analytics",
        ],
        sample_data: {
          reservation: {
            date: "2024-05-15",
            time: "19:00",
            partySize: 4,
            guestName: "Smith",
            table: 5,
          },
          menu: {
            dish: "Filet Mignon",
            price: 45.0,
            cogs: 12.5,
            margin: 72.2,
          },
          analytics: {
            revenue: 15000,
            covers: 120,
            avgCheck: 125,
          },
        },
        workflows: [
          "Create Reservation",
          "Update Menu",
          "Schedule Staff",
          "View Analytics",
        ],
        duration_minutes: 15,
        offline_capable: true,
        cache: {
          is_cached: false,
          cached_responses: {},
          cache_size_mb: 0,
        },
      },
      "venue-event": {
        id: "venue-event",
        name: "Event Venue - Booking System",
        description:
          "Complete event venue management with catering and timelines",
        type: "venue",
        featured_modules: [
          "Event Booking",
          "Catering",
          "Timeline Management",
          "Guest Management",
        ],
        sample_data: {
          event: {
            name: "Corporate Gala",
            date: "2024-06-20",
            guests: 250,
            package: "Premium",
            budget: 15000,
          },
          catering: {
            items: 15,
            servings: 250,
            dietaryRestrictions: 12,
          },
        },
        workflows: [
          "Create Event",
          "Add Catering",
          "Invite Guests",
          "View Timeline",
        ],
        duration_minutes: 20,
        offline_capable: true,
        cache: {
          is_cached: false,
          cached_responses: {},
          cache_size_mb: 0,
        },
      },
    };

    const profile = profiles[profileId];
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    this.activeProfile = profile;
    this.currentStep = 0;

    return profile;
  }

  /**
   * Get current demo step
   */
  getCurrentStep(): ShowcaseDemo {
    if (!this.activeProfile) {
      throw new Error("No active profile");
    }

    const steps: Record<string, any> = {
      "upscale-restaurant": [
        {
          stepName: "Welcome",
          description: "Welcome to the upscale restaurant demo",
          interactiveElements: [
            {
              element: "Get Started Button",
              action: "click",
              expectedResult: "Navigate to main dashboard",
            },
          ],
        },
        {
          stepName: "Create a Reservation",
          description: "Learn how to quickly book a table for your guests",
          interactiveElements: [
            {
              element: "New Reservation Button",
              action: "click",
              expectedResult: "Open reservation form",
            },
            {
              element: "Date/Time Picker",
              action: "fill",
              expectedResult: "Select May 15, 7:00 PM",
            },
            {
              element: "Party Size",
              action: "fill",
              expectedResult: "Select 4 guests",
            },
          ],
        },
        {
          stepName: "Menu Management",
          description: "Manage your menu items and pricing",
          interactiveElements: [
            {
              element: "Menu Tab",
              action: "click",
              expectedResult: "View menu items",
            },
            {
              element: "Edit Menu Item",
              action: "click",
              expectedResult: "Edit Filet Mignon pricing",
            },
          ],
        },
        {
          stepName: "View Analytics",
          description: "See real-time business metrics and insights",
          interactiveElements: [
            {
              element: "Analytics Dashboard",
              action: "click",
              expectedResult: "View revenue and cover data",
            },
          ],
        },
      ],
    };

    const profileSteps =
      steps[this.activeProfile.id] || steps["upscale-restaurant"];
    const step = profileSteps[this.currentStep] || profileSteps[0];

    return {
      profileId: this.activeProfile.id,
      demoStep: this.currentStep + 1,
      totalSteps: profileSteps.length,
      stepName: step.stepName,
      description: step.description,
      interactiveElements: step.interactiveElements,
      sampleData: this.activeProfile.sample_data,
      nextAction: step.nextAction || "click",
    };
  }

  /**
   * Move to next step
   */
  nextStep(): ShowcaseDemo {
    if (!this.activeProfile) {
      throw new Error("No active profile");
    }

    // Get max steps for current profile
    const maxSteps = this.activeProfile.workflows.length + 1;

    if (this.currentStep < maxSteps - 1) {
      this.currentStep++;
    }

    return this.getCurrentStep();
  }

  /**
   * Move to previous step
   */
  previousStep(): ShowcaseDemo {
    if (this.currentStep > 0) {
      this.currentStep--;
    }

    return this.getCurrentStep();
  }

  /**
   * Jump to specific step
   */
  jumpToStep(stepNumber: number): ShowcaseDemo {
    if (!this.activeProfile) {
      throw new Error("No active profile");
    }

    const maxSteps = this.activeProfile.workflows.length + 1;

    if (stepNumber >= 1 && stepNumber <= maxSteps) {
      this.currentStep = stepNumber - 1;
    }

    return this.getCurrentStep();
  }

  /**
   * Get all available profiles
   */
  getAvailableProfiles(): Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    duration: number;
  }> {
    return [
      {
        id: "upscale-restaurant",
        name: "Upscale Restaurant - Full Demo",
        description:
          "Complete restaurant management system with reservations, menu, staff, and analytics",
        type: "restaurant",
        duration: 15,
      },
      {
        id: "venue-event",
        name: "Event Venue - Booking System",
        description:
          "Complete event venue management with catering and timelines",
        type: "venue",
        duration: 20,
      },
    ];
  }

  /**
   * Cache responses for offline mode
   */
  cacheResponse(key: string, data: any): void {
    this.cacheDatabase.set(key, data);

    if (this.activeProfile) {
      this.activeProfile.cache.is_cached = true;
      this.activeProfile.cache.cached_responses[key] = data;
      this.activeProfile.cache.cache_size_mb =
        Math.round(
          (JSON.stringify(this.cacheDatabase).length / 1024 / 1024) * 100,
        ) / 100;
    }
  }

  /**
   * Get cached response
   */
  getCachedResponse(key: string): any {
    return this.cacheDatabase.get(key);
  }

  /**
   * Check if offline mode is available
   */
  isOfflineModeAvailable(): boolean {
    return (
      this.activeProfile?.offline_capable ||
      (false && this.activeProfile?.cache.is_cached) ||
      false
    );
  }

  /**
   * Get demo completion percentage
   */
  getCompletionPercentage(): number {
    if (!this.activeProfile) return 0;

    const maxSteps = this.activeProfile.workflows.length + 1;
    return Math.round(((this.currentStep + 1) / maxSteps) * 100);
  }

  /**
   * Start fresh demo
   */
  resetDemo(): void {
    this.currentStep = 0;
  }

  /**
   * Get interactive workflow
   */
  getWorkflow(workflowName: string): any {
    if (!this.activeProfile) {
      throw new Error("No active profile");
    }

    // Return sample workflow
    return {
      name: workflowName,
      steps: [
        {
          action: "Click button",
          element: "Create New",
          description: "Start creating",
        },
        {
          action: "Fill form",
          element: "Form Fields",
          description: "Enter details",
        },
        {
          action: "Submit",
          element: "Submit Button",
          description: "Complete action",
        },
      ],
      estimatedTime: 2,
      successCriteria: "Item created successfully",
    };
  }
}

// Singleton export
export const echoSalesShowcaseService = new EchoSalesShowcaseService();
