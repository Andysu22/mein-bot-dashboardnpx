import mongoose from "mongoose";

const schema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  // --- Basis ---
  ticketsEnabled: { type: Boolean, default: true },
  ticketLanguage: { type: String, default: "en" },
  botNickname: { type: String, default: null },
  
  logChannelId: { type: String, default: null },
  supportRoleId: { type: String, default: null },
  ticketCategoryId: { type: String, default: null },
  adminRoles: [String],

  // --- PANEL (Der kritische Teil) ---
  panelChannelId: { type: String, default: null },
  panelMessageId: { type: String, default: null },

  panelButtonText: { type: String, default: "Ticket erstellen" },
  panelButtonStyle: { type: String, default: "Primary" },
  
  // FIX: 'Mixed' sorgt dafür, dass Mongoose dieses Objekt NICHT filtert
  panelEmbed: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {
      title: "Support Ticket",
      description: "Klicke auf den Button, um ein Ticket zu öffnen.",
      color: "#5865F2",
      footer: { text: "Support System" }
    }
  },

  modalTitle: { type: String, default: "Ticket erstellen" },
  ticketWelcomeMessage: { type: String, default: "Hallo {user}, wie können wir dir helfen?" },

  // --- Ticket Form ---
  ticketForm: {
    mode: { type: String, enum: ["default", "custom"], default: "default" },
    version: { type: Number, default: 1 },
    botCode: { type: String, default: null },
    builderData: { type: mongoose.Schema.Types.Mixed, default: null },
  },

  // --- Andere Module ---
  deeplApiKey: { type: String, default: null },
  tempVcEnabled: { type: Boolean, default: false },
  creatorChannelId: { type: String, default: null },
  tempCategoryChannelId: { type: String, default: null },
  tempVcAdminRoleId: { type: String, default: null },

  appPanelChannelId: { type: String, default: null },
  appReviewChannelId: { type: String, default: null },
  appPanelMessageId: { type: String, default: null },
  applicantRoleId: { type: String, default: null },
  appStaffRoleId: { type: String, default: null },
  appDeclineCooldownDays: { type: Number, default: 7 },
  
  enabledCommands: { type: [String], default: ["help", "ping"] },
}, { minimize: false }); // WICHTIG: minimize: false verhindert, dass leere Objekte gelöscht werden

// Trick: Lösche das Modell aus dem Cache, falls es existiert (hilft im Dev Mode)
if (mongoose.models && mongoose.models.GuildSettings) {
    delete mongoose.models.GuildSettings;
}

export const GuildSettings = mongoose.model("GuildSettings", schema);