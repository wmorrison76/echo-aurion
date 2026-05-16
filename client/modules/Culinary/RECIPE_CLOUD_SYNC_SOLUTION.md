# Recipe Cloud Sync Solution

## The Problem: Recipe Storage Discrepancy

**Your Observation:**
- Home login: 4 recipes
- Work login: 40+ recipes
- Question: Are recipes stored locally or in Supabase/Pinecone?

**Root Cause:**
Recipes were being stored in **browser localStorage**, which is:
- **Isolated per device**: Home computer has separate localStorage from work computer
- **Not synced**: No synchronization between devices
- **Client-side only**: Only accessible on that specific machine

This is why you had different recipe counts at home vs. work—they were literally different datasets!

---

## The Solution: Cloud-Based Recipe Synchronization

We've implemented a comprehensive cloud recipe sync system that moves your recipes from local browser storage to Supabase cloud storage, enabling them to sync across all your devices.

### Components Implemented

#### 1. **Supabase Migration** (`supabase/migrations/008_user_recipes.sql`)
- Created `user_recipes` table with user_id scoping
- Recipes are now associated with your user account
- Row-Level Security (RLS) ensures data privacy
- Automatic timestamps for tracking changes

**Key Features:**
- User-specific recipe storage (only you can see your recipes)
- Soft delete support (recipes can be recovered)
- Global recipe sharing (optional)
- Organization context for multi-tenant scenarios

#### 2. **Cloud Recipe Sync Service** (`client/lib/cloud-recipe-sync.ts`)
- Automatically loads recipes from Supabase on login
- Syncs local changes to cloud in real-time
- Handles offline scenarios gracefully
- Merges recipes intelligently (cloud version wins if newer)
- Periodic background sync (every 5 minutes)

**How It Works:**
```typescript
// On login
const recipes = await cloudRecipeSync.initialize(userId);

// When recipes change
cloudRecipeSync.saveRecipeBatchToCloud(userId, recipes);

// Periodic sync
const stopSync = cloudRecipeSync.startPeriodicSync(userId);
```

#### 3. **Recipe Migration Tool** (`client/lib/recipe-migration-tool.ts`)
- Migrates your existing local recipes to Supabase
- Creates automatic backups before migration
- Tracks migration progress
- Handles failures gracefully (retries individually)

#### 4. **Migration UI Dialog** (`client/components/RecipeMigrationDialog.tsx`)
- Beautiful, user-friendly migration interface
- Shows progress with visual indicators
- Option to backup before migrating
- Error reporting for failed migrations

#### 5. **Updated AppDataContext** (`client/context/AppDataContext.tsx`)
- Integrated cloud sync into recipe initialization
- Recipes now sync with Supabase automatically
- Fallback to local storage if Supabase unavailable
- Periodic sync in background

---

## How It Works Now

### Before (Problem)
```
Home Computer          Work Computer
  localStorage           localStorage
      ↓                       ↓
   4 recipes             40+ recipes
   (isolated)            (isolated)
   No sync               No sync
```

### After (Solution)
```
Home Computer          Work Computer
     ↓                      ↓
Cloud Recipe Sync Service (client-side)
     ↓                      ↓
  Supabase Cloud Database
     ↓
All recipes accessible from anywhere!
```

### Sync Flow
1. **Login**: Cloud sync loads your recipes from Supabase
2. **Add/Edit Recipe**: Automatically synced to Supabase + localStorage
3. **Periodic Sync**: Every 5 minutes, checks for updates
4. **New Device**: Automatically loads all recipes from cloud

---

## Setup Instructions

### Step 1: Apply Supabase Migration
Run the migration to create the `user_recipes` table:

```bash
# Using Supabase CLI
supabase migration up

# Or manually in Supabase dashboard:
# Copy and run the SQL from: supabase/migrations/008_user_recipes.sql
```

### Step 2: Ensure Supabase Is Connected
Make sure your environment variables are set:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 3: Migration Dialog (Already Built-In)
The app will show a migration dialog automatically when:
- You have local recipes
- You're logged in
- Those recipes haven't been synced yet

Users can choose to:
- **Backup & Migrate**: Download backup, then sync to cloud
- **Migrate Now**: Directly sync to cloud
- **Skip**: Continue with local storage (not recommended)

### Step 4: Verify Sync
After migration:
- ✅ Log in from different device → see all recipes
- ✅ Add new recipe → syncs to all devices
- ✅ Edit recipe → changes sync automatically
- ✅ Delete recipe → reflected everywhere

---

## Integration Checklist

- [ ] Apply migration `008_user_recipes.sql` to Supabase
- [ ] Verify Supabase environment variables are set
- [ ] Test migration dialog with existing recipes
- [ ] Verify recipes sync across devices
- [ ] Confirm periodic sync working (background)
- [ ] Test offline scenarios
- [ ] Verify backup functionality in migration dialog

---

## Data Storage Architecture

### Local Storage (Fallback)
- Used when Supabase unavailable
- Immediate updates for UI responsiveness
- Synced to cloud when online

### Supabase (Primary)
- Authoritative source of truth
- User-scoped with RLS
- Accessible from any device
- Backed up automatically

### Pinecone (Vector Database)
- Used by Echo for flavor analysis
- Separate from user recipes
- Stores crawled recipes for learning

---

## Features

✅ **Cross-Device Sync**
- Log in at home, see all recipes
- Log in at work, see all recipes
- Changes sync automatically

✅ **Offline Support**
- Works offline using local storage
- Syncs when reconnected
- No data loss

✅ **Privacy**
- User-scoped with RLS
- Only you see your recipes
- Optional sharing for teams

✅ **Auto-Backup**
- Migration tool creates backup
- Can download JSON for safety
- Soft deletes (can restore)

✅ **Background Sync**
- Periodic sync every 5 minutes
- Transparent to user
- Intelligent merging

---

## Troubleshooting

### Recipes Not Syncing
1. Check Supabase connection in browser DevTools
2. Verify environment variables
3. Check browser console for errors
4. Try manual migration via dialog

### Migration Failed
1. Check Supabase quota (200MB free)
2. Verify user is logged in
3. Download backup (safety first)
4. Check error messages in dialog
5. Retry (handles individual recipe failures)

### Recipes Showing Differently
1. This should no longer happen!
2. If it does, click "Backup & Migrate" to sync
3. Wait for background sync (5 min max)
4. Refresh page to force reload

---

## Code Examples

### Using Cloud Sync in Components
```typescript
import { cloudRecipeSync } from "@/lib/cloud-recipe-sync";
import { useAuth } from "@/context/AuthContext";

export function MyRecipeComponent() {
  const { user } = useAuth();

  // Save recipe to cloud
  const saveRecipe = async (recipe: Recipe) => {
    const success = await cloudRecipeSync.saveRecipeToCloud(user?.id, recipe);
    if (success) {
      console.log("Recipe saved to cloud!");
    }
  };

  // Delete recipe from cloud
  const deleteRecipe = async (recipeId: string) => {
    const success = await cloudRecipeSync.deleteRecipeFromCloud(user?.id, recipeId);
    if (success) {
      console.log("Recipe deleted from cloud!");
    }
  };
}
```

### Using Migration Tool
```typescript
import { recipeMigrationTool } from "@/lib/recipe-migration-tool";

// Check if migration needed
const { needsMigration, count } = recipeMigrationTool.getMigrationStatus(recipes);

if (needsMigration) {
  console.log(`${count} recipes need to be migrated`);
}

// Migrate recipes
const status = await recipeMigrationTool.migrateRecipesToCloud(
  userId,
  recipes,
  (progress) => {
    console.log(`Progress: ${progress.progress}%`);
  }
);

console.log(`Migrated: ${status.migratedRecipes}`);
```

---

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Recipe Availability** | Device-specific | Cloud-accessible |
| **Sync Status** | Manual/None | Automatic |
| **Multiple Devices** | Separate datasets | Unified access |
| **Offline Support** | N/A | Supported |
| **Backup** | Manual export | Automatic |
| **Privacy** | Implicit | Explicit with RLS |
| **Data Consistency** | Poor | Excellent |

---

## Next Steps

1. **Apply Migration**: Run the SQL migration
2. **Test Connection**: Verify Supabase is connected
3. **Trigger Migration**: Show migration dialog to users
4. **Monitor**: Check logs for sync success
5. **Communicate**: Let users know recipes now sync across devices
6. **Verify**: Test on multiple devices

---

## Technical Notes

- **Sync Service**: Singleton pattern, initialized once per user
- **RLS Policies**: User isolation at database level
- **Conflict Resolution**: Cloud version wins (newest timestamp)
- **Batch Operations**: 50 recipes per batch to avoid API limits
- **Error Handling**: Graceful degradation, individual retry on batch failure
- **Performance**: Indexes on user_id, created_at, is_deleted for fast queries

---

## Questions?

This solution ensures that:
- ✅ Your 4 home recipes sync to cloud
- ✅ Your 40+ work recipes sync to cloud
- ✅ Both sets become accessible everywhere
- ✅ Changes sync automatically across devices
- ✅ All data is secure and private
