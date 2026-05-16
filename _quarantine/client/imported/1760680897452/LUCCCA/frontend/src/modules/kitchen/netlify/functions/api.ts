// Netlify Function entrypoint. Wraps our Express app with serverless-http
// Deployment steps (commented for reference):
// 1) Connect Netlify via Builder MCP: click Open MCP popover -> Connect Netlify
// 2) Deploy. Netlify will build the client and serve this function at /.netlify/functions/api
// 3) All /api/* requests are proxied here (see netlify.toml)

import serverless from "serverless-http";
import { createServer } from "../../server";

export const handler = serverless(createServer());

export default handler;
