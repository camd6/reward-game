const socket = io();
const pointsDisplay = document.getElementById('points');
const earnButton = document.getElementById('earn');

earnButton.addEventListener('click', () => {
  socket.emit('earnPoints', 10);
});

socket.on('updatePoints', (points) => {
  pointsDisplay.textContent = points;
});