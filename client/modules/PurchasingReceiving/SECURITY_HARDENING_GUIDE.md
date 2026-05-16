# Security Hardening Guide

A comprehensive guide to securing your Lucca installation in production environments.

## Table of Contents

- [Overview](#overview)
- [Authentication & Authorization](#authentication--authorization)
- [Data Protection](#data-protection)
- [API Security](#api-security)
- [Infrastructure Security](#infrastructure-security)
- [Application Security](#application-security)
- [Compliance & Auditing](#compliance--auditing)
- [Incident Response](#incident-response)
- [Security Checklist](#security-checklist)

---

## Overview

Security is a shared responsibility. This guide covers:

- Securing authentication and authorization
- Protecting sensitive data
- Hardening API endpoints
- Configuring infrastructure securely
- Implementing compliance measures
- Monitoring and incident response

---

## Authentication & Authorization

### 1. Implement Strong Authentication

#### Environment Variables

Never expose secrets in code or logs.

```bash
# ✓ CORRECT: Use environment variables
SUPABASE_SERVICE_KEY=eyJhbGc...
DATABASE_PASSWORD=secure_password_123

# ✗ WRONG: Hardcoded secrets
const apiKey = "eyJhbGc..."; // NEVER do this
```

#### JWT Token Security

```typescript
// Verify JWT tokens properly
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

async function verifyToken(token: string) {
  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload;
  } catch (error) {
    throw new Error("Invalid token");
  }
}
```

#### Password Hashing

```typescript
import bcrypt from "bcrypt";

// Hash passwords with bcrypt
async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// Verify passwords
async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
```

**Never store plain text passwords!**

### 2. Implement Authorization Checks

#### Role-Based Access Control (RBAC)

```typescript
// Define role permissions
const rolePermissions = {
  admin: ["read", "write", "delete", "manage_users"],
  manager: ["read", "write", "manage_outlet"],
  receiver: ["read", "write_inventory"],
  finance: ["read", "write_invoices"],
};

// Check authorization
function authorizeAction(userRole: string, action: string): boolean {
  const permissions =
    rolePermissions[userRole as keyof typeof rolePermissions] || [];
  return permissions.includes(action);
}

// Middleware example
async function authorizationMiddleware(req, res, next) {
  const user = req.user;
  const action = req.action;

  if (!authorizeAction(user.role, action)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  next();
}
```

#### Row-Level Security (RLS)

Enable RLS in Supabase for database-level security:

```sql
-- Enable RLS on invoices table
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see invoices from their outlets
CREATE POLICY invoices_outlet_isolation ON invoices
  FOR SELECT
  USING (
    outlet_id IN (
      SELECT outlet_id FROM user_outlets WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can see all invoices
CREATE POLICY invoices_admin_access ON invoices
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
```

### 3. Multi-Factor Authentication (MFA)

```typescript
// Enable MFA using TOTP
import { authenticator } from "otplib";

async function enableMFA(userId: string) {
  const secret = authenticator.generateSecret();

  // Store secret securely
  await supabase
    .from("profiles")
    .update({ mfa_secret: secret })
    .eq("id", userId);

  return {
    secret,
    qrCode: authenticator.keyuri(userId, "Lucca", secret),
  };
}

// Verify MFA token
async function verifyMFAToken(userId: string, token: string) {
  const { data: user } = await supabase
    .from("profiles")
    .select("mfa_secret")
    .eq("id", userId)
    .single();

  if (!user?.mfa_secret) return false;

  return authenticator.check(token, user.mfa_secret);
}
```

---

## Data Protection

### 1. Encryption at Rest

#### Database Encryption

Supabase provides encryption at rest by default. Verify it's enabled:

```bash
# Check Supabase project settings
# Settings > Database > Encryption at rest (should be enabled)
```

#### Sensitive Data Encryption

```typescript
import crypto from "crypto";

const algorithm = "aes-256-cbc";
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, "salt", 32);

function encryptData(data: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

function decryptData(encryptedData: string): string {
  const [ivHex, encrypted] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// Usage
const ssn = encryptData("123-45-6789");
// Store ssn in database
// Later:
const decrypted = decryptData(ssn); // '123-45-6789'
```

### 2. Encryption in Transit

#### HTTPS/TLS

```bash
# ✓ CORRECT: Always use HTTPS
https://your-domain.com/api/invoices

# ✗ WRONG: Never use HTTP in production
http://your-domain.com/api/invoices
```

#### Enforce HTTPS

```typescript
// Express middleware
function enforceHTTPS(req, res, next) {
  if (req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  next();
}

// Add to app
app.use(enforceHTTPS);

// In Netlify netlify.toml
[[redirects]]
from = "/*"
to = ":splat"
status = 301
force = true
headers = { X-Forwarded-Proto = "https" }
```

### 3. Secrets Management

```typescript
// ✓ CORRECT: Use environment variables
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// ✗ WRONG: Hardcoded secrets
const supabaseKey = 'eyJhbGc...';

// ✗ WRONG: In git history
git log --all --full-history -- "**/config.js"

// Rotate secrets regularly
// 1. Generate new secret
// 2. Update all services
// 3. Keep old secret for grace period
// 4. Remove old secret
```

---

## API Security

### 1. Input Validation

```typescript
import { z } from "zod";

// Define validation schemas
const invoiceSchema = z.object({
  invoice_number: z.string().min(3).max(20),
  vendor_name: z.string().min(1).max(100),
  amount: z.number().positive(),
  status: z.enum(["draft", "sent", "paid", "overdue"]),
});

// Validate request data
async function createInvoice(req: Request, res: Response) {
  try {
    const validated = invoiceSchema.parse(req.body);
    // Process validated data
  } catch (error) {
    return res.status(400).json({ error: "Invalid input" });
  }
}
```

### 2. SQL Injection Prevention

```typescript
// ✓ CORRECT: Use parameterized queries
const { data } = await supabase.from("invoices").select().eq("id", invoiceId);

// ✗ WRONG: String concatenation (vulnerable)
const query = `SELECT * FROM invoices WHERE id = '${invoiceId}'`;
```

### 3. XSS Prevention

```typescript
// ✓ CORRECT: React automatically escapes
function InvoiceDisplay({ invoice }) {
  return <div>{invoice.vendor_name}</div>;
}

// ✗ WRONG: Never use dangerouslySetInnerHTML
function InvoiceDisplay({ invoice }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: invoice.vendor_name }} />
  );
}

// Server-side: Sanitize HTML if needed
import DOMPurify from 'isomorphic-dompurify';

const sanitized = DOMPurify.sanitize(userInput);
```

### 4. CSRF Protection

```typescript
import csrf from "csurf";
import cookieParser from "cookie-parser";

// Set up CSRF middleware
app.use(cookieParser());
app.use(csrf({ cookie: true }));

// Include token in forms
app.get("/form", (req, res) => {
  res.send(`
    <form method="POST" action="/invoice">
      <input type="hidden" name="_csrf" value="${req.csrfToken()}">
      <input type="text" name="vendor_name">
      <button type="submit">Create</button>
    </form>
  `);
});

// Verify token on POST
app.post("/invoice", (req, res) => {
  // Token automatically verified by middleware
  console.log("CSRF token valid");
});
```

### 5. Rate Limiting

```typescript
import rateLimit from "express-rate-limit";

// Create rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to all requests
app.use(limiter);

// Apply stricter limits to login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: (req) => req.user, // Don't rate limit authenticated users
});

app.post("/auth/login", loginLimiter, (req, res) => {
  // Handle login
});
```

### 6. API Key Security

```typescript
// Store API keys securely
async function generateAPIKey(userId: string) {
  const key = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(key).digest("hex");

  // Store only the hash
  await supabase.from("api_keys").insert({
    user_id: userId,
    key_hash: hash,
    created_at: new Date(),
  });

  // Return full key once (user should save it)
  return key;
}

// Verify API keys
async function verifyAPIKey(key: string) {
  const hash = crypto.createHash("sha256").update(key).digest("hex");

  const { data } = await supabase
    .from("api_keys")
    .select("user_id")
    .eq("key_hash", hash)
    .single();

  return data?.user_id;
}
```

---

## Infrastructure Security

### 1. Environment Configuration

```bash
# .env.production (DO NOT commit)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
DATABASE_URL=postgres://...
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key
NODE_ENV=production
LOG_LEVEL=info
```

### 2. Dependency Security

```bash
# Regularly check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies safely
npm update

# Check dependencies in CI/CD
npm audit --audit-level=moderate

# Use dependabot for automated updates
# Enable in GitHub Settings > Code security and analysis
```

### 3. Database Security

```sql
-- Create read-only roles for specific functions
CREATE ROLE read_only;
GRANT USAGE ON SCHEMA public TO read_only;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO read_only;

-- Restrict direct database access
-- Use only through Supabase API with RLS policies

-- Enable audit logging
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  table_name VARCHAR,
  operation VARCHAR,
  user_id UUID,
  timestamp TIMESTAMP,
  changes JSONB
);

-- Create trigger for audit logging
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, operation, user_id, timestamp, changes)
  VALUES (TG_TABLE_NAME, TG_OP, auth.uid(), NOW(), TO_JSONB(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Application Security

### 1. Secure Headers

```typescript
import helmet from "helmet";

// Add security headers
app.use(helmet());

// Custom headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  );

  next();
});
```

### 2. Logging & Monitoring

```typescript
// Log security events
function logSecurityEvent(event: string, details: any) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "security",
      event,
      details,
      // Never log sensitive data
    }),
  );
}

// Example
logSecurityEvent("failed_login_attempt", {
  userId: "user-123",
  ip: "192.168.1.1",
  reason: "invalid_password",
});

// ✗ WRONG: Never log passwords or tokens
// logSecurityEvent('login', { password: userPassword }); // NEVER
```

### 3. Error Handling

```typescript
// ✓ CORRECT: Don't expose internal errors
app.use((err, req, res, next) => {
  console.error("Internal error:", err); // Log internally

  // Return generic message to client
  res.status(500).json({
    error: "An error occurred. Please try again later.",
  });
});

// ✗ WRONG: Don't expose stack traces
res.status(500).json({
  error: err.message,
  stack: err.stack, // NEVER expose stack traces
});
```

---

## Compliance & Auditing

### 1. GDPR Compliance

```typescript
// Right to be forgotten
async function deleteUserData(userId: string) {
  // Delete personal data
  await supabase.from("profiles").delete().eq("id", userId);

  // Delete related data
  await supabase.from("invoices").delete().eq("user_id", userId);

  // Log deletion for audit trail
  await logSecurityEvent("user_data_deleted", { userId });
}

// Data export
async function exportUserData(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", userId);

  return {
    profile,
    invoices,
  };
}
```

### 2. Audit Logging

```typescript
// Log all sensitive actions
async function auditLog(
  action: string,
  resource: string,
  userId: string,
  details: any,
) {
  await supabase.from("audit_logs").insert({
    action,
    resource,
    user_id: userId,
    details,
    created_at: new Date().toISOString(),
    ip_address: req.ip, // Capture IP for fraud detection
  });
}

// Examples
auditLog("invoice_created", "invoices", userId, { invoiceId, amount });
auditLog("payment_processed", "payments", userId, { paymentId, amount });
auditLog("user_role_changed", "profiles", adminId, { userId, newRole });
```

---

## Incident Response

### 1. Breach Detection

```typescript
// Monitor failed login attempts
async function trackFailedLogin(userId: string, ip: string) {
  const recentAttempts = await supabase
    .from("failed_logins")
    .select("count")
    .eq("user_id", userId)
    .eq("ip_address", ip)
    .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());

  if (recentAttempts.length >= 5) {
    // Lock account and notify user
    await lockAccount(userId);
    await sendSecurityAlert(userId, "Unusual login activity detected");
  }
}

// Monitor data access patterns
async function detectAnomalousAccess(userId: string) {
  const recentAccess = await getRecentDataAccess(userId);
  const avgDataSize = await calculateAverageDataAccess(userId);

  if (recentAccess > avgDataSize * 10) {
    // Alert on unusual data access
    await sendSecurityAlert(userId, "Unusual data access pattern detected");
  }
}
```

### 2. Incident Response Plan

```
1. Detection
   - Monitor alerts and logs
   - Identify compromised systems

2. Containment
   - Isolate affected systems
   - Revoke compromised credentials
   - Block suspicious IPs

3. Investigation
   - Review logs and audit trail
   - Determine scope of breach
   - Identify root cause

4. Remediation
   - Patch vulnerabilities
   - Reset compromised credentials
   - Update security policies

5. Recovery
   - Restore from backups
   - Rebuild systems
   - Resume operations

6. Post-Incident
   - Notify affected users
   - File incident report
   - Implement improvements
```

---

## Security Checklist

### Before Going Live

- [ ] All secrets stored in environment variables
- [ ] HTTPS enabled on all endpoints
- [ ] HTTPS redirects configured
- [ ] SQL injection prevention verified
- [ ] Input validation implemented
- [ ] XSS protection enabled
- [ ] CSRF protection configured
- [ ] Rate limiting enabled
- [ ] Security headers added
- [ ] Database encryption enabled
- [ ] Row-Level Security (RLS) policies configured
- [ ] API keys properly hashed
- [ ] Passwords properly hashed (bcrypt)
- [ ] Audit logging enabled
- [ ] Error handling doesn't expose internals
- [ ] Dependencies scanned for vulnerabilities
- [ ] Backup and recovery plan tested
- [ ] Incident response plan documented
- [ ] Staff security training completed
- [ ] Security policy documented

### Regular Maintenance

- [ ] Weekly: Review security logs
- [ ] Weekly: Check for failed login attempts
- [ ] Monthly: Update dependencies
- [ ] Monthly: Scan for vulnerabilities
- [ ] Quarterly: Review access controls
- [ ] Quarterly: Test disaster recovery
- [ ] Annually: Full security audit
- [ ] Annually: Update incident response plan

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Documentation](https://supabase.com/docs/guides/security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)

---

## Support

For security concerns or vulnerability reports:

- Email: security@lucca.io
- Use responsible disclosure: Do not publicly disclose vulnerabilities
- Allow 90 days for patches before public disclosure

---

**Last Updated:** January 2024  
**Document Version:** 1.0
