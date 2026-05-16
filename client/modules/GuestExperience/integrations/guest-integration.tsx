import React from "react";
/** * GuestExperience Integration * * Connects GuestExperience module to shared stores * Syncs reservations and feedback across modules */ import { useEffect } from "react";
import { useInventoryIntegration } from "@/lib/store-integrations";
import { useSchedulingIntegration } from "@/lib/store-integrations"; /** * Hook to integrate GuestExperience with shared stores */
export function useGuestExperienceIntegration() {
  const inventory = useInventoryIntegration();
  const scheduling = useSchedulingIntegration(); // Sync reservation changes to schedule const syncReservationToSchedule = (reservation: { id: string; date: string; time: string; partySize: number; specialRequests?: string; }) => { // Update schedule based on reservation const schedule = scheduling.getSchedulesByDate(reservation.date); if (schedule.length > 0) { // Update existing schedule or create new shifts based on reservation console.log("[GuestExperience] Syncing reservation to schedule:", reservation); } }; // Sync dietary preferences/allergies to inventory for alerts const syncPreferencesToInventory = (guest: { allergies: string[]; preferences: string[]; }) => { // Check inventory for allergen items const allergenItems = inventory.items.filter((item) => guest.allergies.some((allergy) => item.name.toLowerCase().includes(allergy.toLowerCase()) ) ); if (allergenItems.length > 0) { console.log("[GuestExperience] Allergen items in inventory:", allergenItems); } }; return { syncReservationToSchedule, syncPreferencesToInventory, inventory, scheduling, };
}
