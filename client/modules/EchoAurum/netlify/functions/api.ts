import serverless from "serverless-http";
import { createServer } from "../../server";
let app: any;
async function initializeApp() {
  if (!app) {
    app = await createServer();
  }
  return app;
}
export const handler = async (event: any, context: any) => {
  const expressApp = await initializeApp();
  const slsHandler = serverless(expressApp);
  return slsHandler(event, context);
};
