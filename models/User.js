import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true },
  username: String,
  email: { type: String, unique: false, sparse: true },
  photo: String,
  points: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
