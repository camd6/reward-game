async function apiJSON(url, opts={}) {
  const res = await fetch(url, Object.assign({ credentials: 'same-origin' }, opts));
  if (!res.ok) throw new Error('Network error');
  return res.json();
}

async function init() {
  try {
    const user = await apiJSON('/user');
    document.getElementById('displayName').textContent = user.username || 'User';
    document.getElementById('displayEmail').textContent = user.email || '';
    const pic = user.photo || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    document.getElementById('profilePic').src = pic;
    document.getElementById('profilePicLarge').src = pic;
    document.getElementById('welcome').textContent = `Welcome, ${user.username}`;
    document.getElementById('points').textContent = user.points || 0;
  } catch (err) {
    window.location = '/';
    return;
  }

  await loadLeaderboard();

  document.getElementById('earnBtn').addEventListener('click', async () => {
    try {
      const data = await apiJSON('/api/add-points', { method: 'POST' });
      document.getElementById('points').textContent = data.points;
      await loadLeaderboard();
    } catch (e) { console.error(e); }
  });

  // delete account modal
  const deleteBtn = document.getElementById('deleteAccount');
  const confirmModal = document.getElementById('confirmModal');
  const confirmDelete = document.getElementById('confirmDelete');
  const cancelDelete = document.getElementById('cancelDelete');

  deleteBtn.addEventListener('click', ()=> confirmModal.style.display = 'flex');
  cancelDelete.addEventListener('click', ()=> confirmModal.style.display = 'none');

  confirmDelete.addEventListener('click', async ()=>{
    try {
      const res = await fetch('/api/delete-account', { method: 'DELETE', credentials: 'same-origin' });
      const json = await res.json();
      if (json.success) {
        alert('Account deleted');
        window.location = '/';
      } else {
        alert('Delete failed');
      }
    } catch (e) { alert('Server error'); }
  });
}

async function loadLeaderboard(){
  try {
    const list = await apiJSON('/api/leaderboard');
    const ul = document.getElementById('leaderboardList');
    ul.innerHTML = '';
    list.forEach(u=>{
      const li = document.createElement('li');
      li.textContent = `${u.username} — ${u.points} pts`;
      ul.appendChild(li);
    });
  } catch(e){ console.error(e); }
}

init();
