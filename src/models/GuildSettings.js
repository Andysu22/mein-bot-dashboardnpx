// src/models/GuildSettings.js (Dashboard)
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  // Tickets
  logChannelId: { type: String, default: null },
  supportRoleId: { type: String, default: null },
  ticketCategoryId: { type: String, default: null },
  ticketLanguage: { type: String, default: "en" },
  panelChannelId: { type: String, default: null },
  panelMessageId: { type: String, default: null },
  deeplApiKey: { type: String, default: null },
  adminRoles: [String],
  ticketsEnabled: { type: Boolean, default: true },

  // Ticket Form (optional override via Modal Builder)
  ticketForm: {
    mode: { type: String, enum: ["default", "custom"], default: "default" },
    version: { type: Number, default: 1 },
    botCode: { type: String, default: null },
    builderData: { type: Object, default: null },
    submitTemplate: { type: String, default: null },

    // Embed that will be sent inside the created ticket channel
    ticketEmbed: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      color: { type: String, default: "#5865F2" },
      includeFields: { type: Boolean, default: true },
    },
  },

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

export const GuildSettings = mongoose.models.GuildSettings || mongoose.model("GuildSettings", schema);
