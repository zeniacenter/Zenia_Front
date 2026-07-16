import { io } from 'socket.io-client';

let socket;

export function getWhatsAppSocket() {
  if (!socket) socket = io(import.meta.env.VITE_WHATSAPP_URL || 'http://localhost:3100', { transports: ['websocket', 'polling'], autoConnect: false });
  return socket;
}
