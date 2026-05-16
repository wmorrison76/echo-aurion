# Admin Helper Scripts

This directory contains essential operational tools and scripts for system administration, maintenance, and management.

## Prerequisites

All scripts require the following environment variables to be set:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Your Supabase service role key (for admin operations)

## Available Scripts

### 1. User Role Management

**File:** `manageUserRoles.ts`

Manage user roles and permissions within the system.

```bash
ts-node scripts/admin/manageUserRoles.ts <userId> <add|remove> <role>
```

**Supported roles:**

- `admin` - Full system access
- `manager` - Outlet management and staff oversight
- `receiver` - Receiving and inventory operations
- `chef` - Recipe and menu management
- `finance` - Financial reporting and analysis

**Examples:**

```bash
# Add admin role to a user
ts-node scripts/admin/manageUserRoles.ts abc123def456 add admin

# Remove manager role from a user
ts-node scripts/admin/manageUserRoles.ts abc123def456 remove manager
```

---

### 2. Cache Management

**File:** `clearCache.ts`

Clear application cache entries to free up space and reset cached data.

```bash
ts-node scripts/admin/clearCache.ts [pattern|--expired]
```

**Commands:**

- No arguments - Clear all cache entries
- `<pattern>` - Clear cache entries matching a pattern (case-insensitive)
- `--expired` - Clear only expired cache entries

**Examples:**

```bash
# Clear all cache
ts-node scripts/admin/clearCache.ts

# Clear cache entries related to invoices
ts-node scripts/admin/clearCache.ts "invoice%"

# Clear only expired entries
ts-node scripts/admin/clearCache.ts --expired
```

---

### 3. Database Maintenance

**File:** `databaseMaintenance.ts`

Perform routine database maintenance tasks including vacuum, analyze, and cleanup operations.

```bash
ts-node scripts/admin/databaseMaintenance.ts <command>
```

**Commands:**

- `vacuum` - Reclaim storage space (PostgreSQL VACUUM)
- `analyze` - Update table statistics for query optimization
- `cleanup` - Clean up orphaned records
- `stats` - Display database statistics
- `all` - Run all maintenance tasks

**Examples:**

```bash
# Run VACUUM to reclaim storage
ts-node scripts/admin/databaseMaintenance.ts vacuum

# Analyze and update statistics
ts-node scripts/admin/databaseMaintenance.ts analyze

# Clean up orphaned records
ts-node scripts/admin/databaseMaintenance.ts cleanup

# View database statistics
ts-node scripts/admin/databaseMaintenance.ts stats

# Run all maintenance tasks
ts-node scripts/admin/databaseMaintenance.ts all
```

---

### 4. Outlet Management

**File:** `outletManagement.ts`

Manage outlets, their status, and user assignments.

```bash
ts-node scripts/admin/outletManagement.ts <command> [options]
```

**Commands:**

- `list` - List all outlets
- `create <name> <location>` - Create a new outlet
- `status <outletId> <status>` - Update outlet status
- `assign <userId> <outletId>` - Assign user to outlet
- `details <outletId>` - Show outlet details

**Status options:** `active`, `inactive`, `closed`

**Examples:**

```bash
# List all outlets
ts-node scripts/admin/outletManagement.ts list

# Create a new outlet
ts-node scripts/admin/outletManagement.ts create "Downtown Store" "123 Main St"

# Update outlet status to inactive
ts-node scripts/admin/outletManagement.ts status outlet-123 inactive

# Assign user to outlet
ts-node scripts/admin/outletManagement.ts assign user-456 outlet-123

# Show outlet details
ts-node scripts/admin/outletManagement.ts details outlet-123
```

---

### 5. Report Generation

**File:** `reportGenerator.ts`

Generate reports in JSON and CSV formats from system data.

```bash
ts-node scripts/admin/reportGenerator.ts <command> [options]
```

**Commands:**

- `invoice [outletId] [startDate] [endDate]` - Generate invoice report
- `inventory [outletId]` - Generate inventory report
- `activity [days]` - Generate user activity report
- `csv <type>` - Export data to CSV format

**Report types:** `invoices`, `inventory`

**Examples:**

```bash
# Generate invoice report for all outlets
ts-node scripts/admin/reportGenerator.ts invoice

# Generate invoice report for specific outlet and date range
ts-node scripts/admin/reportGenerator.ts invoice outlet-123 2024-01-01 2024-01-31

# Generate inventory report
ts-node scripts/admin/reportGenerator.ts inventory outlet-123

# Generate user activity report for last 30 days
ts-node scripts/admin/reportGenerator.ts activity 30

# Export invoices to CSV
ts-node scripts/admin/reportGenerator.ts csv invoices

# Export inventory to CSV
ts-node scripts/admin/reportGenerator.ts csv inventory
```

**Output:**
Reports are saved to the `reports/` directory in JSON format. CSV exports are also saved in the same directory.

---

### 6. Audit Log Management

**File:** `auditLog.ts`

View, create, and manage audit logs for compliance and security monitoring.

```bash
ts-node scripts/admin/auditLog.ts <command> [options]
```

**Commands:**

- `view [resourceType] [userId]` - View audit logs (optional filters)
- `log <userId> <action> <resourceType> <resourceId> [changes]` - Create audit log entry
- `summary [days]` - Generate audit summary
- `cleanup <daysOld>` - Delete logs older than N days

**Examples:**

```bash
# View all audit logs
ts-node scripts/admin/auditLog.ts view

# View logs for specific resource type
ts-node scripts/admin/auditLog.ts view invoices

# View logs for specific user
ts-node scripts/admin/auditLog.ts view invoices user-123

# Create audit log entry
ts-node scripts/admin/auditLog.ts log user-123 CREATE invoice inv-456

# Generate audit summary for last 30 days
ts-node scripts/admin/auditLog.ts summary 30

# Delete logs older than 90 days
ts-node scripts/admin/auditLog.ts cleanup 90
```

---

### 7. Backup Management

**File:** `backupManager.ts`

Create, list, restore, and manage database backups.

```bash
ts-node scripts/admin/backupManager.ts <command> [options]
```

**Commands:**

- `create [tableName]` - Create backup (all tables or specific table)
- `list` - List all available backups
- `restore <fileName>` - Restore from a backup
- `cleanup <daysOld>` - Delete backups older than N days

**Features:**

- Automatic gzip compression
- Metadata generation with checksums
- Compression statistics
- Selective table backups

**Examples:**

```bash
# Create full backup
ts-node scripts/admin/backupManager.ts create

# Backup specific table
ts-node scripts/admin/backupManager.ts create invoices

# List all backups
ts-node scripts/admin/backupManager.ts list

# Restore from backup
ts-node scripts/admin/backupManager.ts restore backup-2024-01-15T10-30-45.json.gz

# Delete backups older than 90 days
ts-node scripts/admin/backupManager.ts cleanup 90
```

**Output:**
Backups are saved to the `backups/` directory in compressed format (.json.gz) with accompanying metadata files.

---

### 8. Database Migration Helper

**File:** `migrationHelper.ts`

Manage database schema migrations and track migration history.

```bash
ts-node scripts/admin/migrationHelper.ts <command> [options]
```

**Commands:**

- `run <filePath>` - Run a specific migration file
- `runall` - Run all pending migrations
- `list` - List migration history
- `create <name>` - Create a new migration file template
- `rollback <id>` - Mark migration as rolled back

**Features:**

- Automatic migration tracking
- Execution time logging
- Pending migration detection
- Migration file templates
- Rollback support

**Examples:**

```bash
# Run a specific migration
ts-node scripts/admin/migrationHelper.ts run migrations/006_payment_system.sql

# Run all pending migrations
ts-node scripts/admin/migrationHelper.ts runall

# List migration history
ts-node scripts/admin/migrationHelper.ts list

# Create a new migration file
ts-node scripts/admin/migrationHelper.ts create "add_user_preferences"

# Rollback migration
ts-node scripts/admin/migrationHelper.ts rollback 006_payment_system
```

---

## Best Practices

### Security

- **Service Keys:** Always use Supabase service role keys (not anon keys) for admin operations
- **Environment Variables:** Never commit credentials to version control
- **Audit Logs:** Enable audit logging for all administrative actions
- **Access Control:** Restrict access to these scripts to authorized administrators only

### Backup Strategy

- **Frequency:** Create backups before major operations
- **Retention:** Keep backups for at least 30 days
- **Testing:** Regularly test backup restoration to ensure data integrity
- **Compression:** Backups are automatically compressed to save storage space

### Database Maintenance

- **Schedule:** Run maintenance tasks during low-usage windows
- **Monitoring:** Monitor database size and performance metrics
- **Cleanup:** Regularly delete expired cache entries and old logs
- **Analysis:** Run ANALYZE after large data modifications

### Migrations

- **Version Control:** Keep all migration files in the `migrations/` directory
- **Naming:** Use descriptive names for migration files
- **Testing:** Test migrations in a staging environment first
- **Rollback Plans:** Always have a rollback plan before running migrations

---

## Troubleshooting

### Connection Issues

If you encounter Supabase connection errors:

1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set correctly
2. Ensure your IP is whitelisted (if applicable)
3. Check internet connectivity

### Permission Errors

If scripts fail with permission errors:

1. Verify you're using the service role key (not anon key)
2. Check that the role has appropriate database permissions
3. Ensure Row Level Security (RLS) policies allow the operations

### Table Not Found

If scripts report missing tables:

1. Run all pending migrations first: `ts-node scripts/admin/migrationHelper.ts runall`
2. Verify the table exists in your Supabase project
3. Check table naming conventions

---

## Development

All scripts are written in TypeScript and require:

- Node.js 16+
- ts-node for TypeScript execution
- Supabase JavaScript client library

### Running Scripts

```bash
# Install dependencies (if not already installed)
npm install

# Run any admin script
ts-node scripts/admin/scriptName.ts [arguments]
```

---

## Support

For issues with these scripts or feature requests, please refer to the main project documentation or contact your system administrator.
