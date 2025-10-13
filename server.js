const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let playerPoints = {};

io.on('connection', (socket) => {
  console.log('New player:', socket.id);
  playerPoints[socket.id] = 0;

  socket.emit('updatePoints', playerPoints[socket.id]);

  socket.on('earnPoints', (amount) => {
    playerPoints[socket.id] += amount;
    io.emit('updatePoints', playerPoints[socket.id]);
  });

  socket.on('disconnect', () => {
    delete playerPoints[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));