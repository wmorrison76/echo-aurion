#!/usr/bin/env node import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);
interface Outlet {
  id: string;
  name: string;
  location: string;
  status: string;
  created_at: string;
}
async function listOutlets() {
  try {
    console.log("Fetching all outlets...\n");
    const { data: outlets, error } = await supabase
      .from("outlets")
      .select("id, name, location, status, created_at")
      .order("name", { ascending: true });
    if (error) {
      console.error("Error fetching outlets:", error.message);
      return;
    }
    if (!outlets || outlets.length === 0) {
      console.log("No outlets found.");
      return;
    }
    console.log(
      "╔════════════════════════════════════════════════════════════════════╗",
    );
    console.log("║ Available Outlets ║");
    console.log(
      "╚════════════════════════════════════════════════════════════════════╝",
    );
    outlets.forEach((outlet: Outlet, index: number) => {
      const createdDate = new Date(outlet.created_at).toLocaleDateString();
      console.log(`\n${index + 1}. ${outlet.name}`);
      console.log(` ID: ${outlet.id}`);
      console.log(` Location: ${outlet.location}`);
      console.log(` Status: ${outlet.status}`);
      console.log(` Created: ${createdDate}`);
    });
    console.log(`\n✓ Total outlets: ${outlets.length}`);
  } catch (error: any) {
    console.error("An unexpected error occurred:", error.message);
  }
}
async function createOutlet(name: string, location: string) {
  try {
    console.log(`Creating new outlet: ${name}...`);
    const { data: outlet, error } = await supabase
      .from("outlets")
      .insert([
        {
          name,
          location,
          status: "active",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();
    if (error) {
      console.error("Error creating outlet:", error.message);
      return;
    }
    console.log(`✓ Outlet created successfully.`);
    console.log(` ID: ${outlet.id}`);
    console.log(` Name: ${outlet.name}`);
    console.log(` Location: ${outlet.location}`);
  } catch (error: any) {
    console.error("An unexpected error occurred:", error.message);
  }
}
async function updateOutletStatus(
  outletId: string,
  status: "active" | "inactive" | "closed",
) {
  try {
    console.log(`Updating outlet status to '${status}'...`);
    const { data: outlet, error } = await supabase
      .from("outlets")
      .update({ status })
      .eq("id", outletId)
      .select()
      .single();
    if (error) {
      console.error("Error updating outlet:", error.message);
      return;
    }
    console.log(`✓ Outlet status updated successfully.`);
    console.log(` Name: ${outlet.name}`);
    console.log(` Status: ${outlet.status}`);
  } catch (error: any) {
    console.error("An unexpected error occurred:", error.message);
  }
}
async function assignUserToOutlet(userId: string, outletId: string) {
  try {
    console.log(`Assigning user to outlet...`);
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, outlet_ids")
      .eq("id", userId)
      .single();
    if (fetchError || !profile) {
      console.error(
        "Error fetching user:",
        fetchError?.message || "User not found",
      );
      return;
    }
    const currentOutletIds = profile.outlet_ids || [];
    if (!currentOutletIds.includes(outletId)) {
      currentOutletIds.push(outletId);
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ outlet_ids: currentOutletIds })
      .eq("id", userId);
    if (updateError) {
      console.error("Error updating user:", updateError.message);
      return;
    }
    console.log(`✓ User assigned to outlet successfully.`);
    console.log(` User ID: ${userId}`);
    console.log(` Outlet ID: ${outletId}`);
    console.log(` Total outlets: ${currentOutletIds.length}`);
  } catch (error: any) {
    console.error("An unexpected error occurred:", error.message);
  }
}
async function getOutletDetails(outletId: string) {
  try {
    const { data: outlet, error } = await supabase
      .from("outlets")
      .select("*")
      .eq("id", outletId)
      .single();
    if (error || !outlet) {
      console.error(
        "Error fetching outlet:",
        error?.message || "Outlet not found",
      );
      return;
    }
    console.log("\n╔════════════════════════════════════════════════╗");
    console.log("║ Outlet Details ║");
    console.log("╚════════════════════════════════════════════════╝");
    console.log(`\nName: ${outlet.name}`);
    console.log(`ID: ${outlet.id}`);
    console.log(`Location: ${outlet.location}`);
    console.log(`Status: ${outlet.status}`);
    console.log(`Created: ${new Date(outlet.created_at).toLocaleDateString()}`);
    if (outlet.updated_at) {
      console.log(
        `Updated: ${new Date(outlet.updated_at).toLocaleDateString()}`,
      );
    }
  } catch (error: any) {
    console.error("An unexpected error occurred:", error.message);
  }
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Usage:");
    console.log(
      " ts-node scripts/admin/outletManagement.ts <command> [options]",
    );
    console.log("\nAvailable commands:");
    console.log(" list - List all outlets");
    console.log(" create <name> <location> - Create a new outlet");
    console.log(
      " status <outletId> <status> - Update outlet status (active|inactive|closed)",
    );
    console.log(" assign <userId> <outletId> - Assign user to outlet");
    console.log(" details <outletId> - Show outlet details");
    console.log("\nExamples:");
    console.log(" ts-node scripts/admin/outletManagement.ts list");
    console.log(
      ' ts-node scripts/admin/outletManagement.ts create"Downtown Store""123 Main St"',
    );
    console.log(
      " ts-node scripts/admin/outletManagement.ts status abc123 active",
    );
    process.exit(1);
  }
  const command = args[0].toLowerCase();
  switch (command) {
    case "list":
      await listOutlets();
      break;
    case "create":
      if (args.length < 3) {
        console.error("Error: create command requires <name> and <location>");
        process.exit(1);
      }
      await createOutlet(args[1], args[2]);
      break;
    case "status":
      if (args.length < 3) {
        console.error("Error: status command requires <outletId> and <status>");
        process.exit(1);
      }
      const validStatuses = ["active", "inactive", "closed"];
      if (!validStatuses.includes(args[2])) {
        console.error(
          `Error: Invalid status. Must be one of: ${validStatuses.join(",")}`,
        );
        process.exit(1);
      }
      await updateOutletStatus(
        args[1],
        args[2] as "active" | "inactive" | "closed",
      );
      break;
    case "assign":
      if (args.length < 3) {
        console.error("Error: assign command requires <userId> and <outletId>");
        process.exit(1);
      }
      await assignUserToOutlet(args[1], args[2]);
      break;
    case "details":
      if (args.length < 2) {
        console.error("Error: details command requires <outletId>");
        process.exit(1);
      }
      await getOutletDetails(args[1]);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}
main();
