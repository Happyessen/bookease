// src/index.js
// ─── BookEase MCP Server — Apps SDK + OpenAI Integration ────
// Features: MCP tools + Interactive booking UI component
// Uses Streamable HTTP transport with Apps SDK extensions

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE
} from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';

import {
  getAppointments, getAppointmentById,
  createAppointment, cancelAppointment,
  getBookedSlots, getServices, getManagement
} from './db.js';

import {
  sendSMS, bookingConfirmationMessage, cancellationMessage
} from './notifications.js';

import { ALL_SLOTS, formatDate, isPastDate } from './utils.js';

// ─── EXPRESS APP ──────────────────────────────────────────────
const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['content-type', 'mcp-session-id'],
  exposedHeaders: ['Mcp-Session-Id']
}));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    name: 'BookEase MCP Server',
    version: '1.0.0',
    status: 'running',
    transport: 'streamable-http',
    endpoint: '/mcp',
    business: process.env.BUSINESS_NAME || 'Jada Squad'
  });
});

// Serve booking widget UI
app.get('/widget', (req, res) => {
  if (bookingWidgetHtml) {
    res.setHeader('Content-Type', 'text/html');
    res.send(bookingWidgetHtml);
  } else {
    res.status(404).send('Booking widget not available');
  }
});

// ─── LOAD UI WIDGET ──────────────────────────────────────────
let bookingWidgetHtml = '';
try {
  bookingWidgetHtml = readFileSync('./public/booking-widget.html', 'utf8');
} catch (err) {
  console.warn('⚠️  Booking widget HTML not found. UI will not be available.');
}

// ─── CREATE MCP SERVER WITH APPS SDK ─────────────────────────
function createBookEaseServer() {
  const server = new McpServer({
    name: 'bookease',
    version: '1.0.0',
  });

  // ── REGISTER UI RESOURCE ────────────────────────────────────
  if (bookingWidgetHtml) {
    registerAppResource(
      server,
      'bookease-widget',
      'ui://widget/booking.html',
      {},
      async () => ({
        contents: [
          {
            uri: 'ui://widget/booking.html',
            mimeType: RESOURCE_MIME_TYPE,
            text: bookingWidgetHtml,
          },
        ],
      })
    );
  }

  // ── TOOL 1: Get Services ────────────────────────────────────
  registerAppTool(
    server,
    'get_services',
    {
      title: 'Get Services',
      description: 'Get all available services with prices and durations',
      inputSchema: {},
      _meta: {
        ui: { resourceUri: 'ui://widget/booking.html' },
      },
    },
    async () => {
      const services = await getServices();
      return {
        content: [{ type: 'text', text: 'Updated service list. Please use the widget.' }],
        structuredContent: { services }
      };
    }
  );

  // ── TOOL 2: Get Management ───────────────────────────────────
  registerAppTool(
    server,
    'get_management',
    {
      title: 'Get Management',
      description: 'Get all available management team members',
      inputSchema: {},
      _meta: {
        ui: { resourceUri: 'ui://widget/booking.html' },
      },
    },
    async () => {
      const management = await getManagement();
      return {
        content: [{ type: 'text', text: 'Management list refreshed. Please use the widget.' }],
        structuredContent: { management }
      };
    }
  );

  // ── TOOL 3: Get Available Slots ─────────────────────────────
  registerAppTool(
    server,
    'get_available_slots',
    {
      title: 'Get Available Slots',
      description: 'Get available time slots for a specific date',
      inputSchema: {
        date: z.string().describe('Date in format YYYY-M-D, e.g. 2026-3-25'),
      },
      _meta: {
        ui: { resourceUri: 'ui://widget/booking.html' },
      },
    },
    async ({ date }) => {
      if (isPastDate(date)) {
        return {
          content: [{ type: 'text', text: 'Selected date is in the past. Change date.' }],
          structuredContent: { available_slots: [] }
        };
      }
      const booked = await getBookedSlots(date);
      const available = ALL_SLOTS.filter(s => !booked.includes(s));
      return {
        content: [{ type: 'text', text: 'Loaded slots; update shown in widget.' }],
        structuredContent: { available_slots: available }
      };
    }
  );

  // ── TOOL 4: Book Appointment ────────────────────────────────
  registerAppTool(
    server,
    'book_appointment',
    {
      title: 'Book Appointment',
      description: 'Create a new appointment booking',
      inputSchema: {
        name: z.string().describe('Name'),
        email: z.string().email().describe('Email'),
        phone: z.string().describe('Phone'),
        notes: z.string().optional().describe('Special requests'),
        service: z.string().describe('Service name'),
        management: z.string().describe('Management team member'),
        date: z.string().describe('Date in format YYYY-M-D'),
        time: z.string().describe('Time slot'),
      },
      _meta: {
        ui: { resourceUri: 'ui://widget/booking.html' },
      },
    },
    async (args) => {
      if (isPastDate(args.date)) {
        return {
          content: [{ type: 'text', text: 'Cannot book a past date.' }],
          structuredContent: { booking: null }
        };
      }
      const appointment = await createAppointment(args);
      sendSMS(args.phone, bookingConfirmationMessage(appointment));
      return {
        content: [{ type: 'text', text: 'Appointment booked successfully. See widget for details.' }],
        structuredContent: { booking: {
          service: args.service,
          management: args.management,
          date: formatDate(args.date),
          time: args.time,
          name: args.name,
          phone: args.phone
        } }
      };
    }
  );

  // ── TOOL 5: Get Appointments ────────────────────────────────
  registerAppTool(
    server,
    'get_appointments',
    {
      title: 'Get Appointments',
      description: 'Get upcoming appointments, optionally filtered by date',
      inputSchema: {
        date: z.string().optional().describe('Optional date filter YYYY-M-D'),
      },
      _meta: {
        ui: { resourceUri: 'ui://widget/booking.html' },
      },
    },
    async ({ date }) => {
      let appointments = await getAppointments(date);
      return {
        content: [{ type: 'text', text: 'Appointments loaded; see widget.' }],
        structuredContent: { appointments }
      };
    }
  );

  // ── TOOL 6: Cancel Appointment ──────────────────────────────
  registerAppTool(
    server,
    'cancel_appointment',
    {
      title: 'Cancel Appointment',
      description: 'Cancel an existing appointment by ID',
      inputSchema: {
        appointment_id: z.string().describe('The UUID of the appointment to cancel'),
      },
      _meta: {
        ui: { resourceUri: 'ui://widget/booking.html' },
      },
    },
    async ({ appointment_id }) => {
      const existing = await getAppointmentById(appointment_id);
      const cancelled = await cancelAppointment(appointment_id);
      sendSMS(existing.phone, cancellationMessage(existing));
      return {
        content: [{ type: 'text', text: 'Appointment canceled; update shown in widget.' }],
        structuredContent: { appointment: cancelled }
      };
    }
  );

  return server;
}

// ─── /mcp ENDPOINT (Streamable HTTP) ─────────────────────────
// ChatGPT connects here — NOT /sse anymore
app.options('/mcp', (req, res) => {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, mcp-session-id',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id',
  });
  res.end();
});

app.all('/mcp', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

  const server = createBookEaseServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — works best with ChatGPT
    enableJsonResponse: true,
  });

  res.on('close', () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// ─── START ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 BookEase MCP Server running on port ${PORT}`);
  console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`💊 Health check: http://localhost:${PORT}/`);
  console.log(`\n✅ Ready for ChatGPT Plus connections!\n`);
});
