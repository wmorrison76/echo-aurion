# LUCCCA Resort Demo Data Seeding

This guide explains how to seed the demo database with realistic data for LUCCCA (a multi-outlet resort group).

## What Gets Seeded

The seed script creates:

- **1 Organization**: LUCCCA Demo Resort Group
- **3 Outlets**: Beach Tower, Casino Grand, Mountain Lodge
- **3 Departments per outlet**: FOH, Banquets, Pastry
- **23 Employees**: Distributed across FOH (6), Banquets (5), and Pastry (4)
- **6 Pastry Recipes**: Complete with equipment, skills, and dependencies
- **4 BEOs (Events)**: October banquets with guest counts and menus
- **7+ Days Revenue Data**: For each department across breakfast, lunch, and dinner
- **Default Tip Pools**: One per department with HYBRID rule (70% hours, 30% revenue)
- **Weekly Shifts**: 6-hour shifts for each employee across Mon-Sun

## Prerequisites

Ensure:
1. **Supabase is connected** with valid `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your `.env`
2. **Database tables exist**. The tables should be created by your schema migration:
   - `orgs`, `outlets`, `departments`, `positions`, `employees`
   - `revenues`, `shifts`, `events`, `recipes`, `tasks`
   - `tip_pools`, `tip_pool_members`, `tip_runs`, `tip_run_lines`
   - `audit_logs`, `publish_audits`, `publish_acknowledgements`

## Quick Start

### Option 1: Fresh Seed (if starting from scratch)

```bash
npm run seed:dev
```

### Option 2: Reset and Reseed (if you have old data)

```bash
npm run seed:reset
npm run seed:dev
```

## Manual Commands

If you prefer to run with `tsx` directly:

```bash
# Reset database
tsx server/scripts/resetDev.ts

# Seed fresh data
tsx server/scripts/seed.ts
```

Or with ts-node:

```bash
ts-node --esm server/scripts/seed.ts
```

## CSV Files

All seed data is stored in `/seeds/`:

| File | Purpose | Rows |
|------|---------|------|
| `employees_foh.csv` | FOH staff (servers, bartenders, hosts) | 6 |
| `employees_banquets.csv` | Banquet staff (servers, captains) | 5 |
| `employees_pastry.csv` | Pastry team (chefs, decor specialists) | 4 |
| `recipes_pastry.csv` | Pastry recipes with equipment/skills | 6 |
| `beos_oct.csv` | October banquet events (gala, reception) | 4 |
| `revenue_week_foh.csv` | FOH revenue (breakfast, lunch, dinner) | 19 days |
| `revenue_week_banquets.csv` | Banquet revenue | 7 days |
| `revenue_week_pastry.csv` | Pastry revenue (all-day) | 7 days |

### Modifying Seed Data

To adjust employees, revenue, or events, edit the CSV files directly:

```csv
name,position,rate
John Doe,Server,20
Jane Smith,Bartender,25
```

Then re-run `npm run seed:dev` (or reset first if data exists).

## Smoke Tests

After seeding, test these features:

1. **Scheduler Grid**
   - Go to Dashboard → Schedule tab
   - Select Beach Tower / FOH / current week
   - See 6 employees with 7 shifts each (Mon-Sun, 10am-4:30pm)

2. **Revenue & SPLH**
   - Dashboard → Revenue tab
   - Verify FOH shows $19,600 total for Monday (4200+5800+9600)
   - SPLH calculated from shifts and revenue

3. **Tip Pools**
   - Dashboard → Tip Pools tab
   - 3 default pools exist (FOH, Banquets, Pastry)
   - Positions already attached to pools

4. **Compliance**
   - Dashboard → Compliance tab
   - Verify no rest violations (shifts are 10am-4:30pm)
   - May see OT risk if scheduling adds more hours

5. **Forecast**
   - Dashboard → Forecast tab
   - 7/30/90 day forecasts compute from revenue baseline
   - Scenario comparison works with up to 5 variants

6. **Events & Pastry Gantt**
   - Dashboard → Events tab
   - 4 BEOs visible for October
   - Tasks generate when workload pipeline runs

## Reset and Cleanup

To start fresh:

```bash
npm run seed:reset
```

This clears all tables in the following order:
- Shifts → Tip run lines → Tip runs → Tip pool members → Tip pools
- Revenues → Tasks → Events → Recipes
- Employees → Positions → Departments → Outlets → Orgs
- Audit logs, publish audits, acknowledgements

## Troubleshooting

### Issue: "SUPABASE_URL or SUPABASE_ANON_KEY not found"

**Solution**: Set environment variables in `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Issue: "Table 'employees' does not exist"

**Solution**: Ensure your database schema is initialized. Check with:
```bash
npm run seed:dev 2>&1 | grep -i error
```

### Issue: CSV files not found

**Solution**: Run seed script from project root:
```bash
cd /path/to/project
npm run seed:dev
```

## Data Structure Notes

- **Service Mapping**: BRUNCH and ALL_DAY revenue mapped to LUNCH service
- **Shifts**: All employees get 6h shifts (30m break) Mon-Sun
- **Tip Pool Rule**: HYBRID = 70% hours + 30% revenue
- **Complexity Scores**: Events range 2-4 (affects task scheduling)
- **Revenue Dates**: October 20-26, 2025 (current week in demo)

## Next Steps

After seeding:

1. Try the **Scheduler** - drag shifts, publish schedules
2. Run **Forecast Dashboard** - 7/30/90 day projections
3. Create **Tip Runs** - manually allocate tips across pool members
4. View **Compliance** - check for late publishes, rest violations
5. Export **Reports** - CSV payroll, tips, P&L snapshots

---

**Last Updated**: October 2025  
**Database**: Supabase PostgreSQL  
**Format**: Standard CSV (pipe-delimited arrays for JSON fields)
