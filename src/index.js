// src/index.js
// ─── BookEase MCP Server — Fixed for ChatGPT Plus ─────────────
// Uses Streamable HTTP transport (ChatGPT requires /mcp endpoint)
// The old /sse transport has been deprecated by OpenAI

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

import {
  getAppointments, getAppointmentById,
  createAppointment, cancelAppointment,
  getBookedSlots, getServices, getStaff
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
    business: process.env.BUSINESS_NAME || 'BookEase Barbershop'
  });
});

// ─── CREATE MCP SERVER ────────────────────────────────────────
function createBookEaseServer() {
  const server = new McpServer({
    name: 'bookease',
    version: '1.0.0',
  });

  // ── TOOL 1: Get Services ────────────────────────────────────
  server.tool(
    'get_services',
    'Get all available services with prices and durations',
    {},
    async () => {
      const services = await getServices();
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, services }) }]
      };
    }
  );

  // ── TOOL 2: Get Staff ───────────────────────────────────────
  server.tool(
    'get_staff',
    'Get all available staff members',
    {},
    async () => {
      const staff = await getStaff();
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, staff }) }]
      };
    }
  );

  // ── TOOL 3: Get Available Slots ─────────────────────────────
  server.tool(
    'get_available_slots',
    'Get available time slots for a specific date and optional staff member',
    {
      date: z.string().describe('Date in format YYYY-M-D, e.g. 2026-3-25'),
      staff: z.string().optional().describe('Optional staff name, e.g. Emeka')
    },
    async ({ date, staff }) => {
      if (isPastDate(date)) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'That date is in the past.' }) }]
        };
      }
      const booked = await getBookedSlots(date, staff);
      const available = ALL_SLOTS.filter(s => !booked.includes(s));
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true, date,
          formatted_date: formatDate(date),
          available_slots: available,
          booked_slots: booked,
          message: available.length > 0
            ? `${available.length} slots available on ${formatDate(date)}.`
            : `No slots available on ${formatDate(date)}. Try another date.`
        })}]
      };
    }
  );

  // ── TOOL 4: Book Appointment ────────────────────────────────
  server.tool(
    'book_appointment',
    'Book an appointment after user has chosen service, staff, date, time, name and phone',
    {
      customer_name: z.string().describe('Full name of the customer'),
      customer_phone: z.string().describe('Phone number e.g. 08012345678'),
      customer_notes: z.string().optional().describe('Special requests (optional)'),
      service: z.string().describe('Service name e.g. Haircut'),
      service_duration: z.string().describe('Duration e.g. 30 min'),
      service_price: z.string().describe('Price e.g. ₦3,500'),
      staff: z.string().describe('Staff name e.g. Emeka'),
      date: z.string().describe('Date in format YYYY-M-D'),
      time: z.string().describe('Time slot e.g. 10:00 AM')
    },
    async (args) => {
      if (isPastDate(args.date)) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Cannot book a past date.' }) }]
        };
      }
      const appointment = await createAppointment(args);
      sendSMS(args.customer_phone, bookingConfirmationMessage(appointment));
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true, appointment,
          message: `✅ Booked! ${args.customer_name}'s ${args.service} with ${args.staff} on ${formatDate(args.date)} at ${args.time}.`
        })}]
      };
    }
  );

  // ── TOOL 5: Get Appointments ────────────────────────────────
  server.tool(
    'get_appointments',
    'Get all upcoming appointments, optionally filtered by date or customer phone',
    {
      date: z.string().optional().describe('Optional date filter YYYY-M-D'),
      customer_phone: z.string().optional().describe('Optional phone number filter')
    },
    async ({ date, customer_phone }) => {
      let appointments = await getAppointments(date);
      if (customer_phone) {
        appointments = appointments.filter(a =>
          a.customer_phone.replace(/\s/g, '') === customer_phone.replace(/\s/g, '')
        );
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, appointments, count: appointments.length }) }]
      };
    }
  );

  // ── TOOL 6: Cancel Appointment ──────────────────────────────
  server.tool(
    'cancel_appointment',
    'Cancel an appointment by its ID. Always confirm with user first.',
    {
      appointment_id: z.string().describe('The UUID of the appointment to cancel')
    },
    async ({ appointment_id }) => {
      const existing = await getAppointmentById(appointment_id);
      const cancelled = await cancelAppointment(appointment_id);
      sendSMS(existing.customer_phone, cancellationMessage(existing));
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true, appointment: cancelled,
          message: `❌ Cancelled: ${existing.customer_name}'s ${existing.service} on ${formatDate(existing.date)} at ${existing.time}.`
        })}]
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
