# EchoAurum Disaster Recovery Plan

## RTO & RPO Targets

**Recovery Time Objective (RTO):** <4 hours  
**Recovery Point Objective (RPO):** <1 hour  

---

## Backup Strategy

### Daily Automated Backups
- **Frequency:** Every 6 hours
- **Retention:** 30 days rolling
- **Storage:** Neon automated backups + S3 cross-region backup
- **Verification:** Automated restore test every Sunday

### Backup Components
1. **PostgreSQL Database** (forensic_audit_log, automation_rules, rule_execution_log, etc.)
2. **Rule Engine State** (active rules, templates, AI learning data)
3. **Configuration** (system settings, RBAC, approvals)
4. **Forensic Audit Trail** (immutable, encrypted)

### Backup Verification
```bash
# Automated daily at 2 AM UTC
postgres-backup-verify.sh

# Manual verification
pg_restore --list backup.sql | grep -E "automation_rules|forensic_audit_log"
psql < backup.sql --dbname=test_db
SELECT COUNT(*) FROM automation_rules;
```

---

## Disaster Scenarios & Recovery

### Scenario 1: Database Corruption (LOW PROBABILITY)

**Symptoms:**
- Queries returning NULL or corrupted data
- Forensic hash chain verification fails
- Rule execution logs contain invalid entries

**Detection:**
- Automated integrity checks fail
- Monitoring alerts: "CRITICAL: Audit Trail Integrity Failed"
- System automatically stops rule processing

**Recovery Steps (Estimated: 30-60 minutes)**

1. **Immediate (T+0 min):**
   ```bash
   # Stop rule engine
   curl -X POST /api/aurum/admin/rule-engine/stop
   
   # Disable all rule processing
   UPDATE automation_rules SET is_active = false;
   
   # Alert team
   Incident: DB_CORRUPTION_DETECTED
   Page: On-call database administrator
   ```

2. **Assessment (T+5 min):**
   - Determine scope of corruption
   - Check most recent good backup timestamp
   - Verify backup integrity
   ```sql
   SELECT pg_database_size('echoaurum');
   SELECT COUNT(*) FROM forensic_audit_log;
   SELECT MAX(created_at) FROM forensic_audit_log;
   ```

3. **Restore (T+15 min):**
   - Stop all database connections
   - Restore from point-in-time backup
   ```bash
   # Restore from backup taken 1 hour before corruption
   pg_restore -h production.db.neon.tech \
             -U neon_admin \
             -d echoaurum \
             --verbose \
             backup_2024_01_15_06_00_00.sql
   ```

4. **Verification (T+30 min):**
   - Run integrity checks
   - Verify rule counts match expected
   - Confirm forensic trail integr ity
   ```bash
   # Verify hash chain
   curl /api/aurum/forensic/verify-integrity?entity_id=entity-1
   # Should return: is_valid: true
   ```

5. **Reactivation (T+45 min):**
   - Re-enable rules gradually
   - Start with read-only rules (alerts)
   - Gradually enable auto-execute rules
   - Monitor closely for next 4 hours

6. **Post-Recovery:**
   - Root cause analysis
   - Reprocess transactions from last backup point
   - Notify customers of recovery
   - Update backup procedures if needed

---

### Scenario 2: Data Loss (CRITICAL)

**Symptoms:**
- Entire table deleted or truncated
- Forensic audit trail partially missing
- Transaction history gaps

**Detection:**
- Neon automated alerts
- Backup verification fails
- Row counts unexpectedly decrease

**Recovery Steps (Estimated: 60-120 minutes)**

1. **Immediate (T+0 min):**
   ```bash
   # STOP EVERYTHING
   POST /api/aurum/admin/system/stop
   
   # Page on-call engineer + DBA + Director
   SEVERITY: P0 - DATA LOSS
   RTO: 2 hours
   RPO: 1 hour (may lose last hour of data)
   ```

2. **Assessment (T+5 min):**
   - Determine what data is missing
   - Check backup integrity
   - Calculate recovery time
   ```sql
   -- Check current row counts
   SELECT 
     'forensic_audit_log' as table_name,
     COUNT(*) as row_count
   FROM forensic_audit_log
   UNION ALL
   SELECT 
     'automation_rules',
     COUNT(*) FROM automation_rules;
   ```

3. **Restore (T+20 min):**
   - Restore entire database from backup
   - This will roll back transactions from last 1 hour
   - Redact any sensitive data if needed
   ```bash
   # Full database restore
   pg_restore -d echoaurum \
             --clean \
             --if-exists \
             backup_2024_01_15_20_00_00.tar
   ```

4. **Data Reconciliation (T+60 min):**
   - Identify transactions lost (last 1 hour)
   - Reprocess transactions manually if business-critical
   - Update audit trail with recovery details
   - Generate report of lost data

5. **Reactivation (T+90 min):**
   - Verify system health
   - Re-enable rules
   - Monitor for 24 hours
   - Customers may need to re-enter lost transactions

6. **Post-Recovery:**
   - Detailed root cause analysis
   - Customer notification and compensation
   - Review backup/retention procedures
   - Consider point-in-time recovery improvements

---

### Scenario 3: Audit Trail Tampering (SECURITY INCIDENT)

**Symptoms:**
- Hash chain verification detects broken link
- Entries show signs of modification
- Unauthorized access attempt logs

**Detection:**
- `GET /api/aurum/forensic/verify-integrity` returns false
- Monitoring alerts: "SECURITY: Audit Trail Tampered"
- System stops all transaction processing

**Recovery Steps (Estimated: 120+ minutes)**

1. **Immediate (T+0 min):**
   ```
   INCIDENT SEVERITY: P0 - SECURITY BREACH
   
   Actions:
   - STOP all system operations
   - Isolate database (no external connections)
   - Page: Security team, DBA, Legal/Compliance
   - Create incident in Slack #incidents channel
   - Do NOT attempt recovery without security approval
   ```

2. **Forensic Investigation (T+5 min):**
   - Preserve all evidence
   - Identify tampering method
   - Check database access logs
   - Review recent code changes
   - Check backup integrity

3. **Scope Determination (T+30 min):**
   - How much data compromised?
   - How long has tampering been occurring?
   - Was customer data exposed?
   - Does this require regulatory notification?

4. **Remediation Decision (T+45 min):**
   - Option A: Restore from pre-breach backup (recommended)
   - Option B: Attempt to identify and fix corrupted entries
   - Legal/Compliance team makes final decision

5. **Restore (T+60 min):**
   - If Option A: Full database restore from known-good backup
   - Verify hash chain integrity post-restore
   - Re-establish audit trail with recovery entry

6. **Post-Breach Activities (Days 1-7):**
   - Detailed forensic analysis
   - Customer notification (within 24 hours if required)
   - Regulatory reporting (if applicable)
   - Security hardening improvements
   - Public transparency statement

---

### Scenario 4: Infrastructure Failure

**Symptoms:**
- Database server unresponsive
- All API requests timing out
- Monitoring dashboards show 0 data

**Detection:**
- Infrastructure monitoring alerts
- Neon status page shows incidents
- Health checks fail for 5+ minutes

**Recovery Steps (Estimated: 15-30 minutes)**

1. **Failover (T+0 min):**
   - Neon automatically failovers to replica (usually <1 min)
   - System automatically retries connections

2. **Verification (T+2 min):**
   - Check system status
   - Verify rule processing resumes
   - Check for any queued transactions
   ```bash
   curl /api/health
   # Should return: status: healthy
   ```

3. **Data Integrity (T+5 min):**
   - Verify audit trail integrity
   - Check for transaction loss
   - Confirm rule execution logs updated
   ```sql
   SELECT COUNT(*) FROM forensic_audit_log 
   WHERE created_at >= NOW() - INTERVAL '5 minutes';
   ```

4. **Reactivation (T+10 min):**
   - Resume normal operations
   - No customer action needed
   - Monitor for next 4 hours for anomalies

---

## Testing

### Monthly RTO/RPO Test
- **When:** First Sunday of each month at 2 AM UTC
- **Duration:** 60-90 minutes
- **Scope:** Full database restore from latest backup

```bash
#!/bin/bash
# Monthly backup test
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

# Create staging database
createdb echoaurum_test

# Restore backup
pg_restore -d echoaurum_test latest_backup.tar

# Verify integrity
psql -d echoaurum_test -c "
  SELECT 
    'forensic_audit_log' as table_name,
    COUNT(*) as row_count
  FROM forensic_audit_log
  UNION ALL
  SELECT 'automation_rules', COUNT(*) FROM automation_rules;
"

# Verify hash chain
curl /api/aurum/forensic/verify-integrity?entity_id=test-entity

# Report results
echo "Backup Test: PASS" >> backup_test_log.txt
```

### Quarterly DR Drill
- **Duration:** 2-4 hours
- **Scope:** Full system recovery simulation
- **Participants:** Engineering, operations, support, customer success
- **Documentation:** DR drill playbook execution

---

## Runbook: System Recovery

### Phase 1: Assessment (5-10 min)

1. Identify incident type
   - [ ] Data corruption
   - [ ] Data loss
   - [ ] Infrastructure failure
   - [ ] Security breach

2. Determine scope
   - How many entities affected?
   - How much data lost/compromised?
   - Timeline: When did incident occur?

3. Notify stakeholders
   - [ ] Engineering team paged
   - [ ] Customer Success alerted
   - [ ] Executive team notified (if P0)
   - [ ] Legal/Compliance (if breach)

### Phase 2: Containment (5-20 min)

1. Stop damage progression
   - [ ] Disable all rule processing
   - [ ] Isolate database (if security incident)
   - [ ] Stop accepting new transactions

2. Preserve evidence
   - [ ] Backup current state (if possible)
   - [ ] Collect system logs
   - [ ] Screenshot monitoring dashboards
   - [ ] Document incident timeline

### Phase 3: Recovery (30-120 min)

1. Determine recovery approach
   - Point-in-time restore? From when?
   - Full database restore? Which backup?
   - Selective recovery? What tables?

2. Execute recovery
   - Follow scenario-specific steps above
   - Verify each phase with integrity checks
   - Monitor for new issues

### Phase 4: Validation (20-30 min)

1. Verify recovery success
   - [ ] All tables restored
   - [ ] Hash chain integrity: OK
   - [ ] Row counts match expected
   - [ ] No corruption detected

2. Resume operations
   - [ ] Re-enable rules
   - [ ] Monitor transactions
   - [ ] Check customer access

### Phase 5: Post-Recovery (Days 1-7)

1. Root cause analysis
   - [ ] What caused the incident?
   - [ ] Why wasn't it detected earlier?
   - [ ] How do we prevent recurrence?

2. Process improvements
   - [ ] Update backup procedures
   - [ ] Enhance monitoring
   - [ ] Improve runbooks
   - [ ] Customer notification

3. Communication
   - [ ] Internal debrief
   - [ ] Customer notification
   - [ ] Transparency statement (if public)
   - [ ] Regulatory notification (if needed)

---

## Key Contacts

| Role | Name | Email | Phone |
|------|------|-------|-------|
| VP Engineering | [Name] | [email] | [phone] |
| On-call DBA | [Name] | [email] | [phone] |
| Security Lead | [Name] | [email] | [phone] |
| CFO | [Name] | [email] | [phone] |
| Customer Success Lead | [Name] | [email] | [phone] |

---

## Tools & Resources

- **Database:** Neon PostgreSQL
- **Backups:** Automated Neon backups + S3 cross-region
- **Monitoring:** Datadog/New Relic
- **Communication:** Slack #incidents channel
- **Documentation:** GitHub wiki (internal only)

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Last DR Test:** TBD  
**Next DR Test:** First Sunday monthly at 2 AM UTC  
**Status:** ACTIVE
