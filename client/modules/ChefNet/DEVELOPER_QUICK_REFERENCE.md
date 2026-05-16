# ChefNet Badge System - Developer Quick Reference

## Quick Start: Using ChefNet in Your Code

### Import Components

```jsx
import {
  ChefNetShell,
  ChefNetProfilePanel,
  CultureDashboardPanel,
  RecognitionTimelinePanel,
} from "@/modules/ChefNet/exports";
```

### Import API Functions

```jsx
import {
  createRecognition,
  createPost,
  createVent,
  getUserProfile,
  getCultureDashboard,
  loadSnapshot,
} from "@/modules/ChefNet/api/apiClient";
```

### Import Echo Hooks

```jsx
import {
  sendRecognitionEvent,
  sendBadgeAchievementEvent,
  sendCultureEventToEcho,
  sendAnonymousVentingSignal,
  sendWellbeingCheckIn,
} from "@/modules/ChefNet/ai/echoHooks";
```

## Common Use Cases

### 1. Display User's Badges

```jsx
import { ChefNetProfilePanel } from "@/modules/ChefNet/exports";

export default function MyComponent() {
  return (
    <ChefNetProfilePanel 
      user={{
        id: userId,
        name: userName,
      }}
    />
  );
}
```

### 2. Send a Recognition Programmatically

```jsx
import { createRecognition } from "@/modules/ChefNet/api/apiClient";
import { sendBadgeAchievementEvent } from "@/modules/ChefNet/ai/echoHooks";

async function awardTeammate(recipientName, message) {
  try {
    const recognition = await createRecognition({
      recipientName,
      category: "excellence",
      message,
      from: "Team Lead",
    });

    // Track achievement
    sendBadgeAchievementEvent({
      category: "gratitude",
      points: 3,
      level: "spark",
    });

    console.log("Recognition sent!", recognition.id);
  } catch (error) {
    console.error("Failed to send recognition:", error);
  }
}
```

### 3. Display Culture Metrics

```jsx
import { CultureDashboardPanel } from "@/modules/ChefNet/exports";

export default function Dashboard() {
  return (
    <CultureDashboardPanel 
      organizationId={orgId}
    />
  );
}
```

### 4. Award Points for Custom Action

```jsx
import { awardBadgePoints } from "@/modules/ChefNet/api/supabaseClient";

// Award points when user completes training
async function onTrainingCompleted(userId) {
  try {
    const result = await awardBadgePoints(
      userId,
      "mentor",           // category
      5,                  // points
      "training_completed", // trigger event
      trainingId          // reference ID
    );
    
    console.log(`User now has ${result.newPoints} points!`);
    console.log(`New level: ${result.newLevel}`);
  } catch (error) {
    console.error("Failed to award points:", error);
  }
}
```

### 5. Get User's Current Badges

```jsx
import { getUserProfile } from "@/modules/ChefNet/api/apiClient";

async function displayUserBadges(userId) {
  const profile = await getUserProfile(userId);
  
  console.log("User badges:", profile.badges);
  console.log("Gratitude points:", profile.scores.gratitude);
  console.log("Mentor points:", profile.scores.mentor);
}
```

### 6. Track Custom Events with Echo

```jsx
import { sendCultureEventToEcho } from "@/modules/ChefNet/ai/echoHooks";

// When someone completes a milestone
sendCultureEventToEcho({
  eventType: "milestone_completed",
  milestone: "100_recognitions_given",
  userId: currentUserId,
  timestamp: new Date(),
});
```

### 7. Send Wellbeing Check-in

```jsx
import { sendWellbeingCheckIn } from "@/modules/ChefNet/ai/echoHooks";

async function logWellbeing(userId, moodLevel) {
  sendWellbeingCheckIn({
    userId,
    mood: moodLevel, // 1-5
    energyLevel: energyLevel, // 1-5
    stressLevel: stressLevel, // 1-5
    notes: "Feeling tired but positive",
  });
}
```

## Component Props Reference

### ChefNetProfilePanel

```jsx
<ChefNetProfilePanel 
  user={{
    id: string,           // User ID (required)
    name: string,         // Display name
    scores?: {
      gratitude: number,
      calm_under_fire: number,
      mentor: number,
      hospitality_hero: number,
      wellbeing_ally: number,
    }
  }}
/>
```

### CultureDashboardPanel

```jsx
<CultureDashboardPanel 
  organizationId={string}    // Organization ID (required)
  stats={{                    // Optional initial stats
    totalPosts: number,
    totalRecognitions: number,
    activeMembers: number,
    cultureScore: number,
    topCategory: string,
    recentMilestone: string,
  }}
/>
```

### RecognitionTimelinePanel

```jsx
<RecognitionTimelinePanel 
  timeline={[
    {
      id: string,
      title: string,
      category: string,
      summary: string,
      date: Date,
      from: string,
    }
  ]}
/>
```

## API Functions Reference

### `createRecognition(payload)`

**Params:**
- `recipientName` (string): Who is being recognized
- `category` (string): Category of recognition
- `message` (string): The recognition message
- `from` (string): Sender name
- `recipientEmail` (string, optional): Recipient email

**Returns:**
```javascript
{
  id: string,
  createdAt: ISO8601,
  ...payload
}
```

### `createPost(payload)`

**Params:**
- `title` (string): Post title
- `content` (string): Post content
- `author` (string): Author name

**Returns:**
```javascript
{
  id: string,
  createdAt: ISO8601,
  ...payload
}
```

### `createVent(payload)`

**Params:**
- `text` (string): Venting message
- `mood` (string, optional): Mood indicator
- `anonymousId` (string, optional): Anonymous ID

**Returns:**
```javascript
{
  id: string,
  createdAt: ISO8601,
  ...payload
}
```

### `getUserProfile(userId)`

**Params:**
- `userId` (string): User ID

**Returns:**
```javascript
{
  userId: string,
  badges: Array,
  scores: {
    [category]: points
  }
}
```

### `getCultureDashboard(organizationId)`

**Params:**
- `organizationId` (string): Organization ID

**Returns:**
```javascript
{
  totalPosts: number,
  totalRecognitions: number,
  activeMembers: number,
  cultureScore: number,
  topCategory: string,
  recentMilestone: string
}
```

### `awardBadgePoints(userId, category, points, triggerEvent, referenceId)`

**Params:**
- `userId` (string): User ID
- `category` (string): Badge category
- `points` (number): Points to award
- `triggerEvent` (string): Event that triggered points
- `referenceId` (UUID, optional): Related record ID

**Returns:**
```javascript
{
  newPoints: number,
  newLevel: 'none' | 'spark' | 'glow' | 'beacon'
}
```

## Badge Categories

```javascript
{
  gratitude: "Gratitude & Recognition",
  calm_under_fire: "Calm Under Fire",
  mentor: "Mentor & Teacher",
  hospitality_hero: "Hospitality Hero",
  wellbeing_ally: "Wellbeing Ally",
}
```

## Common Patterns

### Pattern 1: Award Points on Button Click

```jsx
import { useState } from "react";
import { awardBadgePoints } from "@/modules/ChefNet/api/supabaseClient";

export default function AwardButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAward = async () => {
    setLoading(true);
    try {
      const result = await awardBadgePoints(
        userId,
        "gratitude",
        5,
        "custom_award"
      );
      setMessage(`Awarded! Now at ${result.newPoints} points`);
    } catch (error) {
      setMessage("Failed to award points");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleAward} disabled={loading}>
        Award Points
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
```

### Pattern 2: Load and Display User Progress

```jsx
import { useEffect, useState } from "react";
import { getUserProfile } from "@/modules/ChefNet/api/apiClient";

export default function UserBadges({ userId }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserProfile(userId)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>Loading badges...</div>;

  return (
    <div>
      <h2>Badges for {profile.userId}</h2>
      {Object.entries(profile.scores).map(([category, points]) => (
        <div key={category}>
          <span>{category}: {points} points</span>
        </div>
      ))}
    </div>
  );
}
```

### Pattern 3: Batch Award Points

```jsx
import { awardBadgePoints } from "@/modules/ChefNet/api/supabaseClient";

async function awardTeamBadges(userIds, category, points) {
  const results = await Promise.all(
    userIds.map(userId =>
      awardBadgePoints(userId, category, points, "batch_award")
        .catch(err => ({ error: err, userId }))
    )
  );

  const successful = results.filter(r => !r.error).length;
  console.log(`Successfully awarded ${successful}/${userIds.length} users`);
  
  return results;
}
```

## Error Handling

```jsx
import { createRecognition } from "@/modules/ChefNet/api/apiClient";

async function sendRecognitionSafely(data) {
  try {
    const recognition = await createRecognition(data);
    return { success: true, recognition };
  } catch (error) {
    if (error.message.includes("User not authenticated")) {
      return { success: false, reason: "AUTH_REQUIRED" };
    } else if (error.message.includes("Supabase not configured")) {
      return { success: false, reason: "OFFLINE_MODE", recognition: data };
    } else {
      return { success: false, reason: "UNKNOWN", error };
    }
  }
}
```

## Debug Mode

Enable detailed logging:

```javascript
// In your app
if (process.env.DEBUG_CHEFNET === "true") {
  window.DEBUG_CHEFNET = true;
}

// All ChefNet functions will log their operations
```

Check logs in browser console:
```
[ChefNet] Supabase initialized
[ChefNet Echo] recognition { category: "gratitude", ... }
[ChefNet] Badge level updated: spark → glow
```

## Common Issues & Solutions

### "User not authenticated"
- Ensure user is logged in before creating recognitions
- Check Supabase authentication configuration
- Verify auth.users table exists

### "Supabase not configured"
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
- Restart dev server
- System will use memory fallback but won't persist data

### Data not persisting
- Verify migration was applied: `migrations/007_chefnet_badge_system.sql`
- Check Supabase project logs
- Confirm RLS policies are in place
- Test query directly in Supabase SQL Editor

### Echo events not received
- Verify `window.echo` is initialized
- Check Echo configuration
- Confirm event tracking is enabled
- Review Echo dashboard for data flow

---

**Last Updated**: 2024
**For detailed setup**: See `SUPABASE_SETUP_GUIDE.md`
**For implementation details**: See `BACKEND_IMPLEMENTATION_SUMMARY.md`
