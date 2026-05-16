# Echo Voice & Predictive Operations Integration Guide

## Quick Start

This guide covers integrating the new Echo Voice and Predictive Operations Intelligence features into your Builder.io application.

## 1. Echo Voice Component

### Overview
The EchoVoice component provides real-time speech recognition and text-to-speech synthesis in 6 languages.

### Features
- 🎤 Live speech recognition
- 🗣️ Automatic text-to-speech response
- 🌐 Multi-language support (EN, FR, IT, DE, PT, ES)
- 🎯 Context-aware responses via OpenAI
- 📱 Mobile-friendly interface
- ⚡ Real-time streaming

### Installation & Usage

#### 1. Component Registration
The component is automatically registered as a Builder.io widget:
```typescript
// In client/lib/builderRegistry.ts
luccca.registerWidget("EchoVoice", EchoVoice);
```

#### 2. Using in Builder.io Designer
1. Open your Builder.io page editor
2. Search for "Echo Voice" widget in components
3. Drag and drop onto your page
4. Configure the language prop (optional)

#### 3. Programmatic Usage in Code
```tsx
import EchoVoice from "@/components/echo/EchoVoice";

function MyManager() {
  return (
    <div className="p-4">
      <EchoVoice 
        lang="en"
        onTranscript={(text) => {
          console.log("User said:", text);
        }}
        onReply={(text) => {
          console.log("Echo replied:", text);
        }}
      />
    </div>
  );
}
```

### API Endpoint: POST /api/echo-multilingual

**Request Body:**
```json
{
  "prompt": "How many employees are working today?",
  "lang": "en",
  "context": {
    "org_id": "org-uuid",
    "dept_id": "dept-uuid",
    "user_id": "user-uuid"
  }
}
```

**Response:**
```json
{
  "success": true,
  "reply": "Based on today's schedule, you have 12 employees working across all departments.",
  "lang": "en",
  "prompt_received": "How many employees are working today?",
  "model": "gpt-4o-mini",
  "usage": {
    "input_tokens": 45,
    "output_tokens": 28
  }
}
```

### Language Mapping
```typescript
const languages = {
  "en": "English",
  "fr": "French",
  "it": "Italian",
  "de": "German",
  "pt": "Portuguese",
  "es": "Spanish"
};
```

### Browser Support
| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ | Full support |
| Safari | ✅ | Full support |
| Edge | ✅ | Full support |
| Firefox | ⚠️ | Limited support |
| Mobile Safari | ✅ | Full support |
| Mobile Chrome | ✅ | Full support |

### Sample Use Cases

#### 1. Manager Command Interface
```tsx
<EchoVoice lang="en" />
// Manager can say: "Give me labor cost summary for today"
```

#### 2. Multilingual Support
```tsx
<EchoVoice lang="es" />
// Spanish-speaking manager gets Spanish responses
```

#### 3. With Custom Styling
```tsx
<div className="fixed bottom-4 right-4">
  <EchoVoice lang="en" />
</div>
```

## 2. Predictive Operations Dashboard

### Overview
The PredictiveOpsDashboard displays AI-driven operational insights and anomalies.

### Features
- 📈 Automated anomaly detection
- 🚨 Severity-based alerts (critical, high, medium, low)
- 💡 AI-generated recommendations
- 🔄 Auto-refresh capability
- 📊 Historical trend analysis
- ⚡ Real-time updates

### Installation & Usage

#### 1. Component Registration
```typescript
// In client/lib/builderRegistry.ts
luccca.registerWidget("PredictiveOpsDashboard", PredictiveOpsDashboard);
```

#### 2. Using in Builder.io Designer
1. Open your Builder.io page editor
2. Search for "Predictive Operations" widget
3. Drag onto your dashboard
4. Set the `org_id` prop
5. Configure refresh interval if needed

#### 3. Programmatic Usage
```tsx
import PredictiveOpsDashboard from "@/components/analytics/PredictiveOpsDashboard";

function OperationsDashboard({ orgId }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <PredictiveOpsDashboard 
        org_id={orgId}
        autoRefresh={true}
        refreshInterval={60000}
      />
    </div>
  );
}
```

### API Endpoint: GET /api/predictive-ops

**Request:**
```
GET /api/predictive-ops?org_id=<uuid>
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "insights": [
    {
      "alert": "Labor costs exceed threshold",
      "severity": "high",
      "recommendation": "Review scheduling and staffing levels",
      "metric": "labor_pct",
      "value": 38.5,
      "threshold": 35
    },
    {
      "alert": "Revenue trending downward",
      "severity": "medium",
      "recommendation": "Analyze promotional opportunities and staffing efficiency",
      "metric": "revenue",
      "value": 4250,
      "threshold": 5000
    }
  ]
}
```

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `org_id` | string | Required | Organization UUID |
| `autoRefresh` | boolean | true | Enable auto-refresh |
| `refreshInterval` | number | 60000 | Refresh interval in milliseconds |

### Severity Levels

| Severity | Color | Icon | Meaning |
|----------|-------|------|---------|
| critical | Red | 🔴 | Immediate action required |
| high | Orange | 🟠 | Important, needs attention soon |
| medium | Yellow | 🟡 | Monitor, may require action |
| low | Blue | 🔵 | Informational |

### Additional Endpoints

#### Get Recent Anomalies Only
```
GET /api/predictive-ops/recent?org_id=<uuid>&limit=5
```

#### Check for Critical Alerts
```
GET /api/predictive-ops/critical-check?org_id=<uuid>

Response:
{
  "success": true,
  "hasCritical": true,
  "alert": true
}
```

### Sample Dashboard Layout
```tsx
function ManagerDashboard() {
  const { org_id } = useParams();
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KPIHeader org_id={org_id} />
        <PredictiveOpsDashboard org_id={org_id} />
        <RevenueChart org_id={org_id} />
      </div>
      <EmployeePerformanceDashboard org_id={org_id} />
    </div>
  );
}
```

## 3. Data Flow Architecture

### Echo Voice Flow
```
User Speech
    ↓
Web Speech API Recognition
    ↓
/api/echo-multilingual (POST)
    ↓
OpenAI GPT-4o-mini
    ↓
Multilingual Response
    ↓
Speech Synthesis API
    ↓
Audio Output
```

### Predictive Operations Flow
```
property_summary Table (PostgreSQL)
    ↓
/api/predictive-ops (GET)
    ↓
analyzeOperations() Service
    ↓
OpenAI Analysis
    ↓
Anomaly Detection & Ranking
    ↓
PredictiveOpsDashboard Component
    ↓
UI Rendering with Severity Colors
```

## 4. Database Schema

### property_summary Table
```sql
CREATE TABLE property_summary (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  labor_cost NUMERIC(12,2),
  revenue NUMERIC(12,2),
  tips NUMERIC(12,2),
  report_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, outlet_id, report_date)
);

CREATE INDEX idx_property_summary_org ON property_summary(org_id);
CREATE INDEX idx_property_summary_date ON property_summary(report_date);
```

### Sample Data
```sql
INSERT INTO property_summary (org_id, outlet_id, labor_cost, revenue, tips, report_date)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  '223e4567-e89b-12d3-a456-426614174000'::uuid,
  1500.00,  -- labor cost
  4500.00,  -- revenue
  450.00,   -- tips
  CURRENT_DATE
);
```

## 5. Environment Configuration

### Required Environment Variables
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-xxxxxxxxxx

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Node Environment
NODE_ENV=production  # or 'development'
```

### Optional Configuration
```bash
# OpenAI Model Selection (can be configured in code)
OPENAI_MODEL=gpt-4o-mini  # Default

# API Configuration
API_PORT=3000
API_HOST=localhost
```

## 6. Authentication & Authorization

### Protected Endpoints
All Predictive Operations endpoints require authentication:
- Uses `authenticateUser` middleware
- Validates JWT tokens from Authorization header
- Falls back to dev user in development mode

### Echo Voice
- `/api/echo-multilingual` requires authentication
- Optional context with org_id for better responses
- Language detection can work without auth

### Example with Auth
```typescript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

const response = await fetch('/api/predictive-ops?org_id=your-org', {
  headers
});
```

## 7. Performance & Optimization

### Caching Strategy
- Predictive analysis results cached for 1 minute per organization
- Echo responses not cached (real-time)
- Browser speech synthesis cached in memory

### Rate Limiting
- Predictive Ops: 100 requests/minute per org
- Echo Voice: 300 requests/minute per user
- Consider OpenAI cost implications

### Database Optimization
- 90-day rolling window for analysis
- Indexed queries on org_id and report_date
- Batch operations for data import

## 8. Troubleshooting

### Echo Voice Issues

**No sound from microphone:**
1. Check browser permissions
2. Verify microphone is working
3. Test with Chrome://settings/content/microphone

**No speech synthesis:**
1. Check browser supports speechSynthesis API
2. Verify system audio is enabled
3. Try different voice (defaults to system default)

**Wrong language responses:**
1. Verify lang prop is correctly set
2. Check OPENAI_API_KEY is set
3. Inspect browser console for errors

### Predictive Ops Issues

**No insights returned:**
1. Verify property_summary has data for org_id
2. Check org_id UUID format
3. Verify authentication token is valid
4. Check OPENAI_API_KEY is configured

**Slow dashboard:**
1. Increase refreshInterval
2. Check network tab for slow API responses
3. Verify database indexes are created
4. Monitor OpenAI API latency

## 9. Advanced Usage

### Custom System Prompt for Echo
Modify the system prompt in `/server/api/routes/echoMultilingual.ts`:
```typescript
const systemPrompt = `
You are a specialized hospitality AI focused on [your custom domain].
...
`;
```

### Custom Anomaly Rules
Extend `/server/services/predictiveOps.ts` with custom logic:
```typescript
export async function analyzeOperationsCustom(org_id: string) {
  // Your custom anomaly detection logic
}
```

### Dashboard Customization
Modify `/client/components/analytics/PredictiveOpsDashboard.tsx`:
```tsx
// Add custom fields, colors, or aggregations
```

## 10. Monitoring & Analytics

### Track Usage
```typescript
// Log Echo Voice queries
const logEchoUsage = (lang, queryLength, responseTime) => {
  // Send to analytics
};

// Log Predictive Ops access
const logPredictiveAccess = (org_id, insightCount) => {
  // Send to analytics
};
```

### Monitor Costs
- Echo Voice: ~$0.002 per API call (GPT-4o-mini)
- Predictive Ops: ~$0.005 per analysis (GPT-4o-mini)
- Speech Recognition/Synthesis: No cost (browser API)

### Health Checks
```typescript
// Monitor endpoint availability
GET /api/health
GET /api/predictive-ops/critical-check?org_id=test-org
```

---

**For Support**: Check the [ECHO_VOICE_PREDICTIVE_OPS_SUMMARY.md](./ECHO_VOICE_PREDICTIVE_OPS_SUMMARY.md) for detailed technical documentation.
