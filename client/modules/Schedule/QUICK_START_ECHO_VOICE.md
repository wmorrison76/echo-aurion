# Quick Start Guide: Echo Voice & Predictive Operations

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies (1 minute)
```bash
npm install
```

### 2. Set Environment Variables (1 minute)
Create/update `.env` file:
```bash
OPENAI_API_KEY=sk-proj-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Start Dev Server (1 minute)
```bash
npm run dev
```

### 4. Add Components to Your Page (2 minutes)

#### Option A: Use Builder.io Designer
1. Open your Builder.io editor
2. Search for "Echo Voice" or "Predictive Operations"
3. Drag onto your page
4. Save and publish

#### Option B: Add Directly in Code
```tsx
import EchoVoice from "@/components/echo/EchoVoice";
import PredictiveOpsDashboard from "@/components/analytics/PredictiveOpsDashboard";

export function MyPage() {
  const org_id = "your-org-uuid"; // Replace with actual org ID
  
  return (
    <div className="space-y-4">
      <EchoVoice lang="en" />
      <PredictiveOpsDashboard org_id={org_id} />
    </div>
  );
}
```

### 5. Test It Out! (0 minutes)
- Click "Start Talking" on Echo Voice component
- Say: "How many employees are scheduled today?"
- Listen for the AI response
- Check Predictive Operations dashboard for operational insights

## 📚 What You Get

### Echo Voice
🎤 **Real-time speech recognition** → AI processing → 🗣️ **Voice response**
- Supports 6 languages
- Works in Chrome, Safari, Edge
- Mobile-friendly

### Predictive Operations  
📊 **Historical data analysis** → 🤖 **AI anomaly detection** → 💡 **Actionable insights**
- Detects labor cost spikes
- Identifies revenue trends
- Provides recommendations

## 🔌 API Endpoints

### Echo Voice
```bash
curl -X POST http://localhost:8080/api/echo-multilingual \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is today'\''s labor cost?",
    "lang": "en",
    "context": {"org_id": "your-org-id"}
  }'
```

### Predictive Operations
```bash
curl http://localhost:8080/api/predictive-ops?org_id=your-org-id \
  -H "Authorization: Bearer your-token"
```

## 🎯 Common Tasks

### Change Language
```tsx
<EchoVoice lang="es" /> {/* Spanish */}
<EchoVoice lang="fr" /> {/* French */}
<EchoVoice lang="it" /> {/* Italian */}
<EchoVoice lang="de" /> {/* German */}
<EchoVoice lang="pt" /> {/* Portuguese */}
```

### Get Only Critical Alerts
```typescript
const response = await fetch(
  '/api/predictive-ops/critical-check?org_id=your-org-id'
);
const { hasCritical } = await response.json();
```

### Customize Dashboard Refresh
```tsx
<PredictiveOpsDashboard 
  org_id={org_id}
  autoRefresh={true}
  refreshInterval={120000} {/* 2 minutes */}
/>
```

## 📖 Full Documentation

- **[Setup Instructions](./SETUP_INSTRUCTIONS.md)** - Detailed setup guide
- **[Integration Guide](./ECHO_VOICE_INTEGRATION_GUIDE.md)** - Developer guide with examples
- **[Summary](./ECHO_VOICE_PREDICTIVE_OPS_SUMMARY.md)** - Technical documentation
- **[Verification](./IMPLEMENTATION_VERIFICATION.md)** - Implementation checklist

## ⚠️ Common Issues

### "Cannot find module 'openai'"
→ Run `npm install`

### Echo Voice not working
→ Check OPENAI_API_KEY is set
→ Use Chrome, Safari, or Edge (not Firefox)

### No predictions shown
→ Ensure property_summary table has data
→ Verify org_id is correct

## 🎓 Learning Path

1. **Beginner**: Add Echo Voice to a dashboard
2. **Intermediate**: Customize language and styling
3. **Advanced**: Integrate with your own data sources

## 🆘 Need Help?

1. Check [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) for troubleshooting
2. Review [INTEGRATION_GUIDE](./ECHO_VOICE_INTEGRATION_GUIDE.md) for examples
3. Check browser console for errors

## ✅ Verify Installation

Run this to check everything is working:
```typescript
// In browser console:
console.log("Echo Voice registered:", !!window.LUCCCA?.registerWidget);
console.log("Fetch available:", typeof fetch !== 'undefined');
console.log("Speech API available:", 'webkitSpeechRecognition' in window);
```

---

**You're all set!** 🎉 Start building with Echo Voice & Predictive Operations.
