import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  username: { type: String, required: true },
  email: { type: String },
  photo: { type: String },
  points: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
