export type EditableContentMeta = {
  prop: string;
  defaultValue: string;
  multiline?: boolean;
  label: string;
};

export const EDITABLE_CONTENT: Record<string, EditableContentMeta> = {
  Section: { prop: "heading", defaultValue: "Section", label: "Section heading" },
  Text: { prop: "text", defaultValue: "Sample text", label: "Text", multiline: true },
  Heading: { prop: "text", defaultValue: "Headline", label: "Heading" },
  Button: { prop: "text", defaultValue: "Click me", label: "Button label" },
  List: {
    prop: "items",
    defaultValue: "List item 1\nList item 2\nList item 3",
    label: "List items",
    multiline: true,
  },
  Accordion: {
    prop: "items",
    defaultValue: "Accordion item 1\nAccordion item 2",
    label: "Accordion items",
    multiline: true,
  },
  Tabs: {
    prop: "items",
    defaultValue: "Tab One\nTab Two\nTab Three",
    label: "Tabs",
    multiline: true,
  },
};
