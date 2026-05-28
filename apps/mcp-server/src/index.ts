import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '@lamani/logger';

const server = new Server(
  {
    name: 'lamani-ads-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register a basic health check tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'health',
        description: 'Check the health status of the LamaniAds MCP server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  if (name === 'health') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ status: 'ok', uptime: process.uptime() }),
        },
      ],
    };
  }
  throw new Error(`Tool not found: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('MCP server running on Stdio transport');
}

main().catch((err) => {
  logger.error(err, 'MCP server execution failed');
  process.exit(1);
});
