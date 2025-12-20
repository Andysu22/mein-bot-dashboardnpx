// src/models/GuildSettings.js (Dashboard Version)
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  // Tickets
  logChannelId: { type: String, default: null },
  supportRoleId: { type: String, default: null },
  ticketCategoryId: { type: String, default: null },
  ticketLanguage: { type: String, default: 'en' },
  panelChannelId: { type: String, default: null },
  panelMessageId: { type: String, default: null },
  deeplApiKey: { type: String, default: null },
  adminRoles: [String],
  ticketsEnabled: { type: Boolean, default: true },

  // TempVC
  tempVcEnabled: { type: Boolean, default: false },
  creatorChannelId: { type: String, default: null },
  tempCategoryChannelId: { type: String, default: null },
  tempVcAdminRoleId: { type: String, default: null },

  // Applications
  appPanelChannelId: { type: String, default: null },
  appReviewChannelId: { type: String, default: null },
  appPanelMessageId: { type: String, default: null },
  applicantRoleId: { type: String, default: null },
  appStaffRoleId: { type: String, default: null },
  appDeclineCooldownDays: { type: Number, default: 7 },
  translatorMinRoleId: { type: String, default: null },
  botNickname: { type: String, default: null },
});

// HIER IST DIE WICHTIGE  ÄNDERUNG:
// Wir prüfen erst, ob das Model schon existiert.
export const GuildSettings = mongoose.models.GuildSettings || mongoose.model('GuildSettings', schema);