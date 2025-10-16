import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  googleId: String,
  username: String,
  email: String,
  photo: String,
});

export default mongoose.model("User", userSchema);
