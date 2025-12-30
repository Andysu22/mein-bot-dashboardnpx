import mongoose from "mongoose";

const schema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  // --- Basis Einstellungen ---
  ticketsEnabled: { type: Boolean, default: true },
  ticketLanguage: { type: String, default: "en" },
  botNickname: { type: String, default: null },

  // --- Channel & Rollen IDs ---
  logChannelId: { type: String, default: null },
  supportRoleId: { type: String, default: null },
  ticketCategoryId: { type: String, default: null },
  adminRoles: [String],

  // --- TICKET PANEL EINSTELLUNGEN ---
  panelChannelId: { type: String, default: null },
  panelMessageId: { type: String, default: null },
  panelButtonText: { type: String, default: "Ticket erstellen" },
  panelButtonStyle: { type: String, default: "Primary" },
  panelEmbed: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      title: "Support Ticket",
      description: "Klicke auf den Button, um ein Ticket zu öffnen.",
      color: "#5865F2",
      footer: { text: "Support System" },
      image_url: "https://dummyimage.com/600x200/2b2b2b/ffffff&text=Support"
    }
  },

  modalTitle: { type: String, default: "Ticket erstellen" },
  ticketWelcomeMessage: { type: String, default: "Hallo {user}, wie können wir dir helfen?" },

  // --- Ticket Formular ---
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

  // --- BEWERBUNGEN (APPLICATIONS) ---
  appPanelChannelId: { type: String, default: null },
  appReviewChannelId: { type: String, default: null },
  appPanelMessageId: { type: String, default: null },
  applicantRoleId: { type: String, default: null },
  appStaffRoleId: { type: String, default: null },
  appDeclineCooldownDays: { type: Number, default: 7 },

  // Design Felder für Bewerbungen
  appPanelButtonText: { type: String, default: "Bewerben" },
  appPanelButtonStyle: { type: String, default: "Success" },
  appPanelEmbed: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      title: "Jetzt Bewerben",
      description: "Klicke auf den Button, um dich zu bewerben.",
      color: "#248046",
      footer: { text: "Bewerbungssystem" },
      image_url: "https://dummyimage.com/600x200/2b2b2b/ffffff&text=Bewerbung"
    }
  },

  // ✅ NEU: Review Embed Design
  appReviewEmbed: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      title: "Neue Bewerbung",
      description: "Von: {user}\n\n**IGN:** {field:app_ign}\n**Motivation:** {field:app_motivation}",
      color: "#5865F2",
      timestamp: true
    }
  },

  // Formular für Bewerbungen
  applicationForm: {
    mode: { type: String, enum: ["default", "custom"], default: "default" },
    version: { type: Number, default: 1 },
    botCode: { type: String, default: null },
    builderData: { type: mongoose.Schema.Types.Mixed, default: null },
  },

  // Antwort Konfiguration (Text oder Embed)
  appResponse: {
    mode: { type: String, enum: ["text", "embed"], default: "text" },
    content: { type: String, default: "Deine Bewerbung ist eingegangen! Wir melden uns." },
    embed: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        title: "Bewerbung abgesendet",
        description: "Danke {user}, wir haben deine Bewerbung erhalten.",
        color: "#57F287"
      }
    }
  },

  enabledCommands: { type: [String], default: ["help", "ping"] },
}, { minimize: false });

// Cache-Fix für Hot-Reloading
if (mongoose.models && mongoose.models.GuildSettings) {
  delete mongoose.models.GuildSettings;
}

export const GuildSettings = mongoose.model("GuildSettings", schema);
