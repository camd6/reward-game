async function $(s){return document.querySelector(s);}
    const socket = io();

    const authDiv = await $('#auth');
    const gameDiv = await $('#game');
    const username = await $('#username');
    const email = await $('#email');
    const password = await $('#password');
    const msg = await $('#msg');
    const userSpan = await $('#user');
    const pointsSpan = await $('#points');
    const registerBtn = await $('#registerBtn');
    const loginBtn = await $('#loginBtn');
    const earnBtn = await $('#earn');
    const logoutBtn = await $('#logout');
    const leaderboard = await $('#leaderboard');

    let currentUser = null;

    function showGame(user){ authDiv.style.display='none'; gameDiv.style.display='block'; userSpan.textContent=user.username; pointsSpan.textContent=user.points; currentUser=user.username; }

    registerBtn.onclick = async ()=>{
      const res = await fetch('/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:username.value,email:email.value,password:password.value})});
      const data = await res.json();
      if(data.success) showGame(data.user); else msg.textContent=data.message||'error';
    }

    loginBtn.onclick = async ()=>{
      const res = await fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:username.value,password:password.value})});
      const data = await res.json();
      if(data.success) showGame(data.user); else msg.textContent=data.message||'error';
    }

    logoutBtn.onclick = async ()=>{
      await fetch('/api/logout',{method:'POST'});
      location.reload();
    }

    earnBtn.onclick = ()=>{
      socket.emit('earn', 1);
    }

    socket.on('leaderboard', (list)=>{
      leaderboard.innerHTML='';
      list.forEach(u=>{
        const li=document.createElement('li');
        li.textContent=`${u.username}: ${u.points}`;
        leaderboard.appendChild(li);
      });
    });

    socket.on('points', p=>{ pointsSpan.textContent=p; });

    (async ()=>{
      const res = await fetch('/api/me');
      if(res.ok){
        const data = await res.json();
        if(data.success) showGame(data.user);
      }
    })();