import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  accentColor: { type: String, default: "#5865F2" }, // Standard Blurple
  theme: { type: String, default: "dark" }, // NEU: Theme speichern
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model("User", userSchema);