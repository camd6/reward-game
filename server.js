const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const usersFile = path.join(__dirname, 'users.json');
let users = [];

if (fs.existsSync(usersFile)) {
  users = JSON.parse(fs.readFileSync(usersFile));
}

function saveUsers() {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  let user = users.find(u => u.username === username);

  if (!user) {
    user = { username, password, points: 0 };
    users.push(user);
    saveUsers();
    return res.json({ success: true, points: 0 });
  }

  if (user.password !== password) {
    return res.json({ success: false, message: 'Wrong password!' });
  }

  return res.json({ success: true, points: user.points });
});

io.on('connection', (socket) => {
  socket.emit('updateLeaderboard', users);

  socket.on('addPoints', (username) => {
    const user = users.find(u => u.username === username);
    if (user) {
      user.points++;
      saveUsers();
      io.emit('updateLeaderboard', users);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port ' + PORT));
