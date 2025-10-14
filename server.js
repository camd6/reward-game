
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this';
const COOKIE_NAME = 'rpg_token';

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error', err));

app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || 'cookie_secret'));
app.use(express.static(path.join(__dirname, 'public')));

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts, try later.' }
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = new User({
        username: profile.displayName.replace(/\\s+/g,'_').toLowerCase(),
        email: profile.emails && profile.emails[0] && profile.emails[0].value,
        googleId: profile.id,
        points: 0
      });
      await user.save();
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));
app.use(passport.initialize());

function signToken(user) {
  return jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
}
async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id).select('-passwordHash');
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Auth failed' });
  }
}

app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password) return res.json({ success: false, message: 'Missing fields' });
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.json({ success: false, message: 'Username or email taken' });
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ username, email, passwordHash: hash, points: 0 });
    await user.save();
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7*24*3600*1000 });
    return res.json({ success: true, user: { username: user.username, points: user.points } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.json({ success: false, message: 'Invalid creds' });
    if (!user.passwordHash) return res.json({ success: false, message: 'Use Google Sign-In' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.json({ success: false, message: 'Invalid creds' });
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7*24*3600*1000 });
    return res.json({ success: true, user: { username: user.username, points: user.points } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  return res.json({ success: true });
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ success: true, user: { username: req.user.username, points: req.user.points } });
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/' }), (req, res) => {
  const token = signToken(req.user);
  res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7*24*3600*1000 });
  res.redirect('/');
});

io.use(async (socket, next) => {
  try {
    const cookies = socket.request.headers.cookie || '';
    const parsed = Object.fromEntries(cookies.split(';').map(s => s.trim().split('=').map(decodeURIComponent)));
    const token = parsed['rpg_token'];
    if (!token) return next(new Error('Auth error'));
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return next(new Error('Auth error'));
    socket.user = user;
    return next();
  } catch (err) {
    return next(new Error('Auth error'));
  }
});

io.on('connection', (socket) => {
  console.log('Socket connected', socket.user.username);

  socket.on('earn', async (amount = 1) => {
    try {
      socket.user.points += Number(amount);
      await socket.user.save();
      const top = await User.find({}).select('username points -_id').sort({ points: -1 }).limit(50);
      io.emit('leaderboard', top);
      socket.emit('points', socket.user.points);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.user.username);
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => console.log('Server running on', PORT));
