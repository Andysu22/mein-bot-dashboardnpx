// src/models/Ticket.js (im Dashboard Projekt erstellen!)
import mongoose from 'mongoose';

const TicketSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  ownerId: { type: String, required: true },
  status: { type: String, default: 'open' },
  category: { type: String, default: 'support' },
  language: { type: String, default: 'en' },
  issue: { type: String, default: '' },
  controlMessageId: { type: String },
  claimedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
  deleteAt: { type: Date }
});

// Verhindert Fehler beim Hot-Reloading in Next.js
export const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);