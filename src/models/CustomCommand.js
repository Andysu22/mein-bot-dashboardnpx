import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "Ein Custom Command" },
    
    // NEU: Typ der Antwort
    type: { type: String, enum: ['text', 'embed', 'modal'], default: 'text' },

    // Inhalt (Bei Text = Nachricht, Bei Modal = Der BOT:v1 Code)
    response: { type: String, required: true },
    
    // Optionen
    ephemeral: { type: Boolean, default: false },
    
    // NEU: Damit man das Modal im Dashboard wieder bearbeiten kann,
    // speichern wir hier die Konfiguration des Builders (JSON)
    builderData: { type: mongoose.Schema.Types.Mixed, default: null },
    
    createdAt: { type: Date, default: Date.now }
});

schema.index({ guildId: 1, name: 1 }, { unique: true });

// Check, ob model schon existiert (wichtig für Next.js Hot Reloading)
export default mongoose.models.CustomCommand || mongoose.model('CustomCommand', schema);