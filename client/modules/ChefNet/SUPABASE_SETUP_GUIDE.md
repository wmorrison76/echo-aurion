# ChefNet Supabase Setup & Integration Guide

## Overview

The ChefNet badge system is now fully integrated with Supabase for data persistence, badge point tracking, and culture analytics. This guide walks you through setting up the database and testing the system.

## Prerequisites

- ✅ Supabase project already connected via MCP (confirmed in your setup)
- ✅ ChefNet components created and deployed
- ✅ Echo hooks configured for analytics

## Step 1: Apply the Migration

The migration file `migrations/007_chefnet_badge_system.sql` contains all necessary tables and configurations.

### Option A: Using Supabase Dashboard

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Copy the entire content of `migrations/007_chefnet_badge_system.sql`
5. Paste into the editor
6. Click **Run**

### Option B: Using Supabase CLI

```bash
supabase db push
```

This will automatically apply all migrations in the `migrations/` folder.

## Step 2: Verify Tables Were Created

After running the migration, verify the tables exist:

```sql
-- Check all ChefNet tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'chefnet_%'
ORDER BY table_name;
```

You should see:
- `chefnet_recognitions`
- `chefnet_user_badges`
- `chefnet_user_points_history`
- `chefnet_posts`
- `chefnet_venting_messages`
- `chefnet_wellbeing_signals`
- `chefnet_jobs`
- `chefnet_peer_mentorships`
- `chefnet_resources`
- `chefnet_culture_metrics`

## Step 3: Configure Environment Variables

Add Supabase credentials to your `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from your Supabase project:
1. Go to **Settings → API**
2. Copy **Project URL** → `VITE_SUPABASE_URL`
3. Copy **Anon public** key → `VITE_SUPABASE_ANON_KEY`

## Step 4: Test the Integration

### Test 4.1: Send a Recognition

1. Open ChefNet in your application
2. Navigate to the **Recognition Panel**
3. Fill out:
   - **Recipient Name**: "John Doe"
   - **Category**: "Great teamwork"
   - **Message**: "Amazing job on the service last night!"
4. Click **Send Cheers**
5. You should see:
   - ✨ Fireworks animation
   - Recognition appears in the list
   - No errors in browser console

### Test 4.2: Verify Data in Supabase

After sending a recognition:

```sql
-- Check if recognition was saved
SELECT * FROM chefnet_recognitions 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if badge points were awarded
SELECT * FROM chefnet_user_badges 
WHERE user_id = 'your-user-id';

-- Check points history
SELECT * FROM chefnet_user_points_history 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC;
```

### Test 4.3: Check Your Profile

1. Navigate to **Your Profile** in ChefNet
2. You should see:
   - Your badges loading
   - "Gratitude & Recognition" showing 3 points
   - Progress bar updating
   - "Spark of Gratitude" level achieved

### Test 4.4: View Culture Dashboard

1. Navigate to **Culture Dashboard**
2. You should see:
   - Total recognitions: 1 (from your test)
   - Total posts: 0 (or more if you've posted)
   - Active members: 1
   - Culture score updating

### Test 4.5: Send a Post

1. Go to **Feed Panel**
2. Post something positive
3. Check database:

```sql
SELECT * FROM chefnet_posts 
ORDER BY created_at DESC 
LIMIT 5;
```

### Test 4.6: Test Anonymous Venting

1. Go to **Venting Panel**
2. Post an anonymous message
3. Check database:

```sql
SELECT * FROM chefnet_venting_messages 
ORDER BY created_at DESC 
LIMIT 5;
```

## Step 5: Monitor Badge Point Awards

The system automatically awards points for:

| Trigger | Category | Points | Event |
|---------|----------|--------|-------|
| Send recognition | Gratitude | 3 | `recognition.sent` |
| Receive recognition | Gratitude | 2 | `recognition.received` |
| Create post | Culture Builder | 2 | `post.created` |
| Share vent | Wellbeing | 1 | `vent.shared` |

## Step 6: Echo Integration Testing

Verify Echo is receiving events:

```javascript
// In browser console
window.echo.events  // Should show culture events being tracked
```

Check your Echo dashboard for:
- Culture events timeline
- Wellbeing trends
- Team engagement metrics

## Troubleshooting

### "Supabase not configured" warnings

**Cause**: Environment variables not set or Supabase project not connected

**Fix**:
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
2. Restart dev server: `npm run dev`
3. Check browser console for initialization messages

### Recognitions not saving

**Cause**: User not authenticated

**Fix**:
1. Ensure you're logged in
2. Check Supabase Authentication settings
3. Verify RLS policies are applied (they should be from migration)

### Profile shows 0 points but recognition was sent

**Cause**: Badge query timing issue

**Fix**:
1. Refresh the page
2. Navigate away and back to Profile
3. Check database directly to verify points exist

### Culture dashboard stuck on "Loading..."

**Cause**: `organizationId` prop not passed

**Fix**:
```jsx
<CultureDashboardPanel organizationId={yourOrgId} />
```

## Advanced: Customizing Badge Triggers

To add new badge triggers, edit `client/modules/ChefNet/api/supabaseClient.js`:

```javascript
export const BADGE_TRIGGERS = {
  "custom.event": {
    category: "category_name",
    points: 5,
    event: "custom_event_key",
  },
};
```

Then in your code:
```javascript
import { awardBadgePoints } from "@/modules/ChefNet/api/supabaseClient";

// Award points for custom event
await awardBadgePoints(userId, "category_name", 5, "custom_event_key");
```

## Advanced: Batch Import Existing Data

If migrating from another system:

```sql
-- Import recognitions
INSERT INTO chefnet_recognitions (
  sender_id, sender_email, sender_name, 
  recipient_name, category, message, created_at
) VALUES 
  ('user-uuid', 'user@email.com', 'John', 'Jane', 'gratitude', 'Great work!', NOW());

-- Recalculate badges for users
WITH user_points AS (
  SELECT sender_id, category, COUNT(*) * 3 as total_points
  FROM chefnet_recognitions
  GROUP BY sender_id, category
)
INSERT INTO chefnet_user_badges (user_id, category, points, current_level)
SELECT sender_id, category, total_points, 
  CASE 
    WHEN total_points >= 60 THEN 'beacon'
    WHEN total_points >= 15 THEN 'glow'
    WHEN total_points >= 3 THEN 'spark'
    ELSE 'none'
  END
FROM user_points
ON CONFLICT (user_id, category) DO UPDATE SET 
  points = EXCLUDED.points,
  current_level = EXCLUDED.current_level;
```

## Performance Monitoring

Monitor Supabase usage:

1. Go to **Supabase Dashboard → Analytics**
2. Check:
   - Database queries
   - Real-time connections
   - API requests
   - Storage usage

For large teams, consider:
- Adding more database indexes
- Caching culture metrics
- Archiving old recognitions

## Next Steps

✅ **What you've accomplished:**
- Created all necessary database tables
- Integrated Supabase persistence
- Connected Echo analytics hooks
- Implemented badge point system
- Set up RLS policies for security

🔄 **What's ready to build next:**
- Leaderboards (top contributors by badge)
- Badge achievement notifications
- Peer-to-peer point gifting
- Export recognitions to PDF
- Weekly culture report emails
- Mobile app integration

## Security Notes

The migration includes:
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ RLS policies configured for read/write access
- ✅ User authentication checks on inserts
- ✅ Automatic timestamp management with triggers

**Important**: Never expose `VITE_SUPABASE_ANON_KEY` in production. For sensitive operations, use a service role key in a secure backend function.

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase project logs
3. Verify RLS policies in Supabase dashboard
4. Test queries directly in SQL Editor
5. Review the integration code in `client/modules/ChefNet/api/supabaseClient.js`

---

**Last Updated**: 2024
**Version**: 1.0
**Status**: Ready for Production Testing
