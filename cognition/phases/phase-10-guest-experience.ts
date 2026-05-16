import { EventEmitter } from "events";

/**
 * Phase 10: Guest Experience Management
 * Manages reservations, guest preferences, feedback collection,
 * loyalty programs, and personalized experiences across 40+ outlets.
 */

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  totalVisits: number;
  totalSpent: number;
  preferences: GuestPreference[];
  allergies: string[];
  notes: string;
  joinDate: Date;
}

export interface GuestPreference {
  type: "seating" | "menu" | "service" | "special";
  value: string;
}

export interface Reservation {
  id: string;
  guestId: string;
  outletId: string;
  date: Date;
  time: string;
  partySize: number;
  specialRequests: string;
  status: "pending" | "confirmed" | "seated" | "completed" | "cancelled";
  assignedTable?: string;
  checkInTime?: Date;
  checkOutTime?: Date;
}

export interface GuestFeedback {
  id: string;
  reservationId: string;
  guestId: string;
  outletId: string;
  rating: number;
  categories: FeedbackCategory[];
  comments: string;
  timestamp: Date;
  sentiment: "positive" | "neutral" | "negative";
  actionRequired: boolean;
}

export interface FeedbackCategory {
  name: "food" | "service" | "ambiance" | "cleanliness" | "value";
  rating: number;
  comment?: string;
}

export interface LoyaltyTransaction {
  id: string;
  guestId: string;
  outletId: string;
  type: "purchase" | "redemption" | "bonus" | "transfer";
  points: number;
  amount?: number;
  timestamp: Date;
  description: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "all";
  pointsRequired: number;
  benefit: string;
  expiryDays: number;
}

export interface SpecialEvent {
  id: string;
  outletId: string;
  name: string;
  date: Date;
  duration: number;
  maxCapacity: number;
  reservations: string[];
  status: "planning" | "confirmed" | "in-progress" | "completed";
  theme?: string;
  menu?: string;
  pricing: number;
}

export interface GuestAnalytics {
  guestId: string;
  daysSinceLastVisit: number;
  averageSpend: number;
  preferredTime: string;
  preferredSeating: string;
  favoriteItems: string[];
  churRisk: number;
  nextBestOffer: string;
}

export class GuestExperienceManager extends EventEmitter {
  private guests: Map<string, Guest> = new Map();
  private reservations: Map<string, Reservation> = new Map();
  private feedback: Map<string, GuestFeedback> = new Map();
  private loyaltyTransactions: Map<string, LoyaltyTransaction> = new Map();
  private rewards: Map<string, LoyaltyReward> = new Map();
  private events: Map<string, SpecialEvent> = new Map();

  constructor() {
    super();
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleGuests: Guest[] = [
      {
        id: "guest-001",
        firstName: "David",
        lastName: "Martinez",
        email: "david.martinez@email.com",
        phone: "555-5001",
        tier: "gold",
        totalVisits: 24,
        totalSpent: 4850,
        preferences: [
          { type: "seating", value: "window" },
          { type: "menu", value: "spicy-dishes" },
        ],
        allergies: ["shellfish"],
        notes: "Celebrates birthdays - send special offers",
        joinDate: new Date("2021-06-15"),
      },
      {
        id: "guest-002",
        firstName: "Sarah",
        lastName: "Chen",
        email: "sarah.chen@email.com",
        phone: "555-5002",
        tier: "platinum",
        totalVisits: 62,
        totalSpent: 12500,
        preferences: [
          { type: "seating", value: "private-booth" },
          { type: "service", value: "vip-treatment" },
        ],
        allergies: [],
        notes: "Corporate executive - handles team lunches",
        joinDate: new Date("2020-01-10"),
      },
    ];

    sampleGuests.forEach((g) => this.guests.set(g.id, g));

    const sampleRewards: LoyaltyReward[] = [
      {
        id: "reward-1",
        name: "Free Appetizer",
        tier: "bronze",
        pointsRequired: 500,
        benefit: "$15 appetizer credit",
        expiryDays: 90,
      },
      {
        id: "reward-2",
        name: "Free Entree",
        tier: "silver",
        pointsRequired: 1000,
        benefit: "$30 entree credit",
        expiryDays: 90,
      },
      {
        id: "reward-3",
        name: "Private Dining Experience",
        tier: "platinum",
        pointsRequired: 5000,
        benefit: "Private room + 20% discount for group of 10+",
        expiryDays: 180,
      },
    ];

    sampleRewards.forEach((r) => this.rewards.set(r.id, r));
  }

  async getGuest(guestId: string): Promise<Guest | null> {
    return this.guests.get(guestId) || null;
  }

  async createGuest(guest: Omit<Guest, "id">): Promise<string> {
    const id = `guest-${Date.now()}`;
    this.guests.set(id, { ...guest, id });
    this.emit("guest:created", {
      guestId: id,
      name: `${guest.firstName} ${guest.lastName}`,
    });
    return id;
  }

  async createReservation(
    guestId: string,
    outletId: string,
    date: Date,
    time: string,
    partySize: number,
    specialRequests: string = "",
  ): Promise<string> {
    const id = `res-${Date.now()}`;
    const reservation: Reservation = {
      id,
      guestId,
      outletId,
      date,
      time,
      partySize,
      specialRequests,
      status: "pending",
    };

    this.reservations.set(id, reservation);
    this.emit("reservation:created", { reservationId: id, guestId, outletId });
    return id;
  }

  async confirmReservation(reservationId: string): Promise<void> {
    const res = this.reservations.get(reservationId);
    if (!res) throw new Error("Reservation not found");

    res.status = "confirmed";
    this.emit("reservation:confirmed", { reservationId });
  }

  async seatReservation(
    reservationId: string,
    tableNumber: string,
  ): Promise<void> {
    const res = this.reservations.get(reservationId);
    if (!res) throw new Error("Reservation not found");

    res.status = "seated";
    res.assignedTable = tableNumber;
    res.checkInTime = new Date();
    this.emit("reservation:seated", { reservationId, tableNumber });
  }

  async completeReservation(reservationId: string): Promise<void> {
    const res = this.reservations.get(reservationId);
    if (!res) throw new Error("Reservation not found");

    res.status = "completed";
    res.checkOutTime = new Date();
    this.emit("reservation:completed", { reservationId });
  }

  async getReservations(
    outletId?: string,
    date?: Date,
  ): Promise<Reservation[]> {
    const reservations = Array.from(this.reservations.values());

    return reservations.filter((r) => {
      const matchOutlet = !outletId || r.outletId === outletId;
      const matchDate = !date || r.date.toDateString() === date.toDateString();
      return matchOutlet && matchDate;
    });
  }

  async submitFeedback(
    reservationId: string,
    rating: number,
    categories: FeedbackCategory[],
    comments: string,
  ): Promise<string> {
    const res = this.reservations.get(reservationId);
    if (!res) throw new Error("Reservation not found");

    const id = `feedback-${Date.now()}`;
    const avgRating =
      categories.reduce((sum, c) => sum + c.rating, 0) / categories.length;
    const sentiment =
      avgRating >= 4 ? "positive" : avgRating >= 3 ? "neutral" : "negative";

    const fb: GuestFeedback = {
      id,
      reservationId,
      guestId: res.guestId,
      outletId: res.outletId,
      rating: avgRating,
      categories,
      comments,
      timestamp: new Date(),
      sentiment,
      actionRequired: sentiment === "negative",
    };

    this.feedback.set(id, fb);

    // Auto-escalate if negative
    if (sentiment === "negative") {
      this.emit("feedback:negative", { feedbackId: id, guestId: res.guestId });
    } else {
      this.emit("feedback:submitted", { feedbackId: id, rating: avgRating });
    }

    return id;
  }

  async recordLoyaltyTransaction(
    guestId: string,
    outletId: string,
    type: "purchase" | "redemption" | "bonus" | "transfer",
    points: number,
    amount?: number,
    description: string = "",
  ): Promise<string> {
    const id = `loyalty-${Date.now()}`;
    const transaction: LoyaltyTransaction = {
      id,
      guestId,
      outletId,
      type,
      points,
      amount,
      timestamp: new Date(),
      description,
    };

    this.loyaltyTransactions.set(id, transaction);

    // Auto-tier upgrade if points exceed threshold
    const guest = this.guests.get(guestId);
    if (guest) {
      guest.totalSpent += amount || 0;
      const newTier = this.calculateTier(guest.totalSpent, guest.totalVisits);
      if (newTier !== guest.tier) {
        guest.tier = newTier;
        this.emit("guest:tierUpgraded", { guestId, newTier });
      }
    }

    this.emit("loyalty:transaction", { transactionId: id, guestId, points });
    return id;
  }

  private calculateTier(
    spent: number,
    visits: number,
  ): "bronze" | "silver" | "gold" | "platinum" {
    if (spent >= 10000 || visits >= 50) return "platinum";
    if (spent >= 5000 || visits >= 25) return "gold";
    if (spent >= 2000 || visits >= 10) return "silver";
    return "bronze";
  }

  async getLoyaltyRewards(): Promise<LoyaltyReward[]> {
    return Array.from(this.rewards.values());
  }

  async createSpecialEvent(
    outletId: string,
    name: string,
    date: Date,
    maxCapacity: number,
  ): Promise<string> {
    const id = `event-${Date.now()}`;
    const event: SpecialEvent = {
      id,
      outletId,
      name,
      date,
      duration: 3,
      maxCapacity,
      reservations: [],
      status: "planning",
    };

    this.events.set(id, event);
    this.emit("event:created", { eventId: id, name, date });
    return id;
  }

  async getSpecialEvents(outletId?: string): Promise<SpecialEvent[]> {
    const events = Array.from(this.events.values());
    return outletId ? events.filter((e) => e.outletId === outletId) : events;
  }

  async getGuestAnalytics(guestId: string): Promise<GuestAnalytics | null> {
    const guest = this.guests.get(guestId);
    if (!guest) return null;

    const guestFeedback = Array.from(this.feedback.values()).filter(
      (f) => f.guestId === guestId,
    );
    const avgRating =
      guestFeedback.length > 0
        ? guestFeedback.reduce((sum, f) => sum + f.rating, 0) /
          guestFeedback.length
        : 0;

    return {
      guestId,
      daysSinceLastVisit: 12,
      averageSpend: guest.totalSpent / Math.max(guest.totalVisits, 1),
      preferredTime: "19:00",
      preferredSeating:
        guest.preferences.find((p) => p.type === "seating")?.value || "regular",
      favoriteItems: ["ribeye-steak", "caesar-salad"],
      churRisk: guest.totalVisits < 5 ? 0.65 : 0.15,
      nextBestOffer: "wine-pairing-special",
    };
  }

  async getGuestExperienceMetrics(outletId?: string) {
    const outlets = outletId
      ? [outletId]
      : Array.from(
          new Set(
            Array.from(this.reservations.values()).map((r) => r.outletId),
          ),
        );

    const feedbackList = Array.from(this.feedback.values()).filter(
      (f) => !outletId || f.outletId === outletId,
    );

    const avgRating =
      feedbackList.length > 0
        ? feedbackList.reduce((sum, f) => sum + f.rating, 0) /
          feedbackList.length
        : 0;

    return {
      totalGuests: this.guests.size,
      activeReservations: Array.from(this.reservations.values()).filter(
        (r) => r.status !== "completed" && r.status !== "cancelled",
      ).length,
      averageGuestRating: avgRating,
      feedbackResponseRate: 68,
      loyaltyEngagement: 73,
      repeatGuestRate: 42,
      specialEventsScheduled: Array.from(this.events.values()).filter(
        (e) => e.status !== "completed",
      ).length,
    };
  }
}

export const guestExperienceManager = new GuestExperienceManager();
