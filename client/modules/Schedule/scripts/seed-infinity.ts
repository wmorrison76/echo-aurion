/** * seed-infinity.ts * Seeds a demo org with outlets, departments, employees, skills, ratings, * development plans, and training records. Safe to re-run (upserts). */
import { getSupabase } from "../server/lib/supabase";
import { randomUUID } from "crypto";
async function main() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error("Supabase not configured");
    process.exit(1);
  }
  const org_id = await upsertOrg(supabase, "LUCCCA Demo Org");
  const outletIds = await ensureOutlets(supabase, org_id, [
    "Main Tower",
    "Beach Club",
    "Convention Center",
  ]);
  const depts = await ensureDepartments(supabase, org_id, outletIds, [
    ["FOH", "Main Tower"],
    ["Pastry", "Main Tower"],
    ["Banquets", "Convention Center"],
    ["Valet", "Main Tower"],
  ]); // Skills catalog await ensureSkills(supabase, org_id, [ ["server.t1","Server Tier 1","SERVICE", 5], ["server.captain","Server Captain","SERVICE", 5], ["bartender.mixology","Bartender Mixology","SERVICE", 5], ["banquet.setup","Banquet Setup","SERVICE", 5], ["pastry.dec","Pastry Decoration","PRODUCTION", 5], ["pastry.bulk","Pastry Bulk Production","PRODUCTION", 5], ["host.foh","Host Front Desk","SERVICE", 5], ["valet.ops","Valet Ops","SERVICE", 5], ["supervisor","Supervisor","MANAGEMENT", 5], ]); // 50 employees const people = await seedEmployees(supabase, org_id, depts); await seedEmployeeSkills(supabase, people); await seedRatings(supabase, people, 14); await seedDevPlans(supabase, people); await seedTraining(supabase, people); console.log("✅ Infinity seed complete."); process.exit(0);
}
async function upsertOrg(supabase: any, name: string): Promise<string> {
  const id = randomUUID();
  await supabase
    .from("organizations")
    .upsert({ id, name })
    .catch(() => {});
  const { data } = await supabase
    .from("organizations")
    .select("id")
    .eq("name", name)
    .limit(1)
    .single();
  return data?.id || id;
}
async function ensureOutlets(supabase: any, org_id: string, names: string[]) {
  const ids: Record<string, string> = {};
  for (const n of names) {
    const id = randomUUID();
    await supabase
      .from("outlets")
      .upsert({ id, org_id, name: n })
      .catch(() => {});
    const { data } = await supabase
      .from("outlets")
      .select("id")
      .eq("org_id", org_id)
      .eq("name", n)
      .limit(1)
      .single();
    ids[n] = data?.id || id;
  }
  return ids;
}
async function ensureDepartments(
  supabase: any,
  org_id: string,
  outlets: Record<string, string>,
  pairs: [string, string][],
) {
  const out: { id: string; name: string; outlet_id: string }[] = [];
  for (const [deptName, outletName] of pairs) {
    const id = randomUUID();
    await supabase
      .from("departments")
      .upsert({ id, org_id, outlet_id: outlets[outletName], name: deptName })
      .catch(() => {});
    const { data } = await supabase
      .from("departments")
      .select("id, name, outlet_id")
      .eq("org_id", org_id)
      .eq("outlet_id", outlets[outletName])
      .eq("name", deptName)
      .limit(1)
      .single();
    if (data) out.push(data);
  }
  return out;
}
async function ensureSkills(
  supabase: any,
  org_id: string,
  rows: [string, string, "SERVICE" | "PRODUCTION" | "MANAGEMENT", number][],
) {
  for (const [slug, name, cat, tiers] of rows) {
    const id = randomUUID();
    await supabase
      .from("skills")
      .upsert({ id, org_id, slug, name, category: cat, tier_levels: tiers })
      .catch(() => {});
  }
}
async function seedEmployees(
  supabase: any,
  org_id: string,
  depts: { id: string; name: string; outlet_id: string }[],
) {
  const firsts = [
    "Alex",
    "Taylor",
    "Jordan",
    "Sam",
    "Morgan",
    "Casey",
    "Evan",
    "Jamie",
    "Riley",
    "Avery",
  ];
  const lasts = [
    "Lee",
    "Rivera",
    "Singh",
    "Nguyen",
    "Patel",
    "Brown",
    "Garcia",
    "Johnson",
    "Davis",
    "Martinez",
  ];
  const rolesByDept: Record<string, string[]> = {
    FOH: ["Server", "Host", "Bartender"],
    Pastry: ["Commis", "Decorator", "Sous Pastry Chef"],
    Banquets: ["Server", "Captain", "Setup Tech"],
    Valet: ["Valet Runner", "Valet Supervisor"],
  };
  const people: { id: string; dept_id: string }[] = [];
  for (let i = 0; i < 50; i++) {
    const d = depts[i % depts.length];
    const role = randomOf(rolesByDept[d.name] || ["Associate"]);
    const id = randomUUID();
    const f = randomOf(firsts);
    const l = randomOf(lasts);
    const rate =
      role.includes("Supervisor") ||
      role.includes("Sous") ||
      role.includes("Captain")
        ? 26 + rand(6)
        : 16 + rand(6);
    const hireDate = new Date();
    hireDate.setDate(hireDate.getDate() - rand(900));
    await supabase
      .from("employees")
      .upsert({
        id,
        org_id,
        outlet_id: d.outlet_id,
        dept_id: d.id,
        first_name: f,
        last_name: l,
        role_title: role,
        position_tier: 1 + rand(4),
        hourly_rate: rate,
        status: "ACTIVE",
        hire_date: hireDate.toISOString().split("T")[0],
        availability: {},
        skills: [],
      })
      .catch(() => {});
    people.push({ id, dept_id: d.id });
  }
  return people;
}
async function seedEmployeeSkills(
  supabase: any,
  people: { id: string; dept_id: string }[],
) {
  const skillSets: Record<string, string[]> = {
    FOH: ["server.t1", "bartender.mixology", "host.foh"],
    Pastry: ["pastry.dec", "pastry.bulk"],
    Banquets: ["server.t1", "banquet.setup", "server.captain"],
    Valet: ["valet.ops", "supervisor"],
  };
  for (const p of people) {
    const { data: dept } = await supabase
      .from("departments")
      .select("name")
      .eq("id", p.dept_id)
      .limit(1)
      .single();
    const dName = dept?.name || "FOH";
    const list = skillSets[dName] || ["server.t1"];
    for (const slug of list) {
      await supabase
        .from("employee_skills")
        .upsert({ employee_id: p.id, skill_slug: slug, level: 1 + rand(4) })
        .catch(() => {});
    }
  }
}
async function seedRatings(
  supabase: any,
  people: { id: string; dept_id: string }[],
  days: number,
) {
  for (const p of people) {
    for (let d = 0; d < days; d++) {
      if (Math.random() < 0.45) {
        const shift_date = new Date(Date.now() - d * 86400000)
          .toISOString()
          .slice(0, 10);
        const punctuality = clampN(1 + rand(4), 1, 5);
        const quality = clampN(2 + rand(3), 1, 5);
        const teamwork = clampN(2 + rand(3), 1, 5);
        const total = (punctuality + quality + teamwork) / 3;
        await supabase
          .from("ratings")
          .insert({
            employee_id: p.id,
            outlet_id: "outlet-1",
            shift_date,
            punctuality,
            quality,
            teamwork,
            total_score: total,
          })
          .catch(() => {});
      }
    }
  }
}
async function seedDevPlans(
  supabase: any,
  people: { id: string; dept_id: string }[],
) {
  for (const p of people.slice(0, 20)) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 60);
    await supabase
      .from("development_plans")
      .upsert({
        employee_id: p.id,
        goal_title: "Next-Level Role Readiness",
        description: "Prepare for higher responsibility within department.",
        target_date: targetDate.toISOString().split("T")[0],
        status: "IN_PROGRESS",
        milestones: [
          {
            label: "Shadow senior shift",
            due_date: new Date(Date.now() + 21 * 86400000)
              .toISOString()
              .slice(0, 10),
            completed: false,
          },
        ],
      })
      .catch(() => {});
  }
}
async function seedTraining(
  supabase: any,
  people: { id: string; dept_id: string }[],
) {
  for (const p of people.slice(0, 30)) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14);
    await supabase
      .from("training_records")
      .insert({
        id: randomUUID(),
        employee_id: p.id,
        training_name: "Service Excellence 101",
        provider: "LUCCCA Academy",
        start_date: startDate.toISOString().split("T")[0],
        completion_status: "COMPLETED",
      })
      .catch(() => {});
  }
}
const rand = (n: number) => Math.floor(Math.random() * n);
const randomOf = <T>(xs: T[]) => xs[rand(xs.length)];
const clampN = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
