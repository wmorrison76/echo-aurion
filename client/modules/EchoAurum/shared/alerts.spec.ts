import { describe, expect, it } from "vitest";
import { dispatchForecastAlert, setSlackClient } from "./alerts";
class MockSlackClient {
  payloads: unknown[] = [];
  async send(payload: unknown) {
    this.payloads.push(payload);
  }
}
describe("dispatchForecastAlert", () => {
  it("sends payload through configured client", async () => {
    const mock = new MockSlackClient();
    setSlackClient(mock as never);
    await dispatchForecastAlert({
      channel: "#finance",
      title: "Variance alert",
      message: "Occupancy swing",
    });
    expect(mock.payloads).toHaveLength(1);
  });
});
