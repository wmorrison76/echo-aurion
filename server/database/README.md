# Database Setup

## Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Commands

### Test Connection
```bash
npm run db:test
```

Verifies that the database is reachable and credentials are correct.

### Run Migrations
```bash
npm run db:migrate
```

Creates all database tables and indexes.

### Development Mode
```bash
npm run db:migrate:dev
```

Runs migrations with extra logging.

## Migrations

Migrations are located in `server/database/migrations/` and run in numerical order:

1. `001_create_base_schema.sql` - Organizations, users, audit logs
2. `002_create_domain_tables.sql` - Inventory & Recipe tables
3. `003_create_beo_tables.sql` - BEO/Events tables
4. `004_create_crm_tables.sql` - CRM tables
5. `005_create_labor_tables.sql` - Labor/HR tables

## Troubleshooting

### Connection Timeout
- Check that `DATABASE_URL` is correct
- Ensure your IP is allowed in Neon dashboard
- Verify SSL is enabled (`?sslmode=require` in URL)

### SSL Errors
- Neon requires SSL connections
- Connection string should include `?sslmode=require`
- `rejectUnauthorized: false` is set in connection config

### Permission Errors
- Ensure database user has CREATE TABLE permissions
- Check that the database exists

## Database Structure

- **Base tables**: organizations, users, audit_logs
- **Inventory**: items, locations, categories, transactions, counts
- **Recipes**: recipes, ingredients, steps, categories, nutrition, versions, photos, costs
- **BEO/Events**: beos, rooms, equipment, staff, invoices, payments
- **CRM**: prospects, clients, activities, proposals, campaigns, reviews
- **Labor**: employees, positions, shifts, time_clock_entries, payroll

All tables include:
- UUID primary keys
- Multi-tenant (`org_id`)
- Audit fields (`created_by`, `updated_by`)
- Soft delete support (`archived_at`)
- Automatic `updated_at` triggers
