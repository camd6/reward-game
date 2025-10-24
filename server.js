import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "./models/User.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI not set. Set it in Render environment variables.");
}

mongoose.connect(process.env.MONGO_URI || "", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(()=>console.log("MongoDB connected"))
  .catch(err=>console.error("MongoDB connection error:", err && err.message));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production", maxAge: 24*60*60*1000 }
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "https://reward-game.onrender.com/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        username: profile.displayName || (profile.emails && profile.emails[0] && profile.emails[0].value) || "User",
        email: profile.emails && profile.emails[0] && profile.emails[0].value,
        photo: profile.photos && profile.photos[0] && profile.photos[0].value,
        points: 0
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done)=> done(null, user.id));
passport.deserializeUser(async (id, done)=> {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

function ensureAuth(req, res, next){
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  res.redirect("/");
}

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    req.session.save(()=> res.redirect("/dashboard"));
  }
);

app.get("/logout", (req, res, next) => {
  req.logout(function(err){
    if (err) return next(err);
    res.redirect("/");
  });
});

app.get("/user", (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Not logged in" });
  const { username, email, photo, points } = req.user;
  res.json({ username, email, photo, points });
});

app.post("/api/add-points", ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.points = (user.points || 0) + 1;
    await user.save();
    res.json({ points: user.points });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const top = await User.find().select("username points photo -_id").sort({ points: -1 }).limit(10);
    res.json(top);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/delete-account", ensureAuth, async (req, res) => {
  try {
    await User.deleteOne({ _id: req.user.id });
    req.logout(()=>{});
    res.json({ success:true });
  } catch (err) {
    res.status(500).json({ success:false });
  }
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/dashboard", ensureAuth, (req, res) => res.sendFile(path.join(__dirname, "public", "dashboard.html")));

app.listen(PORT, ()=> console.log("Server running on", PORT));
