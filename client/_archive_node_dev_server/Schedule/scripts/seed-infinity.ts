/** * seed-infinity.ts * Populate database with sample data for Infinity features: * - Skills & certifications * - Employee skill assignments * - Ratings * - Development plans * - Training records */
import { getSupabase } from "../lib/supabase";
async function seedSkills() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error("Supabase not configured");
    return;
  }
  const skills = [
    {
      slug: "server.t1",
      name: "Server Tier 1",
      category: "SERVICE",
      tier_levels: 5,
    },
    {
      slug: "server.t2",
      name: "Server Tier 2",
      category: "SERVICE",
      tier_levels: 5,
    },
    {
      slug: "banquet.captain",
      name: "Banquet Captain",
      category: "SERVICE",
      tier_levels: 5,
    },
    {
      slug: "pastry.dec",
      name: "Pastry Decorator",
      category: "PRODUCTION",
      tier_levels: 5,
    },
    {
      slug: "pastry.chef",
      name: "Pastry Chef",
      category: "PRODUCTION",
      tier_levels: 5,
    },
    { slug: "expo", name: "Expediter", category: "PRODUCTION", tier_levels: 3 },
  ];
  for (const skill of skills) {
    const { error } = await supabase.from("skills").upsert({ ...skill });
    if (error) console.error(`Error seeding skill ${skill.slug}:`, error);
    else console.log(`✓ Seeded skill: ${skill.slug}`);
  }
}
async function seedRatings() {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data: emps } = await supabase.from("employees").select("id").limit(5);
  const today = new Date();
  for (let i = 0; i < 10; i++) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    for (const emp of emps || []) {
      const punctuality = Math.floor(Math.random() * 2) + 4;
      const quality = Math.floor(Math.random() * 2) + 4;
      const teamwork = Math.floor(Math.random() * 2) + 4;
      const total_score = (punctuality + quality + teamwork) / 3;
      const { error } = await supabase.from("ratings").insert({
        employee_id: emp.id,
        outlet_id: "outlet-1",
        shift_date: date,
        punctuality,
        quality,
        teamwork,
        total_score,
        reviewer_id: "mgr-1",
      });
      if (error) console.error("Error seeding rating:", error);
    }
  }
  console.log(`✓ Seeded ${10 * (emps?.length || 0)} ratings`);
}
async function seedDevPlans() {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data: emps } = await supabase.from("employees").select("id").limit(3);
  for (const emp of emps || []) {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 3);
    const { error } = await supabase.from("development_plans").upsert({
      employee_id: emp.id,
      goal_title: "Advance to Lead Server",
      description:
        "Develop leadership and training skills for lead server role",
      target_date: targetDate.toISOString().split("T")[0],
      status: "IN_PROGRESS",
      milestones: [
        {
          label: "Complete Food Safety Cert",
          due_date: new Date().toISOString().split("T")[0],
          completed: true,
        },
        {
          label: "Mentor 2 junior servers",
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          completed: false,
        },
      ],
    });
    if (error) console.error("Error seeding dev plan:", error);
  }
  console.log(`✓ Seeded ${emps?.length || 0} development plans`);
}
async function seedTrainingRecords() {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data: emps } = await supabase.from("employees").select("id").limit(3);
  for (const emp of emps || []) {
    const { error } = await supabase.from("training_records").insert({
      employee_id: emp.id,
      training_name: "ServSafe Food Safety",
      provider: "ServSafe",
      start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end_date: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      completion_status: "COMPLETED",
      score: 95,
      certificate_url: "https://example.com/cert.pdf",
    });
    if (error) console.error("Error seeding training:", error);
  }
  console.log(`✓ Seeded ${emps?.length || 0} training records`);
}
async function main() {
  console.log("🌱 Seeding Infinity features...\n");
  await seedSkills();
  await seedRatings();
  await seedDevPlans();
  await seedTrainingRecords();
  console.log("\n✅ Infinity seed complete!");
  process.exit(0);
}
main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
