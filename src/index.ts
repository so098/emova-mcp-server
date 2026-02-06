#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSearchPapers } from "./tools/search-papers.js";
import { registerClassifyPaper } from "./tools/classify-paper.js";
import { registerRefineTask } from "./tools/refine-task.js";
import { registerHypothesisResources } from "./resources/hypotheses.js";
import { registerPrompts } from "./prompts/emova-prompts.js";

const server = new McpServer({
  name: "emova-research",
  version: "1.0.0",
});

// Register tools
registerSearchPapers(server);
registerClassifyPaper(server);
registerRefineTask(server);

// Register resources
registerHypothesisResources(server);

// Register prompts
registerPrompts(server);

// Start server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Emova MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
