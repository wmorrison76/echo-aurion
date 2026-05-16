import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sparkles } from "lucide-react";

import {
  DashboardControls,
  DashboardWorkspace,
  type DashboardWidgetDefinition,
} from "../client/modules/EchoEvents/components/dashboard/DashboardWorkspace";

const mockUpdatePreference = vi.fn();
const mockUpdatePreferences = vi.fn();

vi.mock("@/hooks/useUserPreferences", () => ({
  useUserPreferences: () => ({
    preferences: {
      widgetOrder: ["alpha", "beta"],
      hiddenWidgets: [],
      collapsedWidgets: [],
    },
    updatePreference: mockUpdatePreference,
    updatePreferences: mockUpdatePreferences,
  }),
}));

describe("DashboardWorkspace", () => {
  it("renders widgets and supports drag reordering", () => {
    if (!window.matchMedia) {
      window.matchMedia = () =>
        ({
          matches: false,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as any;
    }

    const widgets: DashboardWidgetDefinition[] = [
      {
        id: "alpha",
        title: "Alpha",
        icon: Sparkles,
        render: () => <div>Alpha widget</div>,
      },
      {
        id: "beta",
        title: "Beta",
        icon: Sparkles,
        render: () => <div>Beta widget</div>,
      },
    ];

    render(
      <DashboardWorkspace widgets={widgets}>
        <DashboardControls />
      </DashboardWorkspace>,
    );

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();

    const customizeButton = screen.getByRole("button", { name: /customize/i });
    fireEvent.click(customizeButton);

    const listItems = screen.getAllByRole("listitem");
    const dataTransfer = {
      data: {} as Record<string, string>,
      setData(type: string, value: string) {
        this.data[type] = value;
      },
      getData(type: string) {
        return this.data[type];
      },
      effectAllowed: "move",
      dropEffect: "move",
    };

    fireEvent.dragStart(listItems[0], { dataTransfer });
    fireEvent.dragOver(listItems[1], { dataTransfer });
    fireEvent.drop(listItems[1], { dataTransfer });

    expect(mockUpdatePreference).toHaveBeenCalledWith("widgetOrder", ["beta", "alpha"]);
  });
});
