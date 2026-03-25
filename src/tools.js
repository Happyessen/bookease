// src/tools.js
// ─── All BookEase MCP Tools ────────────────────────────────────
// Each tool is what ChatGPT can "call" during a conversation.

import {
  getAppointments, getAppointmentById,
  createAppointment, cancelAppointment,
  getBookedSlots, getServices, getStaff
} from './db.js';

import {
  sendSMS, bookingConfirmationMessage,
  cancellationMessage
} from './notifications.js';

import {
  ALL_SLOTS, formatDate, isPastDate, ok, fail
} from './utils.js';

// ─────────────────────────────────────────────────────────────
// TOOL DEFINITIONS (what ChatGPT sees)
// ─────────────────────────────────────────────────────────────
export const toolDefinitions = [
  {
    name: 'get_services',
    description: 'Get all available services with their prices and durations. Call this when the user asks what services are available.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_staff',
    description: 'Get all available staff members. Call this when the user wants to choose who to book with.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_available_slots',
    description: 'Get available (free) time slots for a specific date and optionally a specific staff member.',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in format YYYY-M-D, e.g. 2026-3-25'
        },
        staff: {
          type: 'string',
          description: 'Optional staff name to filter by, e.g. Emeka'
        }
      },
      required: ['date']
    }
  },
  {
    name: 'book_appointment',
    description: 'Book an appointment after the user has chosen a service, staff, date, time, and provided their name and phone number.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_name: {
          type: 'string',
          description: 'Full name of the customer'
        },
        customer_phone: {
          type: 'string',
          description: 'Nigerian phone number e.g. 08012345678'
        },
        customer_notes: {
          type: 'string',
          description: 'Any special requests or notes (optional)'
        },
        service: {
          type: 'string',
          description: 'Name of the service e.g. Haircut'
        },
        service_duration: {
          type: 'string',
          description: 'Duration of the service e.g. 30 min'
        },
        service_price: {
          type: 'string',
          description: 'Price of the service e.g. ₦3,500'
        },
        staff: {
          type: 'string',
          description: 'Name of the staff member'
        },
        date: {
          type: 'string',
          description: 'Date in format YYYY-M-D'
        },
        time: {
          type: 'string',
          description: 'Time slot e.g. 10:00 AM'
        }
      },
      required: [
        'customer_name', 'customer_phone', 'service',
        'service_duration', 'service_price', 'staff', 'date', 'time'
      ]
    }
  },
  {
    name: 'get_appointments',
    description: 'Get all upcoming appointments, optionally filtered by date. Use this when the user asks to see their bookings or when checking a specific date.',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Optional date filter in format YYYY-M-D'
        },
        customer_phone: {
          type: 'string',
          description: 'Optional phone number to filter appointments by customer'
        }
      },
      required: []
    }
  },
  {
    name: 'cancel_appointment',
    description: 'Cancel an appointment by its ID. Always confirm with the user before cancelling.',
    inputSchema: {
      type: 'object',
      properties: {
        appointment_id: {
          type: 'string',
          description: 'The UUID of the appointment to cancel'
        }
      },
      required: ['appointment_id']
    }
  }
];

// ─────────────────────────────────────────────────────────────
// TOOL HANDLERS (what actually runs)
// ─────────────────────────────────────────────────────────────
export async function handleTool(name, args) {
  switch (name) {

    // ── 1. GET SERVICES ──────────────────────────────────────
    case 'get_services': {
      const services = await getServices();
      return ok({
        services,
        message: `We offer ${services.length} services. Here's what's available:`
      });
    }

    // ── 2. GET STAFF ─────────────────────────────────────────
    case 'get_staff': {
      const staff = await getStaff();
      return ok({
        staff,
        message: `Our team has ${staff.length} members available.`
      });
    }

    // ── 3. GET AVAILABLE SLOTS ───────────────────────────────
    case 'get_available_slots': {
      const { date, staff } = args;

      if (isPastDate(date)) {
        return fail('That date is in the past. Please choose a future date.');
      }

      const booked = await getBookedSlots(date, staff);
      const available = ALL_SLOTS.filter(s => !booked.includes(s));

      return ok({
        date,
        formatted_date: formatDate(date),
        staff: staff || 'any',
        available_slots: available,
        booked_slots: booked,
        message: available.length > 0
          ? `${available.length} slots available on ${formatDate(date)}.`
          : `No slots available on ${formatDate(date)}. Try another date.`
      });
    }

    // ── 4. BOOK APPOINTMENT ──────────────────────────────────
    case 'book_appointment': {
      const {
        customer_name, customer_phone, customer_notes,
        service, service_duration, service_price,
        staff, date, time
      } = args;

      if (isPastDate(date)) {
        return fail('Cannot book a past date. Please choose a future date.');
      }

      // Create in database
      const appointment = await createAppointment({
        customer_name, customer_phone, customer_notes,
        service, service_duration, service_price,
        staff, date, time
      });

      // Send SMS confirmation (non-blocking)
      sendSMS(customer_phone, bookingConfirmationMessage(appointment));

      return ok({
        appointment,
        message: `✅ Appointment confirmed! ${customer_name}'s ${service} with ${staff} on ${formatDate(date)} at ${time}. An SMS confirmation has been sent to ${customer_phone}.`
      });
    }

    // ── 5. GET APPOINTMENTS ───────────────────────────────────
    case 'get_appointments': {
      const { date, customer_phone } = args;
      let appointments = await getAppointments(date);

      // Filter by phone if provided
      if (customer_phone) {
        appointments = appointments.filter(a =>
          a.customer_phone.replace(/\s/g, '') === customer_phone.replace(/\s/g, '')
        );
      }

      return ok({
        appointments,
        count: appointments.length,
        message: appointments.length > 0
          ? `Found ${appointments.length} appointment(s).`
          : 'No appointments found.'
      });
    }

    // ── 6. CANCEL APPOINTMENT ─────────────────────────────────
    case 'cancel_appointment': {
      const { appointment_id } = args;

      // Fetch first so we can send SMS
      const existing = await getAppointmentById(appointment_id);
      const cancelled = await cancelAppointment(appointment_id);

      // Send SMS notification
      sendSMS(existing.customer_phone, cancellationMessage(existing));

      return ok({
        appointment: cancelled,
        message: `❌ Appointment for ${existing.customer_name} on ${formatDate(existing.date)} at ${existing.time} has been cancelled. SMS sent to ${existing.customer_phone}.`
      });
    }

    default:
      return fail(`Unknown tool: ${name}`);
  }
}
