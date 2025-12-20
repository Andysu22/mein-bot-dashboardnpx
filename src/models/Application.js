// src/models/Application.js
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },

  // pending | accepted | declined
  status: { type: String, default: 'pending' },

  // Gespeicherte Antworten aus dem Formular
  ign: { type: String, default: null },
  power: { type: String, default: null },    // NEU: Vorher 'age' oder fehlte
  activity: { type: String, default: null }, // NEU: Fehlte vorher
  motivation: { type: String, default: null },

  // Referenz zur Nachricht im Admin-Channel (wichtig für Updates/Löschen)
  reviewChannelId: { type: String, default: null }, // Optional, falls man den Channel später sucht
  reviewMessageId: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
  reapplyAt: { type: Date, default: null } // Cooldown-Zeitstempel
});

// Verhindert, dass ein User mehrere aktive Einträge auf demselben Server hat (Unique Index)
schema.index({ guildId: 1, userId: 1 }, { unique: true });

export const Application = mongoose.model('Application', schema);