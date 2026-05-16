# Quick Start Guide - Phase 1, 2, and 7 Implementation

## 🚀 Getting Started

### 1. Database Setup (Phase 1)

Run the multi-tenant schema:
```sql
-- In Supabase SQL Editor, paste and run:
-- lib/supabase/multi-tenant-schema.sql
```

This creates:
- Organizations with subscription tiers (free, starter, professional, enterprise)
- User roles and permissions
- Feature availability matrix
- Audit logging
- Encrypted snapshots

### 2. Start the Development Server

```bash
pnpm install
pnpm dev
```

Server runs at: `http://localhost:8080/`

### 3. User Workflow

**Step 1: Open Studio and Talk to AI**
1. Navigate to `/studio` (Seed tab)
2. Start conversation in ConversationalDialog
3. Describe your project (e.g., "Recipe management system for restaurants")
4. AI asks clarifying questions about features, users, integrations

**Step 2: Select Tech Stack (Phase 2)**
1. When understanding is complete, TechStackPanel appears
2. See Option A and Option B side-by-side
3. Compare costs, timeline, scalability
4. Click "View Details" or "Selected" to see breakdown
5. Choose your preferred stack

**Step 3: Generate Code**
1. CodeGenerationPanel shows generation progress
2. System generates TypeScript/React components
3. Generates database schema (SQL)
4. Generates API routes

**Step 4: Optional - Advanced Features (Phase 7)**
Use API endpoints directly:
```bash
# Generate tests
curl -X POST http://localhost:8080/api/phase7/generate-tests \
  -H "Content-Type: application/json" \
  -d '{"files": [...], "framework": "jest"}'

# Generate CI/CD pipeline
curl -X POST http://localhost:8080/api/phase7/generate-cicd \
  -H "Content-Type: application/json" \
  -d '{"platform": "github", "stack": {...}}'

# Get available platforms
curl http://localhost:8080/api/phase7/platforms

# Generate documentation
curl -X POST http://localhost:8080/api/phase7/generate-docs \
  -H "Content-Type: application/json" \
  -d '{"files": [...], "projectName": "MyApp"}'

# Security audit
curl -X POST http://localhost:8080/api/phase7/security-audit \
  -H "Content-Type: application/json" \
  -d '{"files": [...], "stack": {...}}'
```

---

## 📋 API Reference

### Phase 1: Security

#### Chat (Protected)
```bash
# Send message
POST /api/chat-secured/
Headers: Authorization: Bearer <token>
Body: {"messages": [{"role": "user", "content": "..."}]}

# Get history
GET /api/chat-secured/history

# Clear history
DELETE /api/chat-secured/history
```

#### Snapshots (Encrypted)
```bash
# Create snapshot
POST /api/snapshots
Body: {"name": "backup-2024", "description": "..."}

# List snapshots
GET /api/snapshots

# Get snapshot
GET /api/snapshots/:id

# Restore from snapshot
POST /api/snapshots/:id/restore
Body: {"password": "..."}

# Delete snapshot
DELETE /api/snapshots/:id
```

### Phase 2: Tech Stack

```bash
# Get recommendations
POST /api/phase2/recommend
Body: {
  "coreIdea": "...",
  "targetUsers": "...",
  "keyFeatures": [...],
  "complexity": "moderate"
}

# Compare stacks
POST /api/phase2/compare
Body: {
  "stack1": {"database": "postgresql", "backend": "typescript", "frontend": "react"},
  "stack2": {"database": "mongodb", "backend": "python", "frontend": "vue"},
  "understanding": {...}
}

# List available tech
GET /api/phase2/stacks

# Implementation plan
POST /api/phase2/implementation-plan
Body: {"stack": {...}, "understanding": {...}}
```

### Phase 7: Advanced Features

```bash
# Generate tests
POST /api/phase7/generate-tests
Body: {"files": [...], "framework": "jest"}

# Generate CI/CD
POST /api/phase7/generate-cicd
Body: {"platform": "github", "stack": {...}}

# List platforms
GET /api/phase7/platforms

# Multi-language translation
POST /api/phase7/generate-multilang
Body: {"sourceCode": "...", "targetLanguages": ["python", "go", "rust"]}

# Team collaboration
POST /api/phase7/team-collaboration
Body: {"teamSize": 5, "roles": ["developer", "designer"]}

# Generate docs
POST /api/phase7/generate-docs
Body: {"files": [...], "projectName": "MyApp"}

# Security audit
POST /api/phase7/security-audit
Body: {"files": [...], "stack": {...}}
```

---

## 🔐 Security Features

### Authentication
- JWT-based with Supabase
- Organization isolation
- Role-based access control

### Rate Limiting
- 10 requests/minute for chat
- 5 requests/minute for expensive operations
- Tier-based limits (free: 100/min, enterprise: unlimited)

### Encryption
- AES-256-GCM for snapshots
- PBKDF2 key derivation
- Password-protected restoration

### Audit Logging
- All security events logged
- User tracking
- Change history
- Compliance ready

---

## 📊 Tech Stack Options

### Option A: MERN-style
```
Frontend: React
Backend: TypeScript/Node.js
Database: PostgreSQL
Best for: Most projects, good ecosystem
Timeline: 6-10 weeks
Cost: $2000-8000/month
```

### Option B: High-Performance
```
Frontend: Vue.js
Backend: Go or Python
Database: PostgreSQL
Best for: Performance-critical, AI/ML
Timeline: 8-12 weeks
Cost: $3000-10000/month
```

---

## 📦 Generated Files Examples

### Test Files
```typescript
// Generated: src/app.test.ts
describe('App', () => {
  it('should render', () => {
    expect(true).toBe(true);
  });
});
```

### CI/CD Pipeline
```yaml
# Generated: .github/workflows/ci.yml
name: CI/CD
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install && npm test && npm run build
```

### Documentation
```markdown
# Generated: README.md

## Installation
npm install
npm run dev

## Features
- Feature 1
- Feature 2
```

---

## 🧪 Testing Locally

### Test Chat Endpoint
```bash
# Start server
pnpm dev

# In another terminal
curl -X POST http://localhost:8080/api/chat-secured/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, what can you do?"}
    ]
  }'
```

### Test Tech Stack Recommendation
```bash
curl -X POST http://localhost:8080/api/phase2/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "coreIdea": "Recipe management app",
    "targetUsers": "Restaurants",
    "mainProblem": "Hard to manage recipes",
    "keyFeatures": ["Search", "Dietary filters", "Nutrition calc"],
    "complexity": "moderate",
    "completenessScore": 85
  }'
```

---

## 🚨 Troubleshooting

### "Missing authentication header"
- Add `Authorization: Bearer <token>` header
- Get token from Supabase auth

### "Organization not found"
- Add `X-Organization-Id: <org-id>` header
- Or ensure user is org member

### "Feature not available in your plan"
- Upgrade subscription tier
- Or disable feature gate for testing

### "Rate limit exceeded"
- Wait for the reset time shown in `Retry-After` header
- Or implement exponential backoff

---

## 📈 Monitoring

### Health Check
```bash
curl http://localhost:8080/health
```

### API Metrics
```bash
curl http://localhost:8080/api/metrics
```

### Logs
```bash
# View server logs
tail -f logs/server.log

# View audit logs
SELECT * FROM audit_logs ORDER BY created_at DESC;
```

---

## 🔄 Common Workflows

### Complete App Generation
1. Talk in Studio → Answer AI questions
2. Select tech stack → Choose A or B
3. Review implementation plan
4. Code is generated
5. (Optional) Generate tests → Jest tests created
6. (Optional) Generate CI/CD → GitHub Actions ready
7. Deploy to Netlify/Vercel

### Backup and Restore
1. Create snapshot: `POST /api/snapshots`
2. Download encrypted backup
3. Later, restore: `POST /api/snapshots/:id/restore`

### Multi-Language Migration
1. Have TypeScript code
2. Call `POST /api/phase7/generate-multilang`
3. Get Python, Go, Rust versions
4. Use for cross-platform support

### Team Onboarding
1. Call `POST /api/phase7/team-collaboration`
2. Get team structure recommendations
3. Review workflows and tools
4. Share guidelines documentation

---

## 📚 Documentation

Full documentation available in:
- `PHASE_1_2_7_COMPLETE_BUILD.md` - Complete implementation guide
- `lib/supabase/multi-tenant-schema.sql` - Database schema
- Individual route files - API documentation

---

## 🎯 Next Steps

1. **Test Phase 1 Security**
   - Create organization
   - Test auth and rate limiting
   - Generate and restore snapshots

2. **Try Phase 2 Tech Stack**
   - Get recommendations for your project
   - Compare A/B options
   - Review implementation plans

3. **Explore Phase 7 Features**
   - Generate tests for your code
   - Create CI/CD pipeline
   - Audit security
   - Generate documentation

4. **Deploy to Production**
   - Use Netlify or Vercel MCP
   - Set up GitHub Actions
   - Configure monitoring
   - Enable security features

---

## 💡 Tips

- **AI Accuracy**: More detailed project description = better recommendations
- **Tech Stack**: Option A easier to learn, Option B better performance
- **Tests**: Generated tests are starting points - add specific test cases
- **Documentation**: Auto-generated docs still need customization
- **Security**: Run audit before deployment to catch issues early

---

## 📞 Support

For issues:
1. Check error message in server logs
2. Verify Supabase is connected
3. Check environment variables
4. Review audit logs for security issues
5. Consult documentation in route files

---

**Version:** Phase 1, 2, and 7 Complete Build
**Status:** ✅ Production Ready
**Last Updated:** 2024

Happy building! 🚀
