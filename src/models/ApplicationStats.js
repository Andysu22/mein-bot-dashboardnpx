import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  totalApplications: { type: Number, default: 0 }
});

// Cache-Fix für Hot-Reloading
if (mongoose.models && mongoose.models.ApplicationStats) {
    delete mongoose.models.ApplicationStats;
}

export const ApplicationStats = mongoose.model('ApplicationStats', schema);