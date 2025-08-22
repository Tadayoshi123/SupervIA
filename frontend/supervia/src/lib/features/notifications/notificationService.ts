'use client';

import axios from 'axios';

const NOTIF_API_URL = process.env.NEXT_PUBLIC_NOTIFICATION_API_URL || 'http://localhost:3004';

const createAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  } as Record<string, string>;
};

export type SendEmailPayload = {
  to?: string; // optionnel: le backend utilisera NOTIF_DEFAULT_TO si absent
  subject: string;
  text: string;
  html?: string;
};

const sendEmail = async ({ to, subject, text, html }: SendEmailPayload) => {
  const url = `${NOTIF_API_URL}/api/notifications/email/send`;
  const payload: Record<string, unknown> = { subject, text };
  if (html) payload.html = html;
  if (to && to.trim().length > 0) payload.to = to.trim();

  await axios.post(url, payload, { headers: createAuthHeaders() });
};

const notificationService = { sendEmail };
export default notificationService;


