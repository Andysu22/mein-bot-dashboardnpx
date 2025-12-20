import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  note: { type: String, default: '' } // Optional: Name vom Serverbesitzer oder so
});

export const Whitelist = mongoose.model('Whitelist', schema);