export interface SlackAlert {
  channel: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}
export interface SlackClient {
  send(payload: SlackAlert): Promise<void>;
}
class ConsoleSlackClient implements SlackClient {
  async send(payload: SlackAlert) {
    if (process.env.NODE_ENV !== "test") {
      console.info("[SlackAlert]", JSON.stringify(payload));
    }
  }
}
let client: SlackClient = new ConsoleSlackClient();
export function setSlackClient(next: SlackClient) {
  client = next;
}
export async function dispatchForecastAlert(payload: SlackAlert) {
  await client.send(payload);
}
