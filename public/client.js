const msg = document.getElementById("msg");
const game = document.getElementById("game");
const auth = document.getElementById("auth");
const userEl = document.getElementById("user");
const pointsEl = document.getElementById("points");
const leaderboardEl = document.getElementById("leaderboard");

const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const earnBtn = document.getElementById("earn");
const logoutBtn = document.getElementById("logout");

let socket;

// helper: show message
function showMsg(text, isError = false) {
  msg.textContent = text;
  msg.style.color = isError ? "red" : "green";
}

// check if user is logged in
async function checkAuth() {
  const res = await fetch("/api/me");
  const data = await res.json();
  if (data.success) {
    showGame(data.user);
  }
}

// show game area
function showGame(user) {
  auth.style.display = "none";
  game.style.display = "block";
  userEl.textContent = user.username;
  pointsEl.textContent = user.points;
  connectSocket();
}

// connect to socket.io for live leaderboard
function connectSocket() {
  socket = io();
  socket.on("leaderboard", (data) => {
    leaderboardEl.innerHTML = "";
    data.forEach((entry, i) => {
      const li = document.createElement("li");
      li.textContent = `${i + 1}. ${entry.username} - ${entry.points}`;
      leaderboardEl.appendChild(li);
    });
  });
  socket.on("points", (p) => (pointsEl.textContent = p));
}

registerBtn.onclick = async () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const email = document.getElementById("email").value.trim();

  if (!username || !password) return showMsg("Missing fields", true);

  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, email }),
  });

  const data = await res.json();
  if (data.success) {
    showMsg("Registered successfully!");
    showGame(data.user);
  } else {
    showMsg(data.message || "Registration failed", true);
  }
};

loginBtn.onclick = async () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!username || !password) return showMsg("Missing fields", true);

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (data.success) {
    showMsg("Logged in successfully!");
    showGame(data.user);
  } else {
    showMsg(data.message || "Login failed", true);
  }
};

earnBtn.onclick = () => {
  if (socket) socket.emit("earn", 1);
};

logoutBtn.onclick = async () => {
  await fetch("/api/logout", { method: "POST" });
  socket?.disconnect();
  game.style.display = "none";
  auth.style.display = "block";
  showMsg("Logged out.");
};

checkAuth();
