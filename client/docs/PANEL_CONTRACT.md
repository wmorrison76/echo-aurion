# Panel Module Contract

All modules that are opened as **registry panels** in the LUCCCA shell (e.g. Whiteboard, VideoConference) must follow this contract so they render correctly and behave consistently.

## Props

The default export of a panel module receives the following props (injected by `PanelHost` when the panel is opened via the registry):

| Prop        | Type       | Description |
|------------|------------|-------------|
| `panelId`  | `string`   | Unique panel instance id (e.g. `"whiteboard"`, `"video"`). |
| `onClose`  | `() => void` | Callback to close the panel. Optional; may be undefined for system panels. |
| `isEmbedded` | `boolean` | Whether the panel is embedded in the shell (e.g. in a tab or side panel). |
| …context   | any        | Additional props passed when opening the panel (e.g. `sessionId`, `roomId`, `boardId`). |

## Layout

- The root element returned by the panel **must** participate in the flex chain so the content fills the panel area.
- Use a root wrapper with:
  - `display: flex`, `flex-direction: column`
  - `flex: 1 1 auto` and `min-height: 0` so the panel can shrink inside the host.
  - `width: 100%`, `height: 100%` (or equivalent) so it fills the allocated space.

Example:

```tsx
export default function MyPanel({ panelId, onClose, isEmbedded, ...props }) {
  return (
    <div
      className="w-full h-full flex flex-col min-h-0"
      style={{ flex: "1 1 auto", minHeight: 0 }}
    >
      {/* content */}
    </div>
  );
}
```

## Error handling

- Panel modules should wrap their content in an error boundary that reports to Sentry and renders a **visible** fallback (message + Retry) so users never see a blank panel when something throws.

## Loading

- Registry panels are loaded asynchronously via `createSafeModuleLoader`. The shell shows a loading state until the module default export is available. The module does not need to handle its own loading state for the initial chunk.

## Opening a panel with context

To open a panel with custom props (e.g. Whiteboard with a specific session), dispatch the `open-panel` custom event:

```ts
window.dispatchEvent(
  new CustomEvent("open-panel", {
    detail: { id: "whiteboard", sessionId: "abc-123", boardId: "xyz" },
  })
);
```

The shell will call `openPanel(id, tab, panelProps)` and the panel will receive `sessionId` and `boardId` in its props.
