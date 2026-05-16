import { getSupabaseClient } from "../lib/supabase";
import { logger } from "../lib/logger";

export interface Room {
  id: string;
  name: string;
  capacity: number;
  setupTimeMinutes: number;
  teardownTimeMinutes: number;
  features: string[];
  active: boolean;
}

export interface RoomBooking {
  id: string;
  roomId: string;
  bookedFrom: string;
  bookedUntil: string;
  bookingType: "event" | "maintenance" | "blocked" | "setup";
  status: "pending" | "confirmed" | "cancelled";
  notes?: string;
}

export interface RoomAvailability {
  roomId: string;
  roomName: string;
  capacity: number;
  available: boolean;
  conflicts: RoomBooking[];
  suggestions: string[];
  rating: number; // 0-100
}

export interface SuggestedRoom extends Room {
  availability: RoomAvailability;
  score: number; // How well it matches the requirements
}

export class RoomAvailabilityService {
  /**
   * Check if a room is available for a specific time period
   */
  static async checkRoomAvailability(
    roomId: string,
    outletId: string,
    startTime: Date,
    endTime: Date,
    orgId: string,
  ): Promise<RoomAvailability> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Database connection unavailable");
      }

      // Fetch room details
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .eq("outlet_id", outletId)
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .single();

      if (roomError || !room) {
        throw new Error(`Room not found: ${roomId}`);
      }

      // Find conflicting bookings
      const { data: conflictingBookings, error: bookingError } = await supabase
        .from("room_bookings")
        .select("*")
        .eq("room_id", roomId)
        .eq("status", "confirmed")
        .lt("booked_from", endTime.toISOString())
        .gt("booked_until", startTime.toISOString());

      if (bookingError) {
        logger.warn("[RoomAvailability] Booking conflict check failed", {
          error: bookingError.message,
        });
      }

      const conflicts = (conflictingBookings || []).map((b: any) => ({
        id: b.id,
        roomId: b.room_id,
        bookedFrom: b.booked_from,
        bookedUntil: b.booked_until,
        bookingType: b.booking_type,
        status: b.status,
        notes: b.notes,
      }));

      const available = conflicts.length === 0;

      // Generate suggestions
      const suggestions: string[] = [];
      if (!available) {
        suggestions.push("This room has conflicting bookings");
        suggestions.push("Consider alternative time slots or different rooms");
      }

      if (room.active === false) {
        suggestions.push("This room is currently inactive");
      }

      const rating = available ? 100 : Math.max(0, 100 - conflicts.length * 30);

      return {
        roomId,
        roomName: room.name,
        capacity: room.capacity,
        available,
        conflicts,
        suggestions,
        rating,
      };
    } catch (error) {
      logger.error("[RoomAvailability] Check failed", {
        error: error instanceof Error ? error.message : String(error),
        roomId,
      });
      throw error;
    }
  }

  /**
   * Suggest available rooms based on requirements
   */
  static async suggestRooms(
    outletId: string,
    orgId: string,
    eventDate: Date,
    guestCount: number,
    durationMinutes: number = 240,
    requiredFeatures: string[] = [],
  ): Promise<SuggestedRoom[]> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Database connection unavailable");
      }

      // Add setup and teardown time
      const startTime = new Date(eventDate);
      startTime.setHours(startTime.getHours() - 2); // Start 2 hours earlier for setup

      const endTime = new Date(eventDate);
      endTime.setMinutes(endTime.getMinutes() + durationMinutes + 120); // Add time for teardown

      // Fetch all active rooms with sufficient capacity
      const { data: rooms, error: roomsError } = await supabase
        .from("rooms")
        .select("*")
        .eq("outlet_id", outletId)
        .eq("org_id", orgId)
        .eq("active", true)
        .is("deleted_at", null)
        .gte("capacity", guestCount)
        .order("capacity", { ascending: true });

      if (roomsError) {
        logger.warn("[RoomAvailability] Room fetch failed", {
          error: roomsError.message,
        });
        return [];
      }

      // Check availability for each room and score them
      const suggestedRooms: SuggestedRoom[] = [];

      for (const room of rooms || []) {
        const availability = await this.checkRoomAvailability(
          room.id,
          outletId,
          startTime,
          endTime,
          orgId,
        );

        // Calculate score based on availability, capacity match, and features
        let score = 50; // Base score

        if (availability.available) {
          score += 50; // Big bonus for availability
        } else {
          score -= availability.conflicts.length * 20;
        }

        // Capacity match: prefer rooms that aren't too oversized
        const capacityRatio = guestCount / room.capacity;
        if (capacityRatio >= 0.8) {
          score += 15; // Good fit
        } else if (capacityRatio >= 0.6) {
          score += 10; // Acceptable
        } else {
          score -= 5; // Too large
        }

        // Feature matching
        if (requiredFeatures.length > 0) {
          const roomFeatures = room.features || [];
          const featureMatches = requiredFeatures.filter((f: string) =>
            roomFeatures.includes(f),
          ).length;
          const featureScore = (featureMatches / requiredFeatures.length) * 20;
          score += featureScore;
        }

        suggestedRooms.push({
          id: room.id,
          name: room.name,
          capacity: room.capacity,
          setupTimeMinutes: room.setup_time_minutes || 60,
          teardownTimeMinutes: room.teardown_time_minutes || 60,
          features: room.features || [],
          active: room.active,
          availability,
          score: Math.max(0, Math.min(100, score)),
        });
      }

      // Sort by score
      suggestedRooms.sort((a, b) => b.score - a.score);

      logger.info("[RoomAvailability] Suggested rooms", {
        outletId,
        guestCount,
        suggestionsCount: suggestedRooms.length,
      });

      return suggestedRooms;
    } catch (error) {
      logger.error("[RoomAvailability] Suggestion failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Book a room for an event
   */
  static async bookRoom(
    roomId: string,
    outletId: string,
    orgId: string,
    startTime: Date,
    endTime: Date,
    bookingType: "event" | "maintenance" | "blocked" | "setup" = "event",
    prospectId?: string,
    eventId?: string,
    notes?: string,
    createdBy?: string,
  ): Promise<RoomBooking | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Database connection unavailable");
      }

      // Check availability first
      const availability = await this.checkRoomAvailability(
        roomId,
        outletId,
        startTime,
        endTime,
        orgId,
      );

      if (!availability.available) {
        logger.warn("[RoomAvailability] Room not available for booking", {
          roomId,
          conflicts: availability.conflicts.length,
        });
        return null;
      }

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("room_bookings")
        .insert([
          {
            org_id: orgId,
            outlet_id: outletId,
            room_id: roomId,
            prospect_id: prospectId,
            event_id: eventId,
            booked_from: startTime.toISOString(),
            booked_until: endTime.toISOString(),
            booking_type: bookingType,
            status: "confirmed",
            notes,
            created_by: createdBy,
          },
        ])
        .select()
        .single();

      if (bookingError) {
        logger.error("[RoomAvailability] Booking creation failed", {
          error: bookingError.message,
        });
        throw bookingError;
      }

      logger.info("[RoomAvailability] Room booked successfully", {
        roomId,
        bookingType,
        prospectId,
      });

      return {
        id: booking.id,
        roomId: booking.room_id,
        bookedFrom: booking.booked_from,
        bookedUntil: booking.booked_until,
        bookingType: booking.booking_type,
        status: booking.status,
        notes: booking.notes,
      };
    } catch (error) {
      logger.error("[RoomAvailability] Room booking failed", {
        error: error instanceof Error ? error.message : String(error),
        roomId,
      });
      throw error;
    }
  }

  /**
   * Block a room for maintenance
   */
  static async blockRoomForMaintenance(
    roomId: string,
    outletId: string,
    orgId: string,
    startTime: Date,
    endTime: Date,
    reason: string,
    createdBy?: string,
  ): Promise<RoomBooking | null> {
    return this.bookRoom(
      roomId,
      outletId,
      orgId,
      startTime,
      endTime,
      "maintenance",
      undefined,
      undefined,
      reason,
      createdBy,
    );
  }

  /**
   * Get all bookings for a room within a date range
   */
  static async getRoomBookings(
    roomId: string,
    outletId: string,
    orgId: string,
    startDate: Date,
    endDate: Date,
    statusFilter?: string[],
  ): Promise<RoomBooking[]> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Database connection unavailable");
      }

      let query = supabase
        .from("room_bookings")
        .select("*")
        .eq("room_id", roomId)
        .eq("outlet_id", outletId)
        .eq("org_id", orgId)
        .lt("booked_from", endDate.toISOString())
        .gt("booked_until", startDate.toISOString());

      if (statusFilter && statusFilter.length > 0) {
        query = query.in("status", statusFilter);
      }

      const { data: bookings, error } = await query.order("booked_from", {
        ascending: true,
      });

      if (error) {
        logger.warn("[RoomAvailability] Booking fetch failed", {
          error: error.message,
        });
        return [];
      }

      return (bookings || []).map((b: any) => ({
        id: b.id,
        roomId: b.room_id,
        bookedFrom: b.booked_from,
        bookedUntil: b.booked_until,
        bookingType: b.booking_type,
        status: b.status,
        notes: b.notes,
      }));
    } catch (error) {
      logger.error("[RoomAvailability] Booking fetch error", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Cancel a room booking
   */
  static async cancelBooking(
    bookingId: string,
    orgId: string,
    reason?: string,
  ): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Database connection unavailable");
      }

      const { error } = await supabase
        .from("room_bookings")
        .update({
          status: "cancelled",
          notes: reason || "Booking cancelled",
        })
        .eq("id", bookingId)
        .eq("org_id", orgId);

      if (error) {
        logger.error("[RoomAvailability] Booking cancellation failed", {
          error: error.message,
        });
        throw error;
      }

      logger.info("[RoomAvailability] Booking cancelled", { bookingId });
      return true;
    } catch (error) {
      logger.error("[RoomAvailability] Cancellation error", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get room utilization statistics
   */
  static async getRoomUtilization(
    outletId: string,
    orgId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      roomId: string;
      roomName: string;
      totalCapacity: number;
      bookingCount: number;
      utilizationPercentage: number;
      totalMinutesBooked: number;
    }>
  > {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Database connection unavailable");
      }

      // Get all rooms
      const { data: rooms } = await supabase
        .from("rooms")
        .select("*")
        .eq("outlet_id", outletId)
        .eq("org_id", orgId)
        .is("deleted_at", null);

      // Get bookings for period
      const { data: bookings } = await supabase
        .from("room_bookings")
        .select("*")
        .eq("outlet_id", outletId)
        .eq("org_id", orgId)
        .eq("status", "confirmed")
        .lt("booked_from", endDate.toISOString())
        .gt("booked_until", startDate.toISOString());

      const utilization = (rooms || []).map((room: any) => {
        const roomBookings = (bookings || []).filter(
          (b: any) => b.room_id === room.id,
        );
        const totalMinutesBooked = roomBookings.reduce(
          (sum: number, b: any) => {
            const from = new Date(b.booked_from);
            const until = new Date(b.booked_until);
            return sum + (until.getTime() - from.getTime()) / (1000 * 60);
          },
          0,
        );

        // Calculate max possible minutes (days * hours per day)
        const days = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        const maxPossibleMinutes = days * 24 * 60;

        return {
          roomId: room.id,
          roomName: room.name,
          totalCapacity: room.capacity,
          bookingCount: roomBookings.length,
          utilizationPercentage: Math.round(
            (totalMinutesBooked / maxPossibleMinutes) * 100,
          ),
          totalMinutesBooked: Math.round(totalMinutesBooked),
        };
      });

      return utilization;
    } catch (error) {
      logger.error("[RoomAvailability] Utilization calculation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
