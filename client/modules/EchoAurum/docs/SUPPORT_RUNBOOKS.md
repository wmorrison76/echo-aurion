# EchoAurum Phase 2 Support Runbooks

Quick reference for handling common support scenarios.

## Rule Creation & Management Issues

### Issue: Rule Not Triggering

**Severity:** P2  
**Detection:** Customer reports rule created but no transactions processed

**Diagnosis:**
1. Check rule status: Is it **Active** and **Not Paused**?
   - If paused, ask customer to resume
   - If not active, rule may not have been saved properly
2. Verify conditions match recent transactions
   - Request transaction sample from customer
   - Compare against rule conditions manually
3. Check rule execution log
   ```
   GET /api/aurum/rules/{ruleId}/history
   ```
   - If empty: Rule never triggered (conditions too strict)
   - If shows failures: Rule triggered but action failed

**Resolution:**
1. **If conditions too strict:**
   - Ask customer to temporarily lower thresholds
   - Run test transaction with amount matching condition
   - Once working, adjust thresholds back to desired level
2. **If action failing:**
   - Check error message in execution log
   - Common causes:
     - GL account doesn't exist (invalid account code)
     - Required fields missing in action configuration
     - Approval requirement blocking execution
3. **If never triggered:**
   - Review rule conditions character-by-character
   - Check operator: is `>` correct or should be `<`?
   - Check field names: match available transaction fields
   - Create alert rule first to debug without side effects

**Prevention:**
- Always test with "Alert only" first
- Create with approval required until confident
- Review execution stats daily first week

---

### Issue: Rule Triggering Too Often

**Severity:** P2  
**Detection:** Rule execution count unexpectedly high

**Diagnosis:**
1. Check rule conditions
   - Are all conditions necessary?
   - Is threshold appropriate?
2. Review recent executions
   ```
   GET /api/aurum/rules/{ruleId}/history?limit=100
   ```
3. Analyze transaction data
   - How many transactions match this rule daily?
   - Is this expected volume?

**Resolution:**
1. **If conditions too permissive:**
   - Add additional conditions (AND logic)
   - Make thresholds stricter
   - Use regex patterns for vendor/description filtering
2. **If correct behavior:**
   - This is expected, no action needed
   - Rule is working as designed
3. **If should only match specific transactions:**
   - Add vendor/customer filtering
   - Add date/time restrictions
   - Use regex for account codes

**Prevention:**
- Start with conservative conditions
- Gradually expand rule scope once comfortable
- Review execution stats before expanding

---

### Issue: Rule Approval Workflow Not Working

**Severity:** P2  
**Detection:** Rule set to approval required but not appearing in approval queue

**Diagnosis:**
1. Verify rule has `approval_required: true`
   ```
   GET /api/aurum/rules/{ruleId}
   ```
2. Check if transaction matched rule
   - Check execution log for pending approvals
3. Verify approver role configured
   - User must have APPROVAL permission
4. Check approval queue API
   ```
   GET /api/aurum/approval-queue?user_id={userId}
   ```

**Resolution:**
1. **If rule missing approval_required:**
   - Update rule: `PUT /api/aurum/rules/{ruleId}` with `approval_required: true`
2. **If rule didn't trigger:**
   - Use procedure from "Rule Not Triggering"
3. **If approver missing permission:**
   - Contact admin to assign APPROVAL permission
   - Verify user has AUTOMATION_OVERRIDE permission
4. **If approval appears but can't approve:**
   - Check user role and permissions
   - Verify user hasn't been deactivated

---

### Issue: AI Suggestion Low Confidence

**Severity:** P3  
**Detection:** Customer concerned AI suggestion may not be reliable (confidence < 70%)

**Diagnosis:**
1. Review pattern detection
   ```
   GET /api/aurum/learning/patterns?entity_id={entityId}
   ```
2. Check consistency of decisions
   - Low confidence usually means inconsistent decisions
3. Look at example transactions in suggestion

**Resolution:**
1. **If confidence 70-80%:**
   - Consider accepting but with approval required
   - Modify conditions based on actual intent
   - Test rule with small sample before full deployment
2. **If confidence < 70%:**
   - Advise customer to reject suggestion
   - Encourage more consistent decisions for future patterns
   - Manual rule creation may be more appropriate
3. **If customer unsure about rule:**
   - Suggest creating alert rule first to validate logic
   - Once comfortable, convert to auto-execute
   - Always use approval required for first 50 executions

---

### Issue: Rule Deleted But Need to Recover

**Severity:** P2  
**Detection:** Customer accidentally deleted rule, wants to restore

**Diagnosis:**
1. Rule is soft-deleted, still in database
2. Check deletion time and contents
   ```
   SELECT * FROM automation_rules 
   WHERE id = '{ruleId}' AND deleted_at IS NOT NULL
   ```

**Resolution:**
1. **If recently deleted (<24 hours):**
   - Restore rule: `UPDATE automation_rules SET deleted_at = NULL WHERE id = '{ruleId}'`
   - Notify customer rule is restored
2. **If > 24 hours deleted:**
   - Check if rule content can be recovered from audit trail
   - Offer to help recreate rule manually if restoration not possible
3. **Prevention:**
   - Recommend reviewing rules monthly for unused ones
   - Document reason for deletion before deleting

---

## AI Learning & Pattern Detection Issues

### Issue: No AI Suggestions Appearing

**Severity:** P2  
**Detection:** Customer made manual overrides but no suggestions appear

**Diagnosis:**
1. Check override tracking
   ```
   GET /api/aurum/learning/statistics?entity_id={entityId}
   ```
2. Verify operator overrides are being recorded
3. Check if 3+ identical decisions made
   - Pattern requires at least 3 occurrences
   - Consistency must be >= 70%

**Resolution:**
1. **If too few overrides:**
   - Encourage more manual decisions to build patterns
   - AI learns after ~3-5 similar decisions
   - Check back in 1-2 weeks once more patterns form
2. **If overrides not recorded:**
   - Verify override tracking API working
   - Check if manual decisions truly override AI recommendation
   - Sometimes operator approval ≠ override
3. **If low consistency:**
   - Customer making inconsistent decisions
   - Once decisions become consistent, pattern will be detected
   - Current behavior is correct

---

### Issue: Operator Learning Dashboard Not Updating

**Severity:** P2  
**Detection:** Dashboard statistics seem stale or incomplete

**Diagnosis:**
1. Check refresh rate (should update every hour)
2. Verify override data being logged
3. Check database queries
   ```
   SELECT COUNT(*) FROM operator_overrides 
   WHERE created_at >= NOW() - INTERVAL '24 hours'
   ```

**Resolution:**
1. **If stale for > 4 hours:**
   - Force manual refresh of dashboard
   - Check monitoring for learning service status
2. **If stats incorrect:**
   - Verify calculation logic
   - Run manual counts and compare
   - If discrepancy > 5%, escalate to engineering
3. **If empty dashboard:**
   - Confirm overrides are being recorded
   - Check if user has permission to view learning dashboard

---

## Forensic Audit Trail Issues

### Issue: Forensic Report Won't Generate

**Severity:** P2  
**Detection:** Customer requests forensic report, generation fails

**Diagnosis:**
1. Check date range validity
   - End date must be after start date
   - Range shouldn't exceed 1 year
2. Verify transaction types specified exist
3. Check database for audit entries in range
   ```
   SELECT COUNT(*) FROM forensic_audit_log 
   WHERE entity_id = '{entityId}' 
   AND created_at BETWEEN '{start}' AND '{end}'
   ```

**Resolution:**
1. **If no entries in range:**
   - Check if transactions occurred in that period
   - Audit trail only logs when transactions process
   - If truly no transactions, report will show as empty
2. **If query timeout:**
   - Use smaller date range
   - Run monthly reports instead of yearly
   - Contact ops if performance issue persists
3. **If invalid parameters:**
   - Verify date format: YYYY-MM-DDTHH:MM:SSZ
   - Check transaction types spelling
   - Provide corrected request

**Prevention:**
- Generate reports monthly, not annually
- Use web UI date picker (prevents format errors)
- Keep reporting scope reasonable (3-6 months)

---

### Issue: Audit Trail Verification Failed

**Severity:** P1 (CRITICAL)  
**Detection:** Forensic integrity check returns `is_valid: false`

**Immediate Actions:**
1. **STOP all rule processing immediately**
   - Pause all rules: `POST /api/aurum/admin/rules/pause-all`
   - Set global flag: audit_trail_integrity = false
2. **Alert on-call engineer** - Page immediately
3. **Notify customer** - Be transparent about issue
4. **Preserve evidence** - Do not run verification again
5. **Initiate incident response**

**Investigation:**
1. Identify where hash chain breaks
   ```
   SELECT * FROM forensic_audit_log 
   WHERE entity_id = '{entityId}'
   ORDER BY created_at DESC LIMIT 100
   ```
2. Determine root cause:
   - Database corruption?
   - Unauthorized modification?
   - System crash during write?
   - Replication lag issue?
3. Check system logs for errors around break time

**Recovery:**
1. **If system crash:**
   - Restore from backup (point-in-time before corruption)
   - Reprocess transactions from backup point forward
   - Full audit and forensic review required
2. **If unauthorized modification:**
   - Notify compliance/legal immediately
   - Preserve all evidence
   - Begin forensic investigation
   - May require regulatory notification
3. **If replication lag:**
   - Wait for consistency to restore
   - Re-run verification
   - Adjust replication settings if needed

**Prevention:**
- Daily integrity checks scheduled
- Real-time alerts on verification failures
- Read-only access to forensic tables
- Encrypted audit trail storage

---

### Issue: Audit Trail Entry Missing

**Severity:** P2  
**Detection:** Customer reports transaction but can't find in audit trail

**Diagnosis:**
1. Verify transaction processed through system
2. Check if audit entry exists
   ```
   SELECT * FROM forensic_audit_log 
   WHERE transaction_id = '{txnId}'
   ```
3. Verify user/AI action was recorded

**Resolution:**
1. **If entry missing:**
   - Check transaction log (did transaction process?)
   - If transaction processed but audit entry missing: **P1 ESCALATION**
   - If transaction never processed: expected
2. **If entry exists but hard to find:**
   - Use correct transaction ID
   - Try searching by date instead
   - Use forensic report with filters
3. **If user action not logged:**
   - Verify user had permission to perform action
   - Check session was active
   - May be security issue if action not logged

---

## Performance & Monitoring Issues

### Issue: Rule Evaluation Slow (>50ms)

**Severity:** P2  
**Detection:** Rule evaluation times > 50ms average

**Diagnosis:**
1. Check current performance metrics
   ```
   GET /api/aurum/admin/metrics/rule-performance
   ```
2. Identify slow rules specifically
   ```
   GET /api/aurum/admin/metrics/rules-by-latency
   ```
3. Check database performance
   - Query slow log
   - Check index usage
   - Check table sizes

**Resolution:**
1. **If specific rule is slow:**
   - Count conditions in rule
   - Check regex patterns for efficiency
   - Consider breaking into multiple rules
2. **If all rules slow:**
   - Database may be under load
   - Check concurrent transaction count
   - Increase connection pool if needed
   - Run ANALYZE on tables
3. **If intermittent slowness:**
   - Check for lock contention
   - Review backup schedule (may interfere)
   - Check network latency

---

### Issue: High Error Rate in Rules (>5% failures)

**Severity:** P2  
**Detection:** Rule success rate dropping below 95%

**Diagnosis:**
1. Check error logs for patterns
   ```
   SELECT error, COUNT(*) FROM rule_execution_log 
   WHERE execution_status = 'failed' 
   AND created_at >= NOW() - INTERVAL '1 hour'
   GROUP BY error
   ```
2. Identify which rules failing
3. Check database connectivity/health

**Resolution:**
1. **If GL account invalid:**
   - Check account exists in GL chart
   - Update rule with correct account
   - Test with account lookup first
2. **If required field missing:**
   - Review rule action configuration
   - Add missing data mappings
   - Test with sample transaction
3. **If system error:**
   - Check database connectivity
   - Review application logs
   - May indicate larger system issue
4. **If intermittent:**
   - May be concurrency issue
   - Increase transaction pool
   - Stagger rule execution if possible

---

## Escalation Procedures

### When to Escalate to Engineering (P1)

- Audit trail verification failed
- Data loss or corruption detected
- All rules failing simultaneously
- Database connectivity lost
- Security vulnerability discovered
- System performance degraded >50% from baseline

### When to Escalate to Customer Success

- Customer wants custom rule logic not supported
- Integration with external system needed
- Large volume of rules needed (>1000)
- Compliance-specific requirements
- Custom reporting needs

### When to Escalate to Compliance/Legal

- Audit trail integrity compromised
- Unauthorized access suspected
- Regulatory requirement change
- Customer data access questions
- Potential data breach

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Status:** PRODUCTION READY
