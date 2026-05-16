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
interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes: any;
  created_at: string;
}
async function viewAuditLogs(
  resourceType?: string,
  userId?: string,
  limit: number = 50,
) {
  try {
    console.log("Fetching audit logs...\n");
    let query = supabase
      .from("audit_logs")
      .select(
        "id, user_id, action, resource_type, resource_id, changes, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (resourceType) {
      query = query.eq("resource_type", resourceType);
    }
    if (userId) {
      query = query.eq("user_id", userId);
    }
    const { data: logs, error } = await query;
    if (error) {
      console.error("Error fetching audit logs:", error.message);
      return;
    }
    if (!logs || logs.length === 0) {
      console.log("No audit logs found.");
      return;
    }
    console.log(
      "╔════════════════════════════════════════════════════════════════════╗",
    );
    console.log("║ Audit Logs ║");
    console.log(
      "╚════════════════════════════════════════════════════════════════════╝",
    );
    logs.forEach((log: AuditEntry, index: number) => {
      const timestamp = new Date(log.created_at).toLocaleString();
      console.log(`\n${index + 1}. ${log.action} - ${log.resource_type}`);
      console.log(` ID: ${log.id}`);
      console.log(` User ID: ${log.user_id}`);
      console.log(` Resource: ${log.resource_id}`);
      console.log(` Timestamp: ${timestamp}`);
      if (log.changes) {
        console.log(` Changes: ${JSON.stringify(log.changes)}`);
      }
    });
    console.log(`\n✓ Total logs displayed: ${logs.length}`);
  } catch (error: any) {
    console.error("An unexpected error occurred:", error.message);
  }
}
async function logAuditAction(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  changes?: any,
) {
  try {
    console.log("Creating audit log entry...");
    const { data: entry, error } = await supabase
      .from("audit_logs")
      .insert([
        {
          user_id: userId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          changes: changes || null,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();
    if (error) {
      console.error("Error creating audit log:", error.message);
      return;
    }
    console.log("✓ Audit log entry created successfully.");
    console.log(` Action: ${entry.action}`);
    console.log(` Resource: ${entry.resource_type} (${entry.resource_id})`);
  } catch (error: any) {
    console.error("An unexpected error occurred:", error.message);
  }
}
async function getAuditSummary(days: number = 30) {
  try {
    console.log(`Generating audit summary for the last ${days} days...\n`);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const { data: logs, error } = await supabase
      .from("audit_logs")
      .select("action, resource_type")
      .gte("created_at", startDate.toISOString());
    if (error) {
      console.error("Error fetching audit logs:", error.message);
      return;
    }
    if (!logs || logs.length === 0) {
      console.log("No audit logs found for the specified period.");
      return;
    }
    const actionCounts: { [key: string]: number } = {};
    const resourceCounts: { [key: string]: number } = {};
    logs.forEach((log: any) => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      resourceCounts[log.resource_type] =
        (resourceCounts[log.resource_type] || 0) + 1;
    });
    console.log(
      "╔════════════════════════════════════════════════════════════════════╗",
    );
    console.log("║ Audit Summary ║");
    console.log(
      "╚════��═══════════════════════════════════════════════════════════════╝",
    );
    console.log(`\n📊 Total actions: ${logs.length}`);
    console.log("\n🔧 Actions breakdown:");
    Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([action, count]) => {
        console.log(` ${action}: ${count}`);
      });
    console.log("\n📁 Resources breakdown:");
    Object.entries(resourceCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([resource, count]) => {
        console.log(` ${resource}: ${count}`);
      });
  } catch (error: any) {
    console.error("An unexpected error occurred:", error.message);
  }
}
async function clearOldLogs(daysOld: number) {
  try {
    console.log(`Clearing audit logs older than ${daysOld} days...`);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const { data: oldLogs, error: fetchError } = await supabase
      .from("audit_logs")
      .select("id")
      .lt("created_at", cutoffDate.toISOString());
    if (fetchError) {
      console.error("Error fetching old logs:", fetchError.message);
      return;
    }
    if (!oldLogs || oldLogs.length === 0) {
      console.log("No old logs found to delete.");
      return;
    }
    const logIds = oldLogs.map((log: any) => log.id);
    const { error: deleteError } = await supabase
      .from("audit_logs")
      .delete()
      .in("id", logIds);
    if (deleteError) {
      console.error("Error deleting logs:", deleteError.message);
      return;
    }
    console.log(
      `✓ Successfully deleted ${logIds.length} old audit log entries.`,
    );
  } catch (error: any) {
    console.error("An unexpected error occurred:", error.message);
  }
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Usage:");
    console.log(" ts-node scripts/admin/auditLog.ts <command> [options]");
    console.log("\nAvailable commands:");
    console.log(
      " view [resourceType] [userId] - View audit logs (optional filters)",
    );
    console.log(
      " log <userId> <action> <resourceType> <resourceId> [changes] - Create audit log",
    );
    console.log(" summary [days] - Generate audit summary");
    console.log(" cleanup <daysOld> - Delete logs older than N days");
    console.log("\nExamples:");
    console.log(" ts-node scripts/admin/auditLog.ts view");
    console.log(" ts-node scripts/admin/auditLog.ts view invoices");
    console.log(" ts-node scripts/admin/auditLog.ts view invoices user-123");
    console.log(
      " ts-node scripts/admin/auditLog.ts log user-123 CREATE invoice inv-456",
    );
    console.log(" ts-node scripts/admin/auditLog.ts summary 30");
    console.log(" ts-node scripts/admin/auditLog.ts cleanup 90");
    process.exit(1);
  }
  const command = args[0].toLowerCase();
  switch (command) {
    case "view":
      await viewAuditLogs(args[1], args[2], args[3] ? parseInt(args[3]) : 50);
      break;
    case "log":
      if (args.length < 5) {
        console.error(
          "Error: log command requires <userId> <action> <resourceType> <resourceId>",
        );
        process.exit(1);
      }
      const changes = args[5] ? JSON.parse(args[5]) : undefined;
      await logAuditAction(args[1], args[2], args[3], args[4], changes);
      break;
    case "summary":
      const days = args[1] ? parseInt(args[1]) : 30;
      await getAuditSummary(days);
      break;
    case "cleanup":
      if (!args[1]) {
        console.error("Error: cleanup command requires <daysOld>");
        process.exit(1);
      }
      await clearOldLogs(parseInt(args[1]));
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}
main();
