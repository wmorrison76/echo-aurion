# Quick Start: Project Import & EchoCoder

## 🎯 What's New

You can now:
1. **Import project folders** from your desktop with intelligent file scanning
2. **Use EchoCoder** as a backend developer tool within the Studio
3. **Manage project configurations** from Settings

## 📂 Importing a Project

### Step 1: Open Settings
Click the **Settings icon** (⚙️) in the top-right header to open Settings page.

### Step 2: Select Your Project Folder
In the **"Project Import"** tab:
- Click the upload area or drag your project folder
- The system will automatically scan all files
- This uses `webkitdirectory` for folder selection

### Step 3: Review Files
The system automatically detects:
- **Connected Files**: Source files that import other files, all config files
- **Archive Candidates**: Unused files, tests, documentation (unless referenced)

You can adjust which files to import by clicking "Review Archive"

### Step 4: Import
Click **"Import Connected Files"** to:
1. Import selected files to your project
2. Create an archive of unused files
3. Store session metadata for recovery
4. Redirect to dashboard when complete

## 🔧 Using EchoCoder

### Enable EchoCoder
1. Go to **Settings** → **Tools & Integrations**
2. Click **"Enable"** for EchoCoder Backend Tool
3. You'll see confirmation: "Backend tool enabled. Access from Studio."

### Access in Studio
1. Go to **Studio** workspace
2. Scroll down the left sidebar
3. Click on **"EchoCoder Backend Tools"** card
4. Choose a tool:

### Available Tools

#### 📋 Project Scaffolder
- Generate new project structure
- Creates boilerplate code
- Sets up configuration files

#### 🔍 Code Analyzer
- Understand your code structure
- Visualize dependencies
- Find unused files

#### ⚡ Performance Optimizer
- Get optimization suggestions
- Reduce bundle size
- Improve load times

#### ⚙️ Configuration Manager
- Manage build settings
- Configure deployment
- Set environment variables

## 🔑 Key Features

### Intelligent File Detection
- **Scans imports** from source files
- **Identifies config files** (always included)
- **Detects test files** (included only if referenced)
- **Excludes non-essential** folders (node_modules, .git, etc.)

### Progress Tracking
- Visual progress bar during import
- Real-time file scanning
- Session history for reference

### Archive Management
- Archived files stored in localStorage
- Can be recovered later
- Metadata tracked for audit trail

### Settings Integration
- EchoCoder enable/disable toggle
- Tool configuration options
- Integrated with your workspace

## 💡 Tips & Tricks

### Optimize Your Imports
- Remove large node_modules before importing
- Archive documentation if you don't need it
- Keep configuration files (package.json, tsconfig, etc.)

### File Connection Detection
The system uses these rules:
- **Config files** (JSON, YAML, ENV): Always connected
- **Source files** (TS, TSX, JS, JSX): Connected if imported by other files
- **Test files**: Only connected if referenced by source code
- **Assets**: Included if referenced in code

### Manage Archives
- Archives stored in browser storage
- Can review archived files in the archive dialog
- Include/exclude files before importing

### EchoCoder Tips
- Enable EchoCoder before visiting Studio
- Tools are available in the sidebar
- Each tool has detailed documentation
- Use Configuration Manager first to set up your environment

## 🚀 Typical Workflow

1. **Prepare Desktop Project**: Clean up large dependencies
2. **Open Settings**: Click ⚙️ icon
3. **Import Folder**: Drag and drop your project folder
4. **Review Files**: Check connected vs. archived
5. **Import**: Click "Import Connected Files"
6. **Configure**: Go to Studio and use EchoCoder tools
7. **Develop**: Continue building in Studio

## ❓ FAQ

### Q: Can I import multiple projects?
**A**: Yes, each import creates a new session. You can view history in Settings.

### Q: What if I accidentally archive a file?
**A**: Review the archive dialog before importing. You can toggle files there.

### Q: Where are archived files stored?
**A**: Archive metadata is stored in browser localStorage. Original files aren't deleted from desktop.

### Q: Can I use EchoCoder without importing?
**A**: Yes! EchoCoder tools work independently. Enable in Settings, then access from Studio.

### Q: How does file connection detection work?
**A**: The system scans imports and requires statements, then scores files based on how many other files depend on them.

### Q: Are my files secure during import?
**A**: Files are processed locally in your browser. Nothing is sent to external servers by default.

## 📝 Next Steps

1. **[Enable EchoCoder](#using-echocoder)** in Settings
2. **[Review Project Import](#importing-a-project)** features
3. **Visit Studio** to use backend tools
4. **Configure your environment** with Configuration Manager

## 🆘 Troubleshooting

### Files not scanning
- Make sure you have folder permissions
- Try a smaller folder first
- Check browser console for errors

### Import seems stuck
- Check network connection
- Verify folder size (very large folders may take time)
- Refresh the page if needed

### EchoCoder not showing
- Make sure it's enabled in Settings
- Refresh the Studio page
- Check localStorage isn't disabled

### Archive has too many files
- Reduce threshold by editing file-scanner.ts
- Manually select files to import
- Import in multiple sessions

## 📚 Learn More

- **Settings Page**: `/settings` - Configure imports and tools
- **Studio**: `/studio` - Access EchoCoder and development tools
- **Dashboard**: `/` - View projects and recent activity

---

**Questions?** Check Settings page for detailed documentation on each feature.
