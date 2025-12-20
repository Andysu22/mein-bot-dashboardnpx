// src/models/Ticket.js
import mongoose from 'mongoose';

const TicketSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  ownerId: { type: String, required: true },
  status: { type: String, default: 'open' }, // open, closed
  category: { type: String, default: 'support' },
  language: { type: String, default: 'en' }, // NEU: Speichert die Sprache des Tickets
  issue: { type: String, default: '' },
  controlMessageId: { type: String },
  claimedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
  deleteAt: { type: Date } // Wann der Channel gelöscht wird
});

export const Ticket = mongoose.model('Ticket', TicketSchema);