# ECHOCODER MODULE SPECIFICATION

**Professional Developer Studio for the Golden Seed Package**

---

## Module Overview

**Name:** EchoCoder  
**Type:** Developer Studio (Module #12)  
**Icon:** 🔧  
**Route:** `/echocoder`  
**Component:** `EchoCoder`  
**Public Route:** `/embed/echo` (iframe-embeddable)

### Purpose
EchoCoder is a comprehensive professional SaaS developer studio designed to integrate with the Golden Seed Package. It provides design canvas capabilities, code generation, 3D visualization, and task automation for developers building hospitality applications.

### Key Features
✅ Professional SaaS Studio with design canvas  
✅ Draggable block-based design system  
✅ Code generation from designs  
✅ 3D Echo Orb visualization (customizable)  
✅ Public `/embed/echo` route for iframe embedding  
✅ Task automation buttons (6 task types)  
✅ 5-language support (EN/ES/FR/PT/IT)  
✅ MCP-ready for future AI automations  
✅ Zustand state management  
✅ React Three Fiber integration  

---

## Architecture

### Folder Structure

```
client/
├── components/
│   ├── studio/
│   │   ├── EchoCoder.tsx           # Main component
│   │   ├── DesignCanvas.tsx        # Design canvas
│   │   ├── DesignBlock.tsx         # Draggable block
│   │   ├── CodeGenerator.tsx       # Code generation
│   │   ├── EchoOrb.tsx             # 3D visualization
│   │   ├── TaskPanel.tsx           # Task selector
│   │   ├── tasks/
│   │   │   ├── PlannerTask.tsx     # Project planning
│   │   │   ├── CoderTask.tsx       # Code generation
│   │   │   ├── ReviewerTask.tsx    # Code review
│   │   │   ├── IntegratorTask.tsx  # Module integration
│   │   │   ├── HistorianTask.tsx   # Version history
│   │   │   └── ScorecardTask.tsx   # Metrics dashboard
│   │   ├── locales/
│   │   │   ├── en.json
│   │   │   ├── es.json
│   │   │   ├── fr.json
│   │   │   ├── pt.json
│   │   │   └── it.json
│   │   ├── store.ts                # Zustand store
│   │   ├── types.ts                # Type definitions
│   │   └── index.ts                # Barrel export
│   └── ...
├── pages/
│   ├── EchoCoder.tsx               # Page wrapper
│   └── ...
└── ...
```

### Component Hierarchy

```
EchoCoder (Main Container)
├── Header (Title + Instructions)
├── ToolBar (Task Buttons)
│   ├── [Planner]
│   ├── [Coder]
│   ├── [Reviewer]
│   ├── [Integrator]
│   ├── [Historian]
│   └── [Scorecard]
├── Main Content (Split View)
│   ├── Left Panel
│   │   ├── DesignCanvas
│   │   │   └── DesignBlock[] (draggable)
│   │   └── Controls
│   └── Right Panel
│       └── Active Task Component
│           ├── PlannerTask
│           ├── CoderTask
│           ├── ReviewerTask
│           ├── IntegratorTask
│           ├── HistorianTask
│           └── ScorecardTask
└── Footer (Status Bar)
```

---

## 1. Main EchoCoder Component

### Interface

```typescript
// client/components/studio/EchoCoder.tsx

import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEchoCoderStore } from './store';
import { cn } from '@/lib/utils';
import { DesignCanvas } from './DesignCanvas';
import { TaskPanel } from './TaskPanel';

type TaskType = 'planner' | 'coder' | 'reviewer' | 'integrator' | 'historian' | 'scorecard';

interface EchoCoderProps {
  initialTask?: TaskType;
  isEmbedded?: boolean;
}

export const EchoCoder: FC<EchoCoderProps> = ({
  initialTask = 'planner',
  isEmbedded = false,
}) => {
  const { t } = useTranslation();
  const [activeTask, setActiveTask] = useState<TaskType>(initialTask);
  const { design, addBlock, removeBlock, updateBlock } = useEchoCoderStore();

  const taskButtons: Array<{ id: TaskType; label: string; icon: string }> = [
    { id: 'planner', label: t('echocoder.tasks.planner'), icon: '📋' },
    { id: 'coder', label: t('echocoder.tasks.coder'), icon: '💻' },
    { id: 'reviewer', label: t('echocoder.tasks.reviewer'), icon: '👀' },
    { id: 'integrator', label: t('echocoder.tasks.integrator'), icon: '🔗' },
    { id: 'historian', label: t('echocoder.tasks.historian'), icon: '📜' },
    { id: 'scorecard', label: t('echocoder.tasks.scorecard'), icon: '📊' },
  ];

  return (
    <div className={cn(
      'echocoder-container',
      'flex flex-col h-screen',
      'glass-morphism',
      { 'p-4': isEmbedded }
    )}>
      {/* Header */}
      <div className="echocoder-header p-6 border-b border-primary/30">
        <h1 className="text-3xl font-bold">{t('echocoder.title')}</h1>
        <p className="text-muted-foreground">{t('echocoder.description')}</p>
      </div>

      {/* Toolbar */}
      <div className="echocoder-toolbar flex gap-2 p-4 bg-sidebar/50 border-b border-primary/30">
        {taskButtons.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTask(id)}
            className={cn(
              'px-4 py-2 rounded-lg transition-all',
              'border border-primary/30',
              'hover:bg-primary/10',
              activeTask === id && 'bg-primary/20 border-primary',
            )}
          >
            <span className="mr-2">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="echocoder-content flex flex-1 gap-4 p-4 overflow-hidden">
        {/* Design Canvas (Left) */}
        <div className="echocoder-canvas flex-1 border border-primary/30 rounded-lg overflow-hidden">
          <DesignCanvas />
        </div>

        {/* Task Panel (Right) */}
        <div className="echocoder-taskpanel w-96 border border-primary/30 rounded-lg overflow-hidden">
          <TaskPanel activeTask={activeTask} />
        </div>
      </div>

      {/* Footer */}
      <div className="echocoder-footer p-4 border-t border-primary/30 bg-sidebar/50 text-sm text-muted-foreground">
        <span>Design: {design.blocks.length} blocks | Mode: {activeTask}</span>
      </div>
    </div>
  );
};
```

### Styling

```typescript
// client/components/studio/EchoCoder.tsx (CSS)
<style>{`
  .echocoder-container {
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(12px);
  }

  .echocoder-header {
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`}</style>
```

---

## 2. Design Canvas

### DesignCanvas Component

```typescript
// client/components/studio/DesignCanvas.tsx

import { FC, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useEchoCoderStore } from './store';
import { DesignBlock } from './DesignBlock';

interface CanvasPosition {
  x: number;
  y: number;
}

export const DesignCanvas: FC = () => {
  const { t } = useTranslation();
  const { design, addBlock, removeBlock } = useEchoCoderStore();
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const handleAddBlock = useCallback((type: string) => {
    addBlock({
      id: `block-${Date.now()}`,
      type,
      position: { x: 100, y: 100 },
      size: { width: 200, height: 100 },
      content: '',
      color: '#00d4ff',
    });
  }, [addBlock]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // Canvas clicked, not a block
    }
  };

  return (
    <div className="design-canvas flex flex-col h-full bg-background/50">
      {/* Toolbar */}
      <div className="canvas-toolbar flex gap-2 p-4 border-b border-primary/30">
        <button
          onClick={() => handleAddBlock('container')}
          className="px-3 py-1 rounded border border-primary/30 hover:bg-primary/10"
        >
          📦 {t('echocoder.canvas.container')}
        </button>
        <button
          onClick={() => handleAddBlock('text')}
          className="px-3 py-1 rounded border border-primary/30 hover:bg-primary/10"
        >
          📝 {t('echocoder.canvas.text')}
        </button>
        <button
          onClick={() => handleAddBlock('button')}
          className="px-3 py-1 rounded border border-primary/30 hover:bg-primary/10"
        >
          🔘 {t('echocoder.canvas.button')}
        </button>
        <button
          onClick={() => handleAddBlock('image')}
          className="px-3 py-1 rounded border border-primary/30 hover:bg-primary/10"
        >
          🖼️ {t('echocoder.canvas.image')}
        </button>
      </div>

      {/* Canvas */}
      <div
        className="canvas-area flex-1 overflow-auto bg-black/20 relative"
        onClick={handleCanvasClick}
        style={{
          backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        {design.blocks.map((block) => (
          <DesignBlock
            key={block.id}
            block={block}
            onRemove={() => removeBlock(block.id)}
          />
        ))}
      </div>

      {/* Canvas Info */}
      <div className="canvas-info p-2 text-xs text-muted-foreground border-t border-primary/30">
        {design.blocks.length} blocks | {canvasSize.width}×{canvasSize.height}px
      </div>
    </div>
  );
};
```

### DesignBlock Component (Draggable)

```typescript
// client/components/studio/DesignBlock.tsx

import { FC, useRef, useEffect, useState } from 'react';
import { useEchoCoderStore } from './store';

interface DesignBlockProps {
  block: any;
  onRemove: () => void;
}

export const DesignBlock: FC<DesignBlockProps> = ({ block, onRemove }) => {
  const { updateBlock } = useEchoCoderStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const blockRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - block.position.x,
      y: e.clientY - block.position.y,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      updateBlock(block.id, {
        position: { x: newX, y: newY },
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, block.id, updateBlock]);

  return (
    <div
      ref={blockRef}
      className={`design-block absolute rounded-lg cursor-move transition-all ${
        isDragging ? 'z-50 opacity-80' : 'opacity-100'
      }`}
      style={{
        left: `${block.position.x}px`,
        top: `${block.position.y}px`,
        width: `${block.size.width}px`,
        height: `${block.size.height}px`,
        background: block.color,
        border: '2px dashed rgba(0, 212, 255, 0.5)',
        color: 'white',
        padding: '8px',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex justify-between items-start h-full">
        <span className="text-xs font-bold">{block.type}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-xs font-bold bg-destructive/50 px-2 py-1 rounded hover:bg-destructive"
        >
          ×
        </button>
      </div>
    </div>
  );
};
```

---

## 3. Code Generator

### CodeGenerator Component

```typescript
// client/components/studio/CodeGenerator.tsx

import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEchoCoderStore } from './store';

interface CodeGeneratorProps {
  language?: 'tsx' | 'jsx' | 'html' | 'json';
}

export const CodeGenerator: FC<CodeGeneratorProps> = ({ language = 'tsx' }) => {
  const { t } = useTranslation();
  const { design } = useEchoCoderStore();
  const [generatedCode, setGeneratedCode] = useState('');

  const generateCode = (lang: string) => {
    let code = '';

    if (lang === 'tsx') {
      code = generateTSXCode();
    } else if (lang === 'jsx') {
      code = generateJSXCode();
    } else if (lang === 'html') {
      code = generateHTMLCode();
    } else if (lang === 'json') {
      code = JSON.stringify(design, null, 2);
    }

    setGeneratedCode(code);
  };

  const generateTSXCode = () => {
    return `
import { FC } from 'react';

interface DesignProps {}

export const Design: FC<DesignProps> = () => {
  return (
    <div className="design-container">
      ${design.blocks.map((block) => `<!-- Block: ${block.type} -->`).join('\n')}
    </div>
  );
};
    `.trim();
  };

  const generateJSXCode = () => {
    return `
const Design = () => {
  return (
    <div className="design-container">
      ${design.blocks.map((block) => `{/* Block: ${block.type} */}`).join('\n')}
    </div>
  );
};

export default Design;
    `.trim();
  };

  const generateHTMLCode = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Design Export</title>
  <style>
    .design-container { display: flex; }
  </style>
</head>
<body>
  <div class="design-container">
    ${design.blocks.map((block) => `<!-- Block: ${block.type} -->`).join('\n')}
  </div>
</body>
</html>
    `.trim();
  };

  return (
    <div className="code-generator flex flex-col h-full gap-4 p-4">
      <div>
        <h3>{t('echocoder.codegen.title')}</h3>
      </div>

      {/* Language Selector */}
      <div className="flex gap-2">
        {['tsx', 'jsx', 'html', 'json'].map((lang) => (
          <button
            key={lang}
            onClick={() => generateCode(lang)}
            className="px-3 py-1 rounded border border-primary/30 hover:bg-primary/10 text-sm"
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Code Display */}
      <div className="flex-1 bg-black/50 rounded-lg p-4 overflow-auto font-mono text-sm">
        <pre className="text-primary">{generatedCode || 'Select language and click to generate'}</pre>
      </div>

      {/* Copy Button */}
      <button
        onClick={() => navigator.clipboard.writeText(generatedCode)}
        className="px-4 py-2 rounded bg-primary/20 border border-primary hover:bg-primary/30"
      >
        📋 {t('echocoder.codegen.copy')}
      </button>
    </div>
  );
};
```

---

## 4. 3D Echo Orb

### EchoOrb Component

```typescript
// client/components/studio/EchoOrb.tsx

import { FC, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Mesh } from 'three';

interface EchoOrbProps {
  color?: string;
  speed?: number;
  scale?: number;
  complexity?: number;
}

export const EchoOrb: FC<EchoOrbProps> = ({
  color = '#00d4ff',
  speed = 1,
  scale = 1,
  complexity = 4,
}) => {
  return (
    <div className="echo-orb-container w-full h-full bg-black/50 rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, 10]} intensity={0.4} color="#ff00ff" />
        <OrbMesh color={color} speed={speed} scale={scale} complexity={complexity} />
        <gridHelper args={[10, 10]} />
      </Canvas>
    </div>
  );
};

interface OrbMeshProps {
  color: string;
  speed: number;
  scale: number;
  complexity: number;
}

function OrbMesh({ color, speed, scale, complexity }: OrbMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const groupRef = useRef<any>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01 * speed;
      meshRef.current.rotation.y += 0.02 * speed;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} scale={scale}>
        <icosahedronGeometry args={[1, complexity]} />
        <meshPhongMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          wireframe={false}
          shininess={100}
        />
      </mesh>

      {/* Wireframe overlay */}
      <mesh scale={scale} position={[0, 0, 0.01]}>
        <icosahedronGeometry args={[1, complexity]} />
        <meshBasicMaterial
          color={color}
          wireframe={true}
          transparent={true}
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}
```

---

## 5. Task Panels

### TaskPanel Component

```typescript
// client/components/studio/TaskPanel.tsx

import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { PlannerTask } from './tasks/PlannerTask';
import { CoderTask } from './tasks/CoderTask';
import { ReviewerTask } from './tasks/ReviewerTask';
import { IntegratorTask } from './tasks/IntegratorTask';
import { HistorianTask } from './tasks/HistorianTask';
import { ScorecardTask } from './tasks/ScorecardTask';

type TaskType = 'planner' | 'coder' | 'reviewer' | 'integrator' | 'historian' | 'scorecard';

interface TaskPanelProps {
  activeTask: TaskType;
}

export const TaskPanel: FC<TaskPanelProps> = ({ activeTask }) => {
  const { t } = useTranslation();

  const renderTask = () => {
    switch (activeTask) {
      case 'planner':
        return <PlannerTask />;
      case 'coder':
        return <CoderTask />;
      case 'reviewer':
        return <ReviewerTask />;
      case 'integrator':
        return <IntegratorTask />;
      case 'historian':
        return <HistorianTask />;
      case 'scorecard':
        return <ScorecardTask />;
      default:
        return <div>{t('echocoder.task.notfound')}</div>;
    }
  };

  return (
    <div className="task-panel flex flex-col h-full bg-sidebar/50 overflow-hidden">
      {renderTask()}
    </div>
  );
};
```

### Individual Task Components

#### PlannerTask
```typescript
// client/components/studio/tasks/PlannerTask.tsx

export const PlannerTask: FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4 overflow-auto flex-1">
      <h3 className="text-lg font-bold mb-4">{t('echocoder.tasks.planner')}</h3>
      <div className="space-y-3">
        <input
          type="text"
          placeholder={t('echocoder.planner.title')}
          className="w-full p-2 rounded bg-background/50 border border-primary/30"
        />
        <textarea
          placeholder={t('echocoder.planner.description')}
          rows={6}
          className="w-full p-2 rounded bg-background/50 border border-primary/30"
        />
        <button className="w-full py-2 rounded bg-primary/20 border border-primary hover:bg-primary/30">
          {t('echocoder.planner.save')}
        </button>
      </div>
    </div>
  );
};
```

#### CoderTask
```typescript
// client/components/studio/tasks/CoderTask.tsx

export const CoderTask: FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4 overflow-auto flex-1">
      <h3 className="text-lg font-bold mb-4">{t('echocoder.tasks.coder')}</h3>
      <CodeGenerator />
    </div>
  );
};
```

#### ReviewerTask
```typescript
// client/components/studio/tasks/ReviewerTask.tsx

export const ReviewerTask: FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4 overflow-auto flex-1">
      <h3 className="text-lg font-bold mb-4">{t('echocoder.tasks.reviewer')}</h3>
      <div className="space-y-3">
        <div className="bg-background/50 rounded p-3">
          <div className="font-mono text-xs text-primary">
            Review checkpoints: [ ] Code style [ ] Performance [ ] Security
          </div>
        </div>
        <textarea
          placeholder={t('echocoder.reviewer.comments')}
          rows={8}
          className="w-full p-2 rounded bg-background/50 border border-primary/30 text-sm"
        />
      </div>
    </div>
  );
};
```

#### IntegratorTask
```typescript
// client/components/studio/tasks/IntegratorTask.tsx

export const IntegratorTask: FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4 overflow-auto flex-1">
      <h3 className="text-lg font-bold mb-4">{t('echocoder.tasks.integrator')}</h3>
      <div className="space-y-3">
        <select className="w-full p-2 rounded bg-background/50 border border-primary/30 text-sm">
          <option>{t('echocoder.integrator.selectmodule')}</option>
          <option>Culinary</option>
          <option>Pastry</option>
          <option>Schedule</option>
        </select>
        <div className="text-sm text-muted-foreground">
          {t('echocoder.integrator.selected')}: None
        </div>
      </div>
    </div>
  );
};
```

#### HistorianTask
```typescript
// client/components/studio/tasks/HistorianTask.tsx

export const HistorianTask: FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4 overflow-auto flex-1">
      <h3 className="text-lg font-bold mb-4">{t('echocoder.tasks.historian')}</h3>
      <div className="space-y-2 text-sm">
        <div className="bg-background/30 p-2 rounded border-l-2 border-primary">
          <div className="font-mono text-xs">v1.0.0 - Initial release</div>
          <div className="text-xs text-muted-foreground">2025-01-15</div>
        </div>
      </div>
    </div>
  );
};
```

#### ScorecardTask
```typescript
// client/components/studio/tasks/ScorecardTask.tsx

export const ScorecardTask: FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4 overflow-auto flex-1">
      <h3 className="text-lg font-bold mb-4">{t('echocoder.tasks.scorecard')}</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-primary/10 p-2 rounded">
            <div>Design Score</div>
            <div className="text-lg font-bold">8.5/10</div>
          </div>
          <div className="bg-primary/10 p-2 rounded">
            <div>Code Quality</div>
            <div className="text-lg font-bold">7.2/10</div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 6. Zustand Store

### State Management

```typescript
// client/components/studio/store.ts

import { create } from 'zustand';

interface DesignBlock {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: string;
  color: string;
}

interface EchoCoderState {
  design: {
    blocks: DesignBlock[];
    title: string;
    description: string;
  };
  history: any[];
  
  addBlock: (block: DesignBlock) => void;
  removeBlock: (id: string) => void;
  updateBlock: (id: string, updates: Partial<DesignBlock>) => void;
  clearDesign: () => void;
  setDesignTitle: (title: string) => void;
  setDesignDescription: (description: string) => void;
  
  addToHistory: (snapshot: any) => void;
  clearHistory: () => void;
}

export const useEchoCoderStore = create<EchoCoderState>((set) => ({
  design: {
    blocks: [],
    title: 'Untitled Design',
    description: '',
  },
  history: [],

  addBlock: (block) =>
    set((state) => ({
      design: {
        ...state.design,
        blocks: [...state.design.blocks, block],
      },
    })),

  removeBlock: (id) =>
    set((state) => ({
      design: {
        ...state.design,
        blocks: state.design.blocks.filter((b) => b.id !== id),
      },
    })),

  updateBlock: (id, updates) =>
    set((state) => ({
      design: {
        ...state.design,
        blocks: state.design.blocks.map((b) =>
          b.id === id ? { ...b, ...updates } : b
        ),
      },
    })),

  clearDesign: () =>
    set({
      design: {
        blocks: [],
        title: 'Untitled Design',
        description: '',
      },
    }),

  setDesignTitle: (title) =>
    set((state) => ({
      design: { ...state.design, title },
    })),

  setDesignDescription: (description) =>
    set((state) => ({
      design: { ...state.design, description },
    })),

  addToHistory: (snapshot) =>
    set((state) => ({
      history: [...state.history.slice(-19), snapshot],
    })),

  clearHistory: () =>
    set({ history: [] }),
}));
```

---

## 7. Localization

### Translation Files

```json
// client/components/studio/locales/en.json
{
  "echocoder": {
    "title": "EchoCoder - Developer Studio",
    "description": "Professional SaaS developer studio with design canvas, code generation, and 3D visualization",
    "tasks": {
      "planner": "Planner",
      "coder": "Coder",
      "reviewer": "Reviewer",
      "integrator": "Integrator",
      "historian": "Historian",
      "scorecard": "Scorecard"
    },
    "canvas": {
      "container": "Container",
      "text": "Text",
      "button": "Button",
      "image": "Image"
    },
    "codegen": {
      "title": "Code Generator",
      "copy": "Copy Code"
    },
    "planner": {
      "title": "Project Title",
      "description": "Project Description",
      "save": "Save Plan"
    },
    "reviewer": {
      "comments": "Add review comments..."
    },
    "integrator": {
      "selectmodule": "Select Module",
      "selected": "Selected"
    },
    "task": {
      "notfound": "Task not found"
    }
  }
}
```

**Repeat for:** es.json, fr.json, pt.json, it.json

---

## 8. Public Embed Route

### Embed Page Component

```typescript
// client/pages/EchoOrbEmbed.tsx

import { FC } from 'react';
import { EchoCoder } from '@/components/studio';

export const EchoOrbEmbed: FC = () => {
  return (
    <div className="w-full h-screen overflow-hidden">
      <EchoCoder isEmbedded={true} />
    </div>
  );
};
```

### iframe Integration

```html
<!-- External page -->
<iframe
  src="https://yourdomain.com/embed/echo"
  width="100%"
  height="600"
  frameborder="0"
></iframe>
```

---

## 9. MCP Integration Ready

### MCP Hooks (Future)

```typescript
// client/components/studio/hooks/useMCP.ts

export const useMCPLinear = () => {
  // Future Linear integration for task management
};

export const useMCPNotion = () => {
  // Future Notion integration for documentation
};

export const useMCPAI = () => {
  // Future AI integration for code generation
};
```

---

## 10. Type Definitions

```typescript
// client/components/studio/types.ts

export interface Design {
  id: string;
  title: string;
  description: string;
  blocks: DesignBlock[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DesignBlock {
  id: string;
  type: 'container' | 'text' | 'button' | 'image';
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: string;
  color: string;
  metadata?: Record<string, any>;
}

export interface Task {
  id: string;
  type: TaskType;
  status: 'pending' | 'in-progress' | 'completed';
  data: Record<string, any>;
}

export type TaskType = 'planner' | 'coder' | 'reviewer' | 'integrator' | 'historian' | 'scorecard';
```

---

## Barrel Export

```typescript
// client/components/studio/index.ts

export { EchoCoder } from './EchoCoder';
export { DesignCanvas } from './DesignCanvas';
export { DesignBlock } from './DesignBlock';
export { CodeGenerator } from './CodeGenerator';
export { EchoOrb } from './EchoOrb';
export { TaskPanel } from './TaskPanel';
export { useEchoCoderStore } from './store';
export * from './types';
```

---

## Integration with Golden Seed

### Sidebar Item
```
15. 🔧 EchoCoder → `/echocoder` (Badge: 🔧)
```

### PANEL_REGISTRY Entry
```typescript
{
  id: 'echocoder',
  title: 'EchoCoder',
  component: EchoCoder,
  icon: '🔧',
  category: 'studio',
}
```

### Page Route
```typescript
// client/App.tsx
<Route path="/echocoder" element={<EchoCoder />} />
<Route path="/embed/echo" element={<EchoOrbEmbed />} />
```

---

**End of EchoCoder Specification**

This module integrates seamlessly with the Golden Seed Package and provides a professional developer studio experience.
