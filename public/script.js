fetch('/user')
  .then(res => res.json())
  .then(user => {
    document.getElementById('user-email').textContent = user.email;
    if (user.photo) {
      document.getElementById('profile-pic').src = user.photo;
    }
  })
  .catch(() => console.log("Not logged in"));
