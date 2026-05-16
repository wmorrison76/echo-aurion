# EchoCanva Modules - Export & Packaging Checklist

Use this checklist when preparing the modules for distribution to Echo Recipe Pro.

---

## Step 1: Clean Module Folders

Before zipping, remove these files/folders to keep the package small:

### Remove from `echo-canva-cake-order/`

- [ ] `.git/` (version control metadata)
- [ ] `.gitignore`
- [ ] `node_modules/` (dependencies from parent)
- [ ] `dist/` (compiled output)
- [ ] `build/` (build artifacts)
- [ ] `.env` (secrets)
- [ ] `.env.local` (local config)
- [ ] `.env.*.local` (environment-specific)
- [ ] `pnpm-lock.yaml` (lock file)
- [ ] `package-lock.json` (npm lock)
- [ ] `yarn.lock` (yarn lock)
- [ ] `.vscode/` (editor config)
- [ ] `.idea/` (IDE config)
- [ ] `.DS_Store` (macOS metadata)
- [ ] `*.log` (log files)
- [ ] `coverage/` (test coverage)
- [ ] `.next/` (Next.js cache)

### Remove from `echo-canva-design-editor/`

- [ ] Same as above

---

## Step 2: Verify Required Files

Each module should have:

### echo-canva-cake-order/

- [ ] `index.tsx` (main component)
- [ ] `luccca-module.json` (manifest)
- [ ] `INTEGRATION_GUIDE.md` (setup instructions)
- [ ] `README.md` (optional, general info)

### echo-canva-design-editor/

- [ ] `index.tsx` (main component)
- [ ] `luccca-module.json` (manifest)
- [ ] `INTEGRATION_GUIDE.md` (setup instructions)
- [ ] `README.md` (optional, general info)

---

## Step 3: Root Level Documentation

In the root of the package, include:

- [ ] `ECHOCANVA_MODULES_SETUP_GUIDE.md` (master setup guide)
- [ ] `MODULES_EXPORT_CHECKLIST.md` (this file)
- [ ] `README.md` (overview)
- [ ] `LICENSE` (if applicable)

---

## Step 4: File Size Verification

Check final package sizes:

### Target Sizes (after cleanup)

- `echo-canva-cake-order/` - Should be < 100KB
- `echo-canva-design-editor/` - Should be < 150KB
- Total package - Should be < 500KB

### If too large:

- [ ] Verify no `node_modules/` included
- [ ] Check for duplicate/unused files
- [ ] Compress images if any included
- [ ] Remove `.git` directories

**Command to check:**

```bash
du -sh echo-canva-cake-order/
du -sh echo-canva-design-editor/
du -sh . # Total
```

---

## Step 5: Create Package

### Option A: ZIP File (Recommended)

```bash
# Create clean zip without system files
zip -r echocanva-modules.zip \
  echo-canva-cake-order/ \
  echo-canva-design-editor/ \
  ECHOCANVA_MODULES_SETUP_GUIDE.md \
  MODULES_EXPORT_CHECKLIST.md \
  README.md \
  LICENSE \
  -x "*.git*" "node_modules/*" ".DS_Store" "*.log" "dist/*" ".env*"
```

### Option B: TAR.GZ (For Unix)

```bash
tar --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.DS_Store' \
    --exclude='.env*' \
    --exclude='*.log' \
    -czf echocanva-modules.tar.gz \
    echo-canva-cake-order/ \
    echo-canva-design-editor/ \
    *.md LICENSE
```

---

## Step 6: Verify Package Contents

After creating the zip/tar:

```bash
# List contents (verify no node_modules)
unzip -l echocanva-modules.zip | grep node_modules
# Should return: 0 matches

# Test extract in temp folder
mkdir /tmp/test-extract
cd /tmp/test-extract
unzip ../echocanva-modules.zip
# Verify structure looks correct
ls -la
```

---

## Step 7: Create Installation Instructions

Create a simple `QUICKSTART.md` in the root:

````markdown
# EchoCanva Modules - Quick Start

1. **Extract Package**
   - Unzip `echocanva-modules.zip`
2. **Copy Modules**
   - Copy `echo-canva-cake-order/` → `your-project/client/modules/`
   - Copy `echo-canva-design-editor/` → `your-project/client/modules/`
3. **Update Registry**
   - Open `your-project/client/lib/panel-registry.ts`
   - Follow steps in `ECHOCANVA_MODULES_SETUP_GUIDE.md`
4. **Rebuild**
   ```bash
   npm run build
   ```
````

5. **Done!**
   - Launch modules with `openPanel("echo-canva-cake-order")`
   - Or add sidebar buttons (see guide)

For detailed instructions, see: `ECHOCANVA_MODULES_SETUP_GUIDE.md`

````

---

## Step 8: Create Hash/Signature (Optional)

For security and integrity checking:

```bash
# Generate SHA-256 hash
shasum -a 256 echocanva-modules.zip > echocanva-modules.zip.sha256

# Users can verify with:
shasum -a 256 -c echocanva-modules.zip.sha256
````

---

## Step 9: Documentation Review

- [ ] `ECHOCANVA_MODULES_SETUP_GUIDE.md` is complete
- [ ] `INTEGRATION_GUIDE.md` in each module is complete
- [ ] Code snippets are tested and correct
- [ ] File paths match the user's structure
- [ ] No references to secret API keys
- [ ] All markdown links are relative (no external links)

---

## Step 10: Final Verification Checklist

Before sharing the package:

### Code Quality

- [ ] No console.log() statements left in production code
- [ ] No TypeScript errors
- [ ] No unused imports
- [ ] No hardcoded API keys or secrets
- [ ] Error handling is present

### Structure

- [ ] Correct folder naming
- [ ] All required files present
- [ ] Documentation is clear
- [ ] Code comments are helpful
- [ ] File permissions are normal (not restricted)

### Compatibility

- [ ] Works with React 18.3+
- [ ] Works with Node 16+
- [ ] No platform-specific paths (use forward slashes)
- [ ] Cross-platform compatible (Windows, Mac, Linux)

### Security

- [ ] No secrets in code
- [ ] No API keys exposed
- [ ] No private credentials
- [ ] No debug code enabled
- [ ] Safe for public distribution

---

## Step 11: Create Version File

Add a `VERSION` or `package.json` in root:

```json
{
  "name": "echocanva-modules",
  "version": "1.0.0",
  "description": "Plug-and-play modules for Echo Recipe Pro",
  "modules": [
    {
      "name": "echo-canva-cake-order",
      "version": "1.0.0",
      "icon": "🎂"
    },
    {
      "name": "echo-canva-design-editor",
      "version": "1.0.0",
      "icon": "🎨"
    }
  ],
  "compatibility": {
    "minNodeVersion": "16.0.0",
    "minReactVersion": "18.0.0",
    "supportedPlatforms": ["Windows", "macOS", "Linux"]
  },
  "releasedDate": "2025-01-01"
}
```

---

## Step 12: Distribution

### Share the Package:

- [ ] Upload to secure file sharing (Google Drive, Dropbox, etc.)
- [ ] Send with installation instructions
- [ ] Include SHA-256 hash for verification
- [ ] Provide support contact info

### Include with Package:

- [ ] `ECHOCANVA_MODULES_SETUP_GUIDE.md` - Main setup guide
- [ ] `QUICKSTART.md` - 5-minute quick start
- [ ] `MODULES_EXPORT_CHECKLIST.md` - This file
- [ ] `VERSION` - Version information
- [ ] Module folders (cleaned)

---

## Troubleshooting During Export

### Package is too large

```bash
# Find what's taking space
find . -type d -name node_modules -exec du -sh {} \;
find . -type d -name .git -exec du -sh {} \;
find . -type f -size +10M
```

### Can't create zip file

```bash
# Try alternative commands:
tar -czf echocanva-modules.tar.gz --exclude=node_modules ...
7z a echocanva-modules.7z ...
```

### Module won't work after extraction

1. Verify all files are present: `ls -la echo-canva-cake-order/`
2. Check permissions: `chmod 755 echo-canva-*/`
3. Verify path separators (use `/` not `\`)

---

## Post-Distribution Support

After sharing the package:

- [ ] Send SHA-256 hash to recipient
- [ ] Ask recipient to verify extraction
- [ ] Wait for confirmation they can build
- [ ] Help troubleshoot any issues
- [ ] Document solutions for future installs

---

## Cleanup After Export

After creating the final package:

```bash
# Clean up temporary files
rm -rf /tmp/test-extract
rm echocanva-modules.tar # if created
# Keep: echocanva-modules.zip, .sha256 file
```

---

## Version Management

When releasing updates:

1. [ ] Update version in `package.json`
2. [ ] Update version in each `luccca-module.json`
3. [ ] Update `INTEGRATION_GUIDE.md` if needed
4. [ ] Create new zip with version in filename
5. [ ] Update changelog if maintaining one

**Example naming:**

- `echocanva-modules-v1.0.0.zip`
- `echocanva-modules-v1.1.0.zip`

---

## Final Handoff Checklist

Before giving to Echo Recipe Pro team:

**Day Before**

- [ ] Test extraction in fresh folder
- [ ] Verify all docs are readable
- [ ] Double-check no secrets in code
- [ ] Generate SHA-256 hash
- [ ] Create quick start guide

**Day Of**

- [ ] Send ZIP file
- [ ] Send SHA-256 file
- [ ] Send setup guide (ECHOCANVA_MODULES_SETUP_GUIDE.md)
- [ ] Send support contact info
- [ ] Ask them to confirm receipt
- [ ] Schedule follow-up for questions

---

**Total Package Contents:**

```
echocanva-modules/
├── echo-canva-cake-order/
│   ├── index.tsx
│   ├── luccca-module.json
│   └── INTEGRATION_GUIDE.md
├── echo-canva-design-editor/
│   ├── index.tsx
│   ├── luccca-module.json
│   └── INTEGRATION_GUIDE.md
├── ECHOCANVA_MODULES_SETUP_GUIDE.md
├── MODULES_EXPORT_CHECKLIST.md
├── QUICKSTART.md
├── VERSION
├── README.md
└── LICENSE
```

**Total Size**: < 500KB  
**Setup Time**: 5-10 minutes  
**Support**: See setup guides included

---

✅ When all items are checked, the package is ready for distribution!
