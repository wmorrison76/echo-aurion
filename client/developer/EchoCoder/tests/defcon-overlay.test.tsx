import { act, fireEvent, render, screen } from "@testing-library/react";
import DefconOverlay from "@/components/echo/DefconOverlay";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const guardClientMocks = vi.hoisted(() => ({
  getGuardStatus: vi.fn(),
  getGuardIp: vi.fn(),
  getGuardOfflineUntil: vi.fn(() => Date.now()),
  GUARD_RETRY_DELAY_MS: 5000,
}));

vi.mock("@/lib/guard-client", () => guardClientMocks);

const mockGetGuardStatus = guardClientMocks.getGuardStatus as ReturnType<
  typeof vi.fn
>;
const mockGetGuardIp = guardClientMocks.getGuardIp as ReturnType<typeof vi.fn>;
const mockGetGuardOfflineUntil =
  guardClientMocks.getGuardOfflineUntil as ReturnType<typeof vi.fn>;

describe("DefconOverlay", () => {
  beforeEach(() => {
  mockGetGuardStatus.mockResolvedValue({
    data: { alert: "none", detail: "" },
    offline: false,
  });
  mockGetGuardIp.mockResolvedValue({
    data: { ip: "10.0.0.1" },
    offline: false,
  });
  mockGetGuardOfflineUntil.mockReturnValue(Date.now() + 1000);
});

afterEach(() => {
  vi.clearAllMocks();
});

test("remains hidden when guard reports no alert", () => {
  render(<DefconOverlay />);
  expect(screen.queryByText(/Red Phoenix Warning/i)).not.toBeInTheDocument();
});

test("shows and dismisses diagnostic overlay in test mode", async () => {
  render(<DefconOverlay />);

  await act(async () => {
    await Promise.resolve();
  });

  await act(async () => {
    const event = new CustomEvent("guard:test-red-phoenix", {
      detail: {
        message: "Diagnostic surge detected",
        ip: "172.16.0.2",
        durationMs: 2500,
      },
    });
    window.dispatchEvent(event);
  });

  expect(screen.getByText(/Red Phoenix Warning/i)).toBeInTheDocument();
  expect(screen.getByText(/Diagnostic surge detected/i)).toBeInTheDocument();

  const dismissButton = screen.getByRole("button", {
    name: /dismiss diagnostic overlay/i,
  });
  await act(async () => {
    fireEvent.click(dismissButton);
  });

  expect(screen.queryByText(/Red Phoenix Warning/i)).not.toBeInTheDocument();
});
});
