# Developer Integration Guide

## Quick Reference

### 1. Settings Modal Integration

**In Header/Toolbar**:
```tsx
import { useSettingsModal } from '@/pages/Settings'

export function Header() {
  const { open, setOpen } = useSettingsModal()

  return (
    <div>
      <button onClick={() => setOpen(true)}>
        Settings ⚙️
      </button>
      {/* Modal auto-renders */}
    </div>
  )
}
```

**Alternative (Direct Hook)**:
```tsx
import { useSettingsModal as useSettings } from '@/hooks/useSettingsModal'

export function MyComponent() {
  const { openSettings, closeSettings } = useSettings()
  
  return (
    <button onClick={openSettings}>
      Open Settings
    </button>
  )
}
```

### 2. Glass Sidebar Integration

**In Layout**:
```tsx
import { GlassSidebar, defaultSections } from '@/components/GlassSidebar'

export function Layout({ children }) {
  return (
    <div className="flex h-screen">
      <GlassSidebar
        sections={defaultSections}
        onItemClick={(sectionId, itemId) => {
          console.log(`Clicked: ${sectionId} → ${itemId}`)
        }}
        onSettingsClick={() => setSettingsOpen(true)}
      />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
```

**Custom Sections**:
```tsx
const customSections = [
  {
    id: "projects",
    title: "Projects",
    icon: <FileText className="w-4 h-4" />,
    items: [
      { id: "new", label: "New Project" },
      { id: "open", label: "Open Project" },
      { id: "recent", label: "Recent" },
    ],
  },
  {
    id: "tools",
    title: "Tools",
    icon: <Wrench className="w-4 h-4" />,
    items: [
      { id: "export", label: "Export" },
      { id: "import", label: "Import" },
    ],
  },
]

<GlassSidebar sections={customSections} onItemClick={handleClick} />
```

### 3. Enhanced Toolbar Integration

**In Header**:
```tsx
import { EnhancedToolbar, defaultToolbarActions } from '@/components/EnhancedToolbar'

export function Header() {
  const actions = [
    {
      id: "zoom-in",
      label: "Zoom In",
      icon: <ZoomIn className="w-4 h-4" />,
      onClick: () => zoomIn(),
      tooltip: "Ctrl+Plus",
    },
    {
      id: "zoom-out",
      label: "Zoom Out",
      icon: <ZoomOut className="w-4 h-4" />,
      onClick: () => zoomOut(),
      tooltip: "Ctrl+Minus",
    },
    ...defaultToolbarActions,
  ]

  return (
    <EnhancedToolbar
      actions={actions}
      onSettingsClick={() => setSettingsOpen(true)}
      onMenuClick={() => setMenuOpen(!menuOpen)}
      title="Studio Editor"
    />
  )
}
```

### 4. Asset Picker Integration

**In Panel**:
```tsx
import AssetPickerPanel from '@/components/AssetPickerPanel'

export function MyScene() {
  const [selectedAsset, setSelectedAsset] = useState(null)

  return (
    <AssetPickerPanel
      onPlace={(asset) => {
        setSelectedAsset(asset)
        console.log(`Placing: ${asset.name}`)
        // Add to 3D scene
        addToScene(asset)
      }}
      onClose={() => setShowPicker(false)}
    />
  )
}
```

**Without Panel Wrapper**:
```tsx
<AssetPickerPanel
  onPlace={({ id, name, dimensions_m }) => {
    // Create 3D object
    const box = new THREE.BoxGeometry(...dimensions_m)
    scene.add(new THREE.Mesh(box))
  }}
/>
```

### 5. Annotation Layer Integration

**In 3D Scene**:
```tsx
import { AnnotationLayer } from '@/components/AnnotationLayer'

export function StudioScene() {
  return (
    <Canvas>
      <AnnotationLayer />
      {/* Other scene elements */}
    </Canvas>
  )
}
```

### 6. Environmental Overlay Integration

**In 3D Scene**:
```tsx
import { EchoEnvOverlay } from '@/components/EchoEnvOverlay'

export function Scene() {
  return (
    <Canvas>
      <EchoEnvOverlay />
      {/* Other scene elements */}
    </Canvas>
  )
}
```

### 7. Stratus Cost Overlay Integration

**In 3D Scene**:
```tsx
import { EchoStratusOverlay } from '@/components/EchoStratusOverlay'

export function Scene() {
  const objects = [
    { id: "t1", position: [0, 0, 0], glCode: "7000" },
    { id: "c1", position: [1, 0, 0], glCode: "7001" },
  ]

  return (
    <Canvas>
      <EchoStratusOverlay objects={objects} />
      {/* Other scene elements */}
    </Canvas>
  )
}
```

---

## API Integration Examples

### Create Event
```typescript
async function createEvent(name: string, session: string) {
  const response = await fetch('/api/events/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      session,
      date: new Date().toISOString().split('T')[0],
    }),
  })
  
  if (!response.ok) throw new Error('Failed to create event')
  return response.json()
}
```

### Save Camera Bookmark
```typescript
async function saveBookmark(session: string, slot: number, pos: [number, number, number], target: [number, number, number]) {
  const response = await fetch('/api/camera/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session,
      slot,
      pos,
      target,
    }),
  })
  
  if (!response.ok) throw new Error('Failed to save bookmark')
  return response.json()
}
```

### Load Camera Bookmark
```typescript
async function loadBookmark(session: string, slot: number) {
  const response = await fetch(`/api/camera/get?session=${session}&slot=${slot}`)
  
  if (!response.ok) throw new Error('Bookmark not found')
  return response.json()
}
```

### List Events for Session
```typescript
async function getEvents(session: string) {
  const response = await fetch(`/api/events/by-session?session=${session}`)
  
  if (!response.ok) throw new Error('Failed to fetch events')
  return response.json()
}
```

### Save Annotation
```typescript
async function saveAnnotation(session: string, text: string) {
  const response = await fetch('/api/annotation/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session,
      text,
    }),
  })
  
  if (!response.ok) throw new Error('Failed to save annotation')
  return response.json()
}
```

---

## Styling Custom Components

### Using Light Mode Classes
```tsx
<div className="panel-light">
  <h2 className="text-gray-900 font-semibold">Light Panel</h2>
  <input className="input-apple" />
  <button className="btn-apple-primary">Save</button>
</div>
```

### Using Dark Mode Classes
```tsx
<div className="dark .panel-dark">
  <h2 className="text-cyan-300 font-bold">Dark Panel</h2>
  <input className="dark .input-tron" />
  <button className="dark .btn-tron">Save</button>
</div>
```

### Custom Color Variables
```typescript
// Access CSS variables in JavaScript
const primaryColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--primary')
// Result: "180 100% 50%" (HSL)
```

---

## Theme Switching

### Toggle Dark Mode
```typescript
// Enable dark mode
document.documentElement.classList.add('dark')

// Disable dark mode
document.documentElement.classList.remove('dark')

// Toggle
document.documentElement.classList.toggle('dark')

// Check if dark mode
const isDark = document.documentElement.classList.contains('dark')
```

### Respect System Preference
```typescript
function initTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
  
  if (prefersDark.matches) {
    document.documentElement.classList.add('dark')
  }
  
  // Listen for changes
  prefersDark.addEventListener('change', (e) => {
    if (e.matches) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  })
}
```

---

## Error Handling

### Try-Catch Pattern
```typescript
async function handleSaveEvent() {
  try {
    const result = await createEvent('My Event', 'session-123')
    toast({ title: 'Event saved', variant: 'success' })
  } catch (error) {
    toast({
      title: 'Error',
      description: error.message,
      variant: 'destructive',
    })
  }
}
```

### With TypeScript
```typescript
interface ApiError {
  error: string
  code?: string
  details?: Record<string, any>
}

async function createEvent(name: string, session: string): Promise<Event | null> {
  try {
    const response = await fetch('/api/events/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, session }),
    })
    
    if (!response.ok) {
      const error: ApiError = await response.json()
      throw new Error(error.error || 'Failed to create event')
    }
    
    return response.json()
  } catch (error) {
    console.error('Create event error:', error)
    return null
  }
}
```

---

## Performance Optimization

### Lazy Load Asset Picker
```typescript
const AssetPickerPanel = lazy(() => 
  import('@/components/AssetPickerPanel')
)

export function MyComponent() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AssetPickerPanel />
    </Suspense>
  )
}
```

### Memoize Components
```typescript
const MemoizedSidebar = memo(GlassSidebar)
const MemoizedToolbar = memo(EnhancedToolbar)

export function Layout() {
  return (
    <>
      <MemoizedToolbar {...props} />
      <MemoizedSidebar {...props} />
    </>
  )
}
```

### Use useCallback for Event Handlers
```typescript
export function Component() {
  const handleClick = useCallback(() => {
    // Handler code
  }, []) // Empty dependency array if no dependencies
  
  return <GlassSidebar onItemClick={handleClick} />
}
```

---

## Testing Components

### Unit Test Example
```typescript
import { render, screen } from '@testing-library/react'
import { GlassSidebar } from '@/components/GlassSidebar'

describe('GlassSidebar', () => {
  it('renders sections', () => {
    const sections = [
      {
        id: 'test',
        title: 'Test',
        icon: <span>📦</span>,
        items: [{ id: '1', label: 'Item 1' }],
      },
    ]
    
    render(<GlassSidebar sections={sections} />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

### Integration Test Example
```typescript
import { render, screen, userEvent } from '@testing-library/react'
import { EnhancedToolbar } from '@/components/EnhancedToolbar'

describe('EnhancedToolbar', () => {
  it('calls onClick when action button clicked', async () => {
    const onClick = vi.fn()
    const actions = [
      { id: '1', label: 'Test', icon: <span>T</span>, onClick },
    ]
    
    render(<EnhancedToolbar actions={actions} />)
    await userEvent.click(screen.getByRole('button', { name: 'Test' }))
    expect(onClick).toHaveBeenCalled()
  })
})
```

---

## Common Patterns

### State Management with Zustand
```typescript
import { create } from 'zustand'

interface UIStore {
  sidebarOpen: boolean
  settingsOpen: boolean
  toggleSidebar: () => void
  openSettings: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  settingsOpen: false,
  toggleSidebar: () => set((state) => ({
    sidebarOpen: !state.sidebarOpen,
  })),
  openSettings: () => set({ settingsOpen: true }),
}))
```

### Using in Component
```typescript
export function Layout() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  
  return (
    <div className="flex">
      {sidebarOpen && <GlassSidebar />}
      <main className="flex-1">
        {/* Content */}
      </main>
    </div>
  )
}
```

---

## Debugging

### Enable React DevTools
```bash
# Component props and state visible in browser
# Install React DevTools extension
```

### Console Logging
```typescript
// Components already use console methods
console.log('Debug message')
console.warn('Warning')
console.error('Error')

// In production, check:
// - Settings modal opens? → Check Settings.tsx
// - Events not saving? → Check eventstudio.ts
// - Bookmarks not loading? → Check camera-bookmarks.ts
```

### Network Debugging
```bash
# In browser DevTools → Network tab
# 1. Create event
# 2. Watch for POST /api/events/create
# 3. Check Response tab
# 4. Should be 200 with event data
```

---

## Troubleshooting

### Import Issues
```typescript
// ❌ Wrong
import Settings from '@/pages/Settings'

// ✅ Correct
import { useSettingsModal } from '@/pages/Settings'
```

### Component Not Rendering
```typescript
// Check:
1. Is component imported?
2. Are all required props provided?
3. Are there console errors?
4. Is parent component rendering?

// Debug:
console.log('Component rendered', props)
```

### Styling Not Applied
```typescript
// Check:
1. Is global.css imported in App.tsx?
2. Is dark mode class on <html>?
3. Is Tailwind configured correctly?
4. Are class names exact? (no typos)

// Debug:
<div className="border-4 border-red-500">
  {/* Will show red border if styles loading */}
</div>
```

---

## Best Practices

✅ **Do**:
- Use TypeScript types
- Handle errors with try-catch
- Use useCallback for expensive handlers
- Test components before using
- Follow existing code patterns
- Document complex logic
- Use semantic HTML

❌ **Don't**:
- Use `any` type (use `unknown` if needed)
- Ignore errors silently
- Create large components (break up)
- Hardcode values (use constants)
- Skip validation
- Add console.logs to production
- Ignore accessibility

---

## Getting Help

1. **Check documentation**: Review inline comments in components
2. **Look at examples**: See how components are used in other files
3. **Check tests**: Unit tests show expected usage
4. **Debug**: Use browser DevTools to inspect components
5. **Read code**: Related components are great references

---

**Last Updated**: October 18, 2024  
**Version**: 1.0.0

Happy coding! 🚀
