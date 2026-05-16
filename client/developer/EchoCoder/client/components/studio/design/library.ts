import type { CSSProperties } from "react";

export type LibraryItem = {
  name: string;
  type: string;
  props?: Record<string, any>;
};

export const designLibrary: { label: string; items: LibraryItem[] }[] = [
  {
    label: "Layout",
    items: [
      { name: "Container", type: "Container", props: { w: 640, h: 360 } },
      { name: "Section", type: "Section", props: { w: 720, h: 320 } },
      { name: "Grid", type: "Grid", props: { w: 640, h: 320 } },
      { name: "Stack (Flex)", type: "Stack", props: { w: 480, h: 160 } },
      { name: "Split Pane", type: "SplitPane", props: { w: 640, h: 280 } },
      { name: "Tabs", type: "Tabs", props: { w: 440, h: 140 } },
      { name: "Accordion", type: "Accordion", props: { w: 420, h: 200 } },
      { name: "Steps", type: "Steps", props: { w: 520, h: 120 } },
      { name: "Panel Container", type: "PanelContainer", props: { w: 540, h: 260 } },
      { name: "Panel Toolbar", type: "PanelToolbar", props: { w: 500, h: 80 } },
      { name: "Dock", type: "Dock", props: { w: 360, h: 80 } },
      { name: "Card", type: "Card", props: { w: 320, h: 200 } },
    ],
  },
  {
    label: "Navigation",
    items: [
      { name: "Sidebar Nav", type: "SidebarNav", props: { w: 260, h: 320 } },
      { name: "Breadcrumbs", type: "Breadcrumbs", props: { w: 420, h: 60 } },
      { name: "Command Palette", type: "CommandPalette", props: { w: 520, h: 160 } },
      { name: "Menu Bar", type: "MenuBar", props: { w: 540, h: 80 } },
      { name: "Pagination", type: "Pagination", props: { w: 320, h: 60 } },
      { name: "Status Bar", type: "StatusBar", props: { w: 540, h: 70 } },
    ],
  },
  {
    label: "Data",
    items: [
      { name: "Data Table", type: "DataTable", props: { w: 640, h: 280 } },
      { name: "Virtual List", type: "VirtualList", props: { w: 360, h: 260 } },
      { name: "Tree View", type: "TreeView", props: { w: 320, h: 260 } },
      { name: "Kanban Board", type: "KanbanBoard", props: { w: 640, h: 280 } },
      { name: "Calendar", type: "Calendar", props: { w: 360, h: 260 } },
      { name: "Scheduler Timeline", type: "SchedulerTimeline", props: { w: 640, h: 220 } },
      { name: "Chart", type: "Chart", props: { w: 420, h: 220 } },
      { name: "Metric Tile", type: "MetricTile", props: { w: 240, h: 160 } },
      { name: "Avatar Group", type: "Avatar", props: { w: 220, h: 120 } },
      { name: "Badge", type: "Badge", props: { w: 200, h: 80 } },
    ],
  },
  {
    label: "Forms",
    items: [
      { name: "Button", type: "Button", props: { w: 160, h: 80 } },
      { name: "Text Field", type: "TextField", props: { w: 320, h: 100 } },
      { name: "Rich Text", type: "RichText", props: { w: 420, h: 220 } },
      { name: "Select", type: "Select", props: { w: 220, h: 90 } },
      { name: "Combobox", type: "Combobox", props: { w: 260, h: 100 } },
      { name: "Switch", type: "Switch", props: { w: 200, h: 80 } },
      { name: "Date Range", type: "DateRange", props: { w: 360, h: 100 } },
      { name: "Time Picker", type: "TimePicker", props: { w: 260, h: 90 } },
      { name: "Range Slider", type: "RangeSlider", props: { w: 360, h: 90 } },
      { name: "Color Picker", type: "ColorPicker", props: { w: 220, h: 120 } },
      { name: "File Uploader", type: "FileUploader", props: { w: 360, h: 160 } },
      { name: "Form", type: "Form", props: { w: 480, h: 260 } },
    ],
  },
  {
    label: "Overlays",
    items: [
      { name: "Modal", type: "Modal", props: { w: 380, h: 220 } },
      { name: "Drawer", type: "Drawer", props: { w: 320, h: 260 } },
      { name: "Popover", type: "Popover", props: { w: 220, h: 120 } },
      { name: "Tooltip", type: "Tooltip", props: { w: 180, h: 80 } },
      { name: "Toast", type: "Toast", props: { w: 260, h: 140 } },
      { name: "Progress", type: "Progress", props: { w: 320, h: 80 } },
      { name: "Spinner", type: "Spinner", props: { w: 200, h: 120 } },
      { name: "Confirm Dialog", type: "ConfirmDialog", props: { w: 360, h: 180 } },
    ],
  },
  {
    label: "Media",
    items: [
      { name: "Image", type: "Image", props: { w: 360, h: 220, src: "/placeholder.svg" } },
      {
        name: "Video",
        type: "Video",
        props: {
          w: 480,
          h: 260,
          src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        },
      },
      { name: "Code Block", type: "CodeBlock", props: { w: 420, h: 220 } },
      { name: "Echo Orb", type: "Orb", props: { w: 160, h: 160 } },
    ],
  },
  {
    label: "Content",
    items: [
      { name: "Heading", type: "Heading", props: { w: 360, h: 80 } },
      { name: "Paragraph", type: "Text", props: { w: 420, h: 120 } },
      { name: "List", type: "List", props: { w: 320, h: 180 } },
      { name: "Gallery", type: "Gallery", props: { w: 480, h: 220 } },
      { name: "Testimonials", type: "Testimonials", props: { w: 520, h: 220 } },
      { name: "Pricing", type: "Pricing", props: { w: 640, h: 300 } },
      { name: "Stats", type: "Stats", props: { w: 540, h: 200 } },
      { name: "Hero", type: "Hero", props: { w: 720, h: 340 } },
    ],
  },
];

export type TextStyleProps = Record<string, any>;

export const textStyleFromProps = (props?: TextStyleProps): CSSProperties => {
  const style: CSSProperties = {};
  if (!props) return style;
  if (props.fontSize) {
    style.fontSize =
      typeof props.fontSize === "number"
        ? `${props.fontSize}px`
        : String(props.fontSize);
  }
  if (props.fontWeight) {
    style.fontWeight = props.fontWeight as CSSProperties["fontWeight"];
  }
  if (props.color) {
    style.color = String(props.color);
  }
  if (props.textAlign) {
    style.textAlign = props.textAlign as CSSProperties["textAlign"];
  }
  return style;
};
