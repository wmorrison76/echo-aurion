# Package 1 — Foundation: Setup Instructions

This is the foundational layer of the **Banquet Menu Builder** module for the LUCCCA Framework. After installing this package, you will have:

- The module folder scaffold inside MaestroBqts
- TypeScript types compiling against the rest of LUCCCA
- A working MongoDB Atlas connection
- Five repository classes for the five core collections
- An idempotent script that creates all required indexes

This package contains **no UI** and **no business logic** yet. Those come in Packages 2 through 5. Package 1 is the foundation everything else builds on.

---

## What This Package Adds

| Capability | Status After Install |
|---|---|
| Module folder structure | ✅ Scaffolded |
| TypeScript types for menu items, menus, drafts | ✅ Defined |
| MongoDB Atlas connection | ✅ Working |
| Repository classes for all 5 collections | ✅ Available |
| Index creation | ✅ Runnable |
| UI components | ❌ Package 3 |
| Echo AI³ integration | ❌ Package 4 |
| Templates | ❌ Package 5 |
| Seed data | ❌ Package 2 |

---

## What This Package Depends On

**Prerequisite checklist before you start:**

- [ ] LUCCCA Framework codebase is cloned and building cleanly
- [ ] Your existing MaestroBqts module is functional
- [ ] Node.js and npm/yarn are available
- [ ] You have a free MongoDB Atlas account (or are willing to create one)
- [ ] TypeScript is configured in your LUCCCA project
- [ ] Path alias `@/` resolves to `src/` in your `tsconfig.json` and Vite config

If any of those are not in place, address them before continuing.

---

## Step-by-Step Setup

### Step 1: Create MongoDB Atlas Cluster

1. Go to https://www.mongodb.com/cloud/atlas/register (or sign in if you have an account)
2. Create a new project named `LUCCCA` (or use existing)
3. Click "Build a Database" and select the **M0 FREE tier**
4. Choose a cloud provider and region (closest to your Railway region for low latency)
5. Click "Create Cluster" — provisioning takes 1-3 minutes
6. Once provisioned, create a database user:
   - Username: `luccca-banquet-app`
   - Password: generate a strong one and save it securely
   - Database User Privileges: "Read and write to any database"
7. Configure Network Access:
   - For development: add your IP address
   - For Railway production: add `0.0.0.0/0` (allow from anywhere) — Atlas auth keeps it secure
8. Once the cluster is ready, click "Connect" → "Connect your application" → copy the connection string
9. The connection string looks like:
   ```
   mongodb+srv://luccca-banquet-app:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 2: Install the Module Folder

1. Copy the entire `BanquetMenuBuilder/` folder from this package to your LUCCCA repo at:
   ```
   src/modules/MaestroBqts/BanquetMenuBuilder/
   ```
2. Verify the folder is in place:
   ```
   src/modules/MaestroBqts/BanquetMenuBuilder/
   ├── index.tsx
   ├── BanquetMenuBuilder.types.ts
   ├── BanquetMenuBuilder.constants.ts
   ├── BanquetMenuBuilder.config.ts
   ├── data/
   ├── components/   (empty for now)
   ├── hooks/        (empty for now)
   ├── services/     (empty for now)
   └── ...
   ```

### Step 3: Install MongoDB Driver

From your LUCCCA project root:

```bash
npm install mongodb
```

Or if you use yarn:

```bash
yarn add mongodb
```

Required version: `mongodb@^6.0.0` or later (for Vector Search support in Package 4).

### Step 4: Configure Environment Variables

1. Copy `.env.example` (in this package) into your project's environment file (probably `.env.local` or `.env`):
2. Set the following variables:
   ```bash
   LUCCCA_MONGO_CONNECTION_STRING=mongodb+srv://luccca-banquet-app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   LUCCCA_MONGO_DATABASE_NAME=luccca_banquet
   LUCCCA_PROPERTY_ID=demo-property-001
   ```
3. **Never commit your real `.env` file to git.** Add to `.gitignore` if not already there.

### Step 5: Verify TypeScript Compiles

From your LUCCCA project root:

```bash
npx tsc --noEmit
```

Expected: zero errors related to the new module. If you see errors:
- Check that your `tsconfig.json` includes `src/modules/MaestroBqts/BanquetMenuBuilder/**/*.ts`
- Check that `@/` path alias resolves correctly
- Common issue: ensure `"moduleResolution": "node"` or `"bundler"` in tsconfig

### Step 6: Run Index Creation

From your LUCCCA project root, run the index creation script:

```bash
npx tsx src/modules/MaestroBqts/BanquetMenuBuilder/data/indexes/createIndexes.ts
```

You should see output like:
```
✓ Connected to MongoDB Atlas
✓ Created text index on property_items.current.canonicalName
✓ Created compound index on property_items (propertyId, status)
✓ Created index on property_items dietary tags
... (more indexes)
✓ All indexes created successfully
```

### Step 7: Verify Connection From Your App

Add a temporary test in any file that runs at startup:

```typescript
import { getDb } from "@/modules/MaestroBqts/BanquetMenuBuilder/data/mongoClient";

async function testConnection() {
  const db = await getDb();
  const collections = await db.listCollections().toArray();
  console.log("✓ Connected to MongoDB. Collections:", collections.map(c => c.name));
}

testConnection();
```

Expected output:
```
✓ Connected to MongoDB. Collections: ['property_items', 'network_items', ...]
```

Once verified, **remove the test code** before committing.

---

## How to Verify It Worked

After completing the steps above, all of the following should be true:

- [ ] Folder `src/modules/MaestroBqts/BanquetMenuBuilder/` exists in your repo
- [ ] `npx tsc --noEmit` produces zero errors related to this module
- [ ] MongoDB Atlas dashboard shows your cluster is "Active"
- [ ] Index creation script completed without errors
- [ ] Test connection logs the collection list successfully
- [ ] Your existing LUCCCA app still builds and runs (this package shouldn't break anything)

If all six checkboxes are met, **Package 1 is successfully installed.**

---

## Common Issues and Fixes

### Issue: `Cannot find module 'mongodb'`
**Fix:** Run `npm install mongodb` or `yarn add mongodb`. Restart your TypeScript server.

### Issue: `Cannot find module '@/...'` errors
**Fix:** Your `tsconfig.json` `paths` config does not have `@/` mapped to `src/`. Add:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```
Also ensure your Vite/SWC config has the matching alias.

### Issue: MongoDB connection times out
**Fix:** Check Atlas Network Access. Your IP must be whitelisted (or use 0.0.0.0/0 for development). Also verify the connection string has the password URL-encoded if it contains special characters.

### Issue: `MongoServerError: bad auth`
**Fix:** Username or password incorrect. Reset the database user's password in Atlas, update the env var, and try again.

### Issue: Index creation script fails with "namespace not found"
**Fix:** This is normal on first run — the script will create the collections implicitly. Re-run the script and it should succeed.

### Issue: TypeScript errors about missing types
**Fix:** This package uses `mongodb`'s built-in types. If you see type errors, ensure `@types/node` is installed: `npm install --save-dev @types/node`.

### Issue: Module not appearing in MaestroBqts navigation
**This is expected for Package 1.** The module's `index.tsx` registers with MaestroBqts, but the actual UI components are not built until Package 3. The module will appear in the registry but render an empty placeholder.

---

## What's NOT in This Package (Don't Try to Use Yet)

- **No UI components.** The `components/` folder is empty. Trying to render the panel will show a placeholder.
- **No menu item data.** The collections exist but are empty. Package 2 seeds them.
- **No Echo integration.** The `services/` folder is empty. Package 4 adds this.
- **No templates.** Package 5 adds the visual layer.
- **No drag-drop, no calculations, no workflows.** All in subsequent packages.

If you try to use any of the above, you'll get reasonable error messages or empty states. That's expected.

---

## What's in Package 2

Package 2 will add:
- Reference menu item catalog for the demo property
- Item versioning utilities
- Dietary derivation utilities
- Pricing model utilities
- The seed runner script
- Verification queries to confirm data is correct

Once Package 1 is verified working, request Package 2.

---

## Architectural Notes

**Why MongoDB Atlas free tier?** It's genuinely free, includes Vector Search and Atlas Search natively (which Echo needs), and scales to M10 (~$57/month) when you outgrow it. Cheaper and faster to set up than self-hosted MongoDB or DynamoDB+bolt-ons.

**Why the repository pattern?** Every MongoDB query lives in a typed repository method. No raw queries scattered through services and components. This makes refactoring safe, mocking trivial for tests, and prevents query-string typos that fail silently.

**Why discriminated unions for `PricingModel`?** TypeScript will force exhaustive handling of every pricing kind in switch statements. You can never accidentally forget a case.

**Why singleton repositories?** MongoDB connections are pooled, but the repository classes are stateless. One instance per process is sufficient and avoids accidentally creating multiple connection pools.

**Why does the schema use `propertyId` everywhere?** Multi-tenant from day one. Even with a single property, the data model is ready for the network intelligence layer (Package 5) without any restructure.

---

Questions, errors, or surprises? Document them and bring them back to the build conversation. Each package is a checkpoint — fix issues here before moving forward.
