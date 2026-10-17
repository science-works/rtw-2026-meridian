// stdio entry point for Claude Desktop: `npm run mcp`. Logs go to stderr; stdout is the protocol.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMeridianMcp } from "./server";

const server = createMeridianMcp();
await server.connect(new StdioServerTransport());
console.error(`Meridian MCP server (read-only) connected; API at ${process.env.MERIDIAN_API ?? "http://localhost:8787"}`);
