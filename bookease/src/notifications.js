// src/notifications.js
// ─── SMS Notifications via Termii (Nigeria) ──────────────────

import axios from 'axios';
import 'dotenv/config';

const TERMII_URL = 'https://api.ng.termii.com/api/sms/send';

export async function sendSMS(phone, message) {
  // Skip if no API key configured
  if (!process.env.TERMII_API_KEY) {
    console.log(`[SMS SKIPPED - No API key] To: ${phone} | Msg: ${message}`);
    return;
  }

  // Format Nigerian phone numbers (08012345678 → 2348012345678)
  let formatted = phone.replace(/\s+/g, '');
  if (formatted.startsWith('0')) {
    formatted = '234' + formatted.slice(1);
  }

  try {
    await axios.post(TERMII_URL, {
      to: formatted,
      from: process.env.TERMII_SENDER_ID || 'BookEase',
      sms: message,
      type: 'plain',
      channel: 'generic',
      api_key: process.env.TERMII_API_KEY,
    });
    console.log(`✅ SMS sent to ${formatted}`);
  } catch (err) {
    // Don't crash the app if SMS fails
    console.error(`❌ SMS failed: ${err.message}`);
  }
}

// ─── MESSAGE TEMPLATES ────────────────────────────────────────

export function bookingConfirmationMessage(appt) {
  return `Hi ${appt.customer_name}! Your appointment is confirmed ✅\n\nService: ${appt.service}\nStaff: ${appt.staff}\nDate: ${appt.date}\nTime: ${appt.time}\nPrice: ${appt.service_price}\n\nReply CANCEL to cancel. - ${process.env.BUSINESS_NAME || 'BookEase'}`;
}

export function bookingReminderMessage(appt) {
  return `Hi ${appt.customer_name}! Reminder: You have a ${appt.service} appointment with ${appt.staff} TODAY at ${appt.time} 🕐\n\n- ${process.env.BUSINESS_NAME || 'BookEase'}`;
}

export function cancellationMessage(appt) {
  return `Hi ${appt.customer_name}, your ${appt.service} appointment on ${appt.date} at ${appt.time} has been cancelled. Book again anytime! - ${process.env.BUSINESS_NAME || 'BookEase'}`;
}
