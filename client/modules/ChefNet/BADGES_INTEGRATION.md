# ChefNet Badge System Integration Guide

## Overview

ChefNet now includes a comprehensive badge and recognition system that encourages positive culture contributions. The system includes:

- **5 Badge Categories** with progressive levels (Spark → Glow → Beacon)
- **Point-based progression** tracking user contributions
- **Profile Panel** showing individual achievements
- **Recognition Timeline** displaying recent recognitions
- **Culture Dashboard** showing team-wide metrics
- **Notification Badge** on sidebar icon for unread messages

## Files Created

```
shared/chefnet_badges.json                           # Badge taxonomy and progression rules
client/modules/ChefNet/panels/ChefNetProfilePanel.jsx      # User profile with badges
client/modules/ChefNet/panels/RecognitionTimelinePanel.jsx # Recent recognitions
client/modules/ChefNet/panels/CultureDashboardPanel.jsx    # Team culture metrics
client/modules/ChefNet/utils/ChefNetBadge.jsx              # Notification badge component
client/modules/ChefNet/exports.js                          # All exports for easy importing
```

## Badge Categories

### 1. Gratitude & Recognition
- **Spark of Gratitude** (3+ points)
- **Glow of Appreciation** (15+ points)
- **Beacon of Recognition** (60+ points)

Earned by:
- Sending recognitions to teammates
- Getting reactions on recognitions
- Being named in weekly top recognition

### 2. Calm Under Fire
- **Steady Hands** (5+ points)
- **Kitchen Anchor** (20+ points)
- **Guardian of the Pass** (50+ points)

Earned by:
- Recovering stressed services
- Working double shifts
- Successful guest recoveries

### 3. Mentor & Teacher
- **Line Guide** (4+ points)
- **Station Coach** (16+ points)
- **Kitchen Sensei** (40+ points)

Earned by:
- Recording training sessions
- Conducting recipe teach-backs
- Getting certifications for skills taught

### 4. Hospitality Hero
- **Spark of Service** (3+ points)
- **Flame of Hospitality** (12+ points)
- **Constellation of Care** (36+ points)

Earned by:
- Positive guest comments
- WOW moments logged
- Last-minute shift coverage

### 5. Wellbeing Ally
- **Aware Ally** (2+ points)
- **Wellbeing Advocate** (8+ points)
- **Guardian of Balance** (20+ points)

Earned by:
- Logging wellbeing check-ins
- Protecting PTO
- Providing peer support

## Using the Notification Badge

### In Sidebar

```jsx
import { ChefNetIconWithBadge, useChefNetUnreadCount } from "@/modules/ChefNet/exports";

// In sidebar navigation item:
<div className="flex items-center gap-2">
  <ChefNetIconWithBadge unreadCount={unreadCount} />
  <span>ChefNet</span>
</div>
```

### Get Unread Count from State

```jsx
import { useChefNetUnreadCount, useChefNetState } from "@/modules/ChefNet/exports";

function MyComponent() {
  const state = useChefNetState();
  const unreadCount = useChefNetUnreadCount(state);
  
  return <span>Unread: {unreadCount}</span>;
}
```

## Integrating with Echo

### Step 1: Trigger Badge Evaluation

When a recognition is created or other events happen, send signals to Echo:

```jsx
import { sendRecognitionEvent } from "@/modules/ChefNet/ai/echoHooks";

// After creating a recognition
sendRecognitionEvent({
  userId: user.id,
  category: category,
  points: 3,
  timestamp: new Date(),
});
```

### Step 2: Track Points in Backend

Store badge points in your database:

```sql
-- Example Supabase table
CREATE TABLE chefnet_user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL, -- "gratitude", "calm_under_fire", etc.
  points INT DEFAULT 0,
  level TEXT DEFAULT 'none', -- "spark", "glow", "beacon"
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Track recognition history
CREATE TABLE chefnet_recognitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Step 3: Update Profile Data

When user profile is loaded:

```jsx
import { ChefNetProfilePanel } from "@/modules/ChefNet/exports";

<ChefNetProfilePanel 
  user={{
    id: userId,
    name: userName,
    scores: {
      gratitude: 25,
      calm_under_fire: 12,
      mentor: 8,
      hospitality_hero: 31,
      wellbeing_ally: 5
    }
  }}
/>
```

### Step 4: Wire Timeline Data

Pass recognition history to timeline:

```jsx
import { RecognitionTimelinePanel } from "@/modules/ChefNet/exports";

<RecognitionTimelinePanel 
  timeline={[
    {
      title: "Recognized for Teamwork",
      category: "Gratitude",
      summary: "Great help during the rush",
      date: new Date("2024-01-15")
    },
    // ... more recognitions
  ]}
/>
```

### Step 5: Culture Dashboard Metrics

Feed team-wide metrics from your database:

```jsx
import { CultureDashboardPanel } from "@/modules/ChefNet/exports";

<CultureDashboardPanel 
  stats={{
    totalPosts: 45,
    totalRecognitions: 28,
    activeMembers: 12,
    cultureScore: 75,
    topCategory: "Gratitude",
    recentMilestone: "Team reached 25 recognitions this month! 🎉"
  }}
/>
```

## Connecting Badge Point Triggers

Edit `shared/chefnet_badges.json` to define your trigger events:

```json
{
  "triggers": [
    {
      "id": "peer_shoutout",
      "event": "shoutout.created",
      "points": 3
    },
    {
      "id": "recognition_received",
      "event": "recognition.received",
      "points": 2
    }
  ]
}
```

Then in your backend, evaluate triggers:

```typescript
// Example: When recognition is created
async function onRecognitionCreated(recognition) {
  // Award points to sender
  await updateBadgePoints(
    recognition.senderId,
    "gratitude",
    3 // points from trigger
  );
  
  // Send to Echo for trend analysis
  sendRecognitionEvent(recognition);
}
```

## Displaying Badges Elsewhere

Import and use badge components in other parts of the app:

```jsx
// In user profiles
import { ChefNetProfilePanel } from "@/modules/ChefNet/exports";
<ChefNetProfilePanel user={userData} />

// In staff directory
import { ChefNetIconWithBadge } from "@/modules/ChefNet/exports";
<ChefNetIconWithBadge unreadCount={unreadCount} />

// In dashboards
import { CultureDashboardPanel } from "@/modules/ChefNet/exports";
<CultureDashboardPanel stats={teamStats} />
```

## Future Enhancements

- [ ] Badge leaderboards (weekly, monthly)
- [ ] Peer-to-peer point gifting
- [ ] Badge collections and rarity tiers
- [ ] Echo-powered burnout risk alerts based on badge patterns
- [ ] SMS notifications for milestones
- [ ] Cross-property federation of badges
- [ ] Portable reputation (exportable badges)

## Testing

To test the badge system:

1. Create recognitions in the Recognition Panel
2. View your profile to see badge progress
3. Check timeline for recent recognitions
4. Look at culture dashboard for team metrics
5. Verify notification badge shows unread count

All components are fully styled and responsive!
