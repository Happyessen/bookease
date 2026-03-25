// src/index.js
// ─── BookEase MCP Server — Main Entry Point ───────────────────
//
// This server speaks the MCP (Model Context Protocol) which
// ChatGPT uses to discover and call your tools.
//
// Transport: HTTP/SSE (Server-Sent Events) — required for ChatGPT

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { toolDefinitions, handleTool } from './tools.js';

// ─── EXPRESS APP ─────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Health check — Railway/Render will ping this
app.get('/', (req, res) => {
  res.json({
    name: 'BookEase MCP Server',
    version: '1.0.0',
    status: 'running',
    tools: toolDefinitions.map(t => t.name),
    description: process.env.BUSINESS_NAME || 'Appointment Booking System'
  });
});

// ─── MCP SERVER SETUP ────────────────────────────────────────
const mcpServer = new Server(
  {
    name: 'bookease',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tell ChatGPT what tools are available
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: toolDefinitions };
});

// Handle when ChatGPT calls a tool
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  console.log(`🔧 Tool called: ${name}`, JSON.stringify(args, null, 2));

  try {
    const result = await handleTool(name, args || {});
    console.log(`✅ Tool result:`, JSON.stringify(result, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result)
        }
      ]
    };
  } catch (error) {
    console.error(`❌ Tool error [${name}]:`, error.message);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: false, error: error.message })
        }
      ],
      isError: true
    };
  }
});

// ─── SSE TRANSPORT ───────────────────────────────────────────
// ChatGPT connects here to receive a stream of MCP messages
const transports = new Map();

app.get('/sse', async (req, res) => {
  console.log('🔌 ChatGPT connected via SSE');

  const transport = new SSEServerTransport('/messages', res);
  const sessionId = Date.now().toString();
  transports.set(sessionId, transport);

  res.on('close', () => {
    console.log(`🔌 ChatGPT disconnected (session ${sessionId})`);
    transports.delete(sessionId);
  });

  await mcpServer.connect(transport);
});

// ChatGPT sends messages here
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);

  if (!transport) {
    return res.status(400).json({ error: 'No active session' });
  }

  await transport.handlePostMessage(req, res);
});

// ─── START SERVER ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🚀 BookEase MCP Server running on port ${PORT}`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`💊 Health check: http://localhost:${PORT}/`);
  console.log(`\n🔧 Tools available:`);
  toolDefinitions.forEach(t => console.log(`   • ${t.name}`));
  console.log('\n✅ Ready for ChatGPT connections!\n');
});
