// src/models/TicketStats.js
import mongoose from 'mongoose';

const TicketStatsSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  date: { type: String, required: true }, // Format: "YYYY-MM-DD"
  opened: { type: Number, default: 0 },
  closed: { type: Number, default: 0 },
});

// Index für schnelles Suchen (Verhindert doppelte Einträge pro Tag)
TicketStatsSchema.index({ guildId: 1, date: 1 }, { unique: true });

// Check ob Model schon existiert (wichtig für Next.js Hot-Reloading)
export const TicketStats = mongoose.models.TicketStats || mongoose.model('TicketStats', TicketStatsSchema);