import { describe, expect, it } from "vitest";
import { generateEchoAiResponse } from "./echoAi";
describe("generateEchoAiResponse", () => {
  it("returns cash ladder narrative when asking about cash", () => {
    const result = generateEchoAiResponse(
      "How is our cash position this month?",
    );
    expect(result.topic).toBe("cash-ladder");
    expect(result.signals).not.toHaveLength(0);
    expect(result.recommendations[0]?.title).toContain("discount");
  });
  it("returns forecast variance insight when forecasting is requested", () => {
    const result = generateEchoAiResponse(
      "Explain the forecast variance on banquet occupancy",
    );
    expect(result.topic).toBe("forecast-variance");
    expect(result.headline.toLowerCase()).toContain("forecast");
    expect(result.references.some((ref) => ref.includes("PredictHQ"))).toBe(
      true,
    );
  });
  it("falls back to general guidance when no heuristic matches", () => {
    const result = generateEchoAiResponse("Tell me something interesting");
    expect(result.topic).toBe("general");
    expect(result.recommendations).toHaveLength(2);
  });
});
