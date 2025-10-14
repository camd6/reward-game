const socket = io();
const loginDiv = document.getElementById("login");
const gameDiv = document.getElementById("game");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const msg = document.getElementById("loginMsg");
const addPointsBtn = document.getElementById("addPoints");
const userDisplay = document.getElementById("user");
const pointsDisplay = document.getElementById("points");
const leaderboardList = document.getElementById("leaderboard");

let currentUser = null;

loginBtn.onclick = async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    msg.textContent = "Please fill both fields!";
    return;
  }

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (data.success) {
    currentUser = username;
    loginDiv.style.display = "none";
    gameDiv.style.display = "block";
    userDisplay.textContent = username;
    pointsDisplay.textContent = data.points;
  } else {
    msg.textContent = data.message;
  }
};

addPointsBtn.onclick = () => {
  socket.emit("addPoints", currentUser);
};

socket.on("updateLeaderboard", (users) => {
  leaderboardList.innerHTML = "";
  users
    .sort((a, b) => b.points - a.points)
    .forEach((u) => {
      const li = document.createElement("li");
      li.textContent = `${u.username}: ${u.points}`;
      leaderboardList.appendChild(li);
      if (u.username === currentUser) {
        pointsDisplay.textContent = u.points;
      }
    });
});
