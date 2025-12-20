import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  note: { type: String, default: '' } // Z.B. "Kunde XY"
});

// WICHTIG: Der Check "mongoose.models.Whitelist || ..." verhindert Abstürze
export const Whitelist = mongoose.models.Whitelist || mongoose.model('Whitelist', schema);