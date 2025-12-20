// src/models/AutopurgeRule.js
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true, unique: true },
  maxAgeDays: { type: Number, required: true, default: 7 }, // Nachrichten älter als X Tage löschen
  enabled: { type: Boolean, default: true }
});

export const AutopurgeRule = mongoose.model('AutopurgeRule', schema);