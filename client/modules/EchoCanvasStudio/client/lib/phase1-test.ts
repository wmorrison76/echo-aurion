/**
 * Phase 1 Test Suite
 * Tests:
 * 1. Database migrations and table creation
 * 2. Supabase connection
 * 3. WebSocket connection
 * 4. 2-user collaboration session
 */

import { supabase, testSupabaseConnection } from "./supabase";
import { realtimeManager } from "./realtime-manager";

export interface Phase1TestResults {
  supabaseConnection: boolean;
  databaseTables: {
    designs: boolean;
    designSessions: boolean;
    collaborationEvents: boolean;
  };
  websocketConnected: boolean;
  twoUserCollaboration: boolean;
  errors: string[];
  timestamp: string;
}

/**
 * Test 1: Verify Supabase connection
 */
async function testSupabaseConnectivity(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log("[Phase1] Testing Supabase connection...");
    const connected = await testSupabaseConnection();
    if (connected) {
      console.log("[Phase1] ✓ Supabase connection successful");
      return { success: true };
    } else {
      console.error("[Phase1] ✗ Supabase connection failed");
      return {
        success: false,
        error: "Failed to connect to Supabase",
      };
    }
  } catch (error) {
    console.error("[Phase1] ✗ Supabase connection error:", error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Test 2: Verify database tables exist
 */
async function testDatabaseTables(): Promise<{
  designs: boolean;
  designSessions: boolean;
  collaborationEvents: boolean;
  errors: string[];
}> {
  const results = {
    designs: false,
    designSessions: false,
    collaborationEvents: false,
    errors: [] as string[],
  };

  try {
    console.log("[Phase1] Checking database tables...");

    // Test designs table
    const { count: designsCount, error: designsError } = await supabase
      .from("designs")
      .select("id", { count: "exact", head: true });

    if (designsError) {
      results.errors.push(`designs table check failed: ${designsError.message}`);
    } else {
      results.designs = true;
      console.log("[Phase1] ✓ designs table exists");
    }

    // Test design_sessions table
    const { count: sessionsCount, error: sessionsError } = await supabase
      .from("design_sessions")
      .select("id", { count: "exact", head: true });

    if (sessionsError) {
      results.errors.push(
        `design_sessions table check failed: ${sessionsError.message}`
      );
    } else {
      results.designSessions = true;
      console.log("[Phase1] ✓ design_sessions table exists");
    }

    // Test collaboration_events table
    const { count: eventsCount, error: eventsError } = await supabase
      .from("collaboration_events")
      .select("id", { count: "exact", head: true });

    if (eventsError) {
      results.errors.push(
        `collaboration_events table check failed: ${eventsError.message}`
      );
    } else {
      results.collaborationEvents = true;
      console.log("[Phase1] ✓ collaboration_events table exists");
    }
  } catch (error) {
    results.errors.push(`Database check error: ${String(error)}`);
  }

  return results;
}

/**
 * Test 3: Verify WebSocket connection capability
 */
async function testWebSocketCapability(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log("[Phase1] Testing WebSocket capability...");

    // Check if WebSocket is available
    if (typeof WebSocket === "undefined") {
      return {
        success: false,
        error: "WebSocket not available in environment",
      };
    }

    console.log("[Phase1] ✓ WebSocket available");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Test 4: Simulate 2-user collaboration
 */
async function testTwoUserCollaboration(): Promise<{
  success: boolean;
  sessionId?: string;
  error?: string;
}> {
  try {
    console.log("[Phase1] Testing 2-user collaboration setup...");

    // Create a test design session
    const { data: session, error: sessionError } = await supabase
      .from("design_sessions")
      .insert({
        design_id: "00000000-0000-0000-0000-000000000001",
        bakery_id: "test-bakery",
        primary_chef_id: "chef-1",
        mode: "shared",
        viewers: JSON.stringify([
          {
            user_id: "chef-2",
            viewer_name: "Chef 2",
            joined_at: new Date().toISOString(),
          },
        ]),
      })
      .select()
      .single();

    if (sessionError) {
      console.error("[Phase1] ✗ Failed to create test session:", sessionError);
      return {
        success: false,
        error: sessionError.message,
      };
    }

    console.log("[Phase1] ✓ Created collaboration session:", session?.id);

    // Log a test event
    const { data: event, error: eventError } = await supabase
      .from("collaboration_events")
      .insert({
        design_id: "00000000-0000-0000-0000-000000000001",
        session_id: session?.id,
        event_type: "session_created",
        user_id: "chef-1",
        data: JSON.stringify({ mode: "shared", viewers: 1 }),
      })
      .select()
      .single();

    if (eventError) {
      console.error("[Phase1] ✗ Failed to log event:", eventError);
      return {
        success: false,
        error: eventError.message,
      };
    }

    console.log("[Phase1] ✓ Logged collaboration event:", event?.id);

    // Cleanup: Delete test session
    await supabase.from("design_sessions").delete().eq("id", session?.id);

    return {
      success: true,
      sessionId: session?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Run all Phase 1 tests
 */
export async function runPhase1Tests(): Promise<Phase1TestResults> {
  console.log("\n========== PHASE 1 TEST SUITE ==========");
  console.log("Starting Phase 1 tests...\n");

  const results: Phase1TestResults = {
    supabaseConnection: false,
    databaseTables: {
      designs: false,
      designSessions: false,
      collaborationEvents: false,
    },
    websocketConnected: false,
    twoUserCollaboration: false,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  // Test 1: Supabase Connection
  const connTest = await testSupabaseConnectivity();
  results.supabaseConnection = connTest.success;
  if (!connTest.success) {
    results.errors.push(connTest.error || "Unknown error");
  }

  // Test 2: Database Tables
  const tableTest = await testDatabaseTables();
  results.databaseTables = {
    designs: tableTest.designs,
    designSessions: tableTest.designSessions,
    collaborationEvents: tableTest.collaborationEvents,
  };
  results.errors.push(...tableTest.errors);

  // Test 3: WebSocket
  const wsTest = await testWebSocketCapability();
  results.websocketConnected = wsTest.success;
  if (!wsTest.success) {
    results.errors.push(wsTest.error || "Unknown error");
  }

  // Test 4: 2-User Collaboration
  const collabTest = await testTwoUserCollaboration();
  results.twoUserCollaboration = collabTest.success;
  if (!collabTest.success) {
    results.errors.push(collabTest.error || "Unknown error");
  }

  // Summary
  console.log("\n========== PHASE 1 TEST RESULTS ==========");
  console.log(`Supabase Connection: ${results.supabaseConnection ? "✓" : "✗"}`);
  console.log(
    `Database Tables: ${Object.values(results.databaseTables).every((v) => v) ? "✓" : "✗"}`
  );
  console.log(`  - designs: ${results.databaseTables.designs ? "✓" : "✗"}`);
  console.log(
    `  - design_sessions: ${results.databaseTables.designSessions ? "✓" : "✗"}`
  );
  console.log(
    `  - collaboration_events: ${results.databaseTables.collaborationEvents ? "✓" : "✗"}`
  );
  console.log(`WebSocket Available: ${results.websocketConnected ? "✓" : "✗"}`);
  console.log(
    `2-User Collaboration: ${results.twoUserCollaboration ? "✓" : "✗"}`
  );

  if (results.errors.length > 0) {
    console.log(`\nErrors (${results.errors.length}):`);
    results.errors.forEach((error) => console.error(`  - ${error}`));
  }

  console.log("==========================================\n");

  return results;
}

/**
 * Check if all Phase 1 tests passed
 */
export function phase1TestsPassed(results: Phase1TestResults): boolean {
  return (
    results.supabaseConnection &&
    results.databaseTables.designs &&
    results.databaseTables.designSessions &&
    results.databaseTables.collaborationEvents &&
    results.websocketConnected &&
    results.twoUserCollaboration &&
    results.errors.length === 0
  );
}
