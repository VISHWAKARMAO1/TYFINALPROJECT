// app.js — handles frontend auth simulation, routing protections, and dashboard rendering
(function(){
  'use strict';

  // Utility helpers
  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  // Auth storage keys (unified with auth.html)
  const USERS_KEY = 'users';
  const CURRENT_KEY = 'drpdf_currentUser';

  // Save user list
  function getUsers(){ return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  function setUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  // setCurrent: store current user and mark authenticated; if persist==true store in localStorage, otherwise sessionStorage
  function setCurrent(user, persist=true){
    try{ localStorage.setItem(CURRENT_KEY, JSON.stringify(user)); }catch(e){}
    try{
      if(persist){ localStorage.setItem('isAuthenticated','true'); if(user && user.email) localStorage.setItem('loggedInUser', user.email); }
      else { sessionStorage.setItem('isAuthenticated','true'); if(user && user.email) sessionStorage.setItem('loggedInUser', user.email); }
    }catch(e){}
  }
  function getCurrent(){ return JSON.parse(localStorage.getItem(CURRENT_KEY) || 'null'); }
  function clearCurrent(){ try{ localStorage.removeItem(CURRENT_KEY); localStorage.removeItem('isAuthenticated'); localStorage.removeItem('loggedInUser'); sessionStorage.removeItem('isAuthenticated'); sessionStorage.removeItem('loggedInUser'); localStorage.removeItem('isDemo'); sessionStorage.removeItem('isDemo'); }catch(e){} }
  function isAuthenticated(){ return (localStorage.getItem('isAuthenticated') === 'true') || (sessionStorage.getItem('isAuthenticated') === 'true'); }

  // Page-specific init
  document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    // Reflect auth/demo state on body for CSS hooks
    try{ body.classList.toggle('demo-mode', localStorage.getItem('isDemo') === 'true'); }catch(e){}
    try{ body.classList.toggle('authenticated', (localStorage.getItem('isAuthenticated') === 'true') || (sessionStorage.getItem('isAuthenticated') === 'true')); }catch(e){}
    // Global auth guard: if visiting protected pages (dashboard or tools) and not authenticated, redirect to auth.
    const toolPages = ['merge.html','split.html','compress.html','extract.html','encrypt.html','decrypt.html','ocr.html','watermark.html','editor.html'];
    const protectedPages = ['dashboard.html', ...toolPages];
    const path = (window.location.pathname || '').split('/').pop();
    const demoMode = localStorage.getItem('isDemo') === 'true';

    // If user hits a tool page while in demo mode or not authenticated, redirect to auth
    if (toolPages.includes(path)){
      if (!isAuthenticated() || demoMode){
        // notify demo users briefly before redirect (optional)
        if (demoMode){ try{ alert('Please log in to use this tool.'); }catch(e){} }
        window.location.replace('auth.html');
        return;
      }
    }

    // Protect dashboard: require authentication
    if (path === 'dashboard.html' && !isAuthenticated()){
      window.location.replace('auth.html');
      return;
    }

    if (body.classList.contains('page-auth')) initAuthPage();
    if (body.classList.contains('page-dashboard')) initDashboard();
  });

  // Auth page logic
  function initAuthPage(){
    // If already authenticated, redirect to dashboard
    if(isAuthenticated()){
      window.location.replace('dashboard.html');
      return;
    }
    // tabs
    const tabLogin = qs('#tab-login');
    const tabRegister = qs('#tab-register');
    const loginPane = qs('#loginPane');
    const registerPane = qs('#registerPane');
    const gotoRegister = qs('#gotoRegister');
    const gotoLogin = qs('#gotoLogin');

    function showLogin(e){ e && e.preventDefault(); tabLogin.classList.add('active'); tabRegister.classList.remove('active'); loginPane.classList.add('active'); registerPane.classList.remove('active'); }
    function showRegister(e){ e && e.preventDefault(); tabRegister.classList.add('active'); tabLogin.classList.remove('active'); registerPane.classList.add('active'); loginPane.classList.remove('active'); }

    tabLogin.addEventListener('click', showLogin);
    tabRegister.addEventListener('click', showRegister);
    gotoRegister.addEventListener('click', showRegister);
    gotoLogin.addEventListener('click', showLogin);

    // Prefill remembered username if any
    const remembered = localStorage.getItem('rememberedUser');
    if (remembered){ const el = qs('#loginId'); if(el) el.value = remembered; }

    // Register
    const regForm = qs('#registerForm');
    regForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fullName = qs('#regFullName').value.trim();
      const email = qs('#regEmail').value.trim().toLowerCase();
      const username = qs('#regUsername').value.trim();
      const password = qs('#regPassword').value;
      const confirm = qs('#regConfirm').value;
      if (!fullName || !email || !username || !password) return alert('Please fill all fields');
      if (password !== confirm) return alert('Passwords do not match');

      const users = getUsers();
  if (users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase())) return alert('Username already taken');
  if (users.find(u => u.email && u.email.toLowerCase() === email)) return alert('Email already registered');

      const user = { fullName, email, username, password };
      users.push(user);
      setUsers(users);
      setCurrent(user);
      // ensure demo flag cleared after registration
      try{ localStorage.removeItem('isDemo'); sessionStorage.removeItem('isDemo'); }catch(e){}
      // redirect to dashboard
      window.location.href = 'dashboard.html';
    });

    // Login
    const loginForm = qs('#loginForm');
    const loginError = qs('#loginError');
    const rememberEl = qs('#rememberMe');
    if(loginForm){
      loginForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const id = (qs('#loginId').value || '').trim();
        const pass = qs('#loginPassword').value;
        const idNorm = id.toLowerCase();
        const users = getUsers();
        const user = users.find(u => (
          (u.username && u.username.toLowerCase() === idNorm) ||
          (u.email && u.email.toLowerCase() === idNorm)
        ) && (u.password === pass));
        if (!user){
          if(loginError){
            loginError.textContent = 'Invalid username or password!';
            loginError.style.display = 'block';
            loginError.classList.add('shake');
            setTimeout(()=> loginError.classList.remove('shake'), 400);
            // hide after 4s
            setTimeout(()=>{ if(loginError) loginError.style.display='none'; }, 4000);
          } else {
            alert('Invalid credentials');
          }
          return;
        }

        // remember-me handling and persistence: if remember checked, persist auth in localStorage; otherwise session-only
        try{
          if(rememberEl && rememberEl.checked){ localStorage.setItem('rememberedUser', id); }
          else { localStorage.removeItem('rememberedUser'); }
        }catch(e){}

        setCurrent(user, (rememberEl && rememberEl.checked) ? true : false);
        // successful login: ensure demo flag is cleared
        try{ localStorage.removeItem('isDemo'); sessionStorage.removeItem('isDemo'); }catch(e){}
        window.location.href = 'dashboard.html';
      });
    }
  }

  // Dashboard logic
  function initDashboard(){
    const current = getCurrent();
    if (!isAuthenticated() || !current){
      // Not authenticated — redirect to auth page
      window.location.replace('auth.html');
      return;
    }

  // Show username (support both camelCase fullName and lowercase fullname stored by other scripts)
  const welcome = qs('#welcomeText');
  const displayName = (current && (current.fullName || current.fullname || current.username || current.email)) || '';
  if (welcome) welcome.textContent = `Welcome, ${displayName}`;

    // Logout
    const logoutBtn = qs('#logoutBtn');
    if(logoutBtn){
      logoutBtn.addEventListener('click', () => {
        clearCurrent();
        // replace so back button won't return to protected page
        window.location.replace('auth.html');
      });
    }

    // Populate tools
    const tools = [
      {id:'merge', title:'Merge PDF', desc:'Combine multiple PDF files into one document.', icon:'🔀'},
      {id:'split', title:'Split PDF', desc:'Split a PDF into multiple pages or documents.', icon:'✂️'},
      {id:'compress', title:'Compress PDF', desc:'Reduce PDF file size for sharing.', icon:'🗜️'},
      {id:'extract', title:'Extract Images', desc:'Extract images embedded in PDFs.', icon:'🖼️'},
      {id:'encrypt', title:'Encrypt PDF', desc:'Add password protection to PDFs.', icon:'🔒'},
      {id:'decrypt', title:'Decrypt PDF', desc:'Remove password protection from PDFs.', icon:'🔓'},
      {id:'ocr', title:'OCR', desc:'Recognize text from scanned PDFs.', icon:'📝'},
      {id:'watermark', title:'Watermark', desc:'Add image/text watermark to PDFs.', icon:'💧'},
      {id:'editor', title:'PDF Editor', desc:'Edit pages, text and annotations.', icon:'🧩'},
    ];

    const grid = qs('#toolGrid');
    grid.innerHTML = '';
    tools.forEach(t => {
      const card = document.createElement('div');
      card.className = 'tool-card';
      card.innerHTML = `
        <div class="t-icon">${t.icon}</div>
        <h3>${t.title}</h3>
        <p class="muted">${t.desc}</p>
        <div class="tool-actions"><a class="btn btn-primary" href="#" data-tool="${t.id}">Open Tool</a></div>
      `;
      grid.appendChild(card);
    });

    // Optionally handle click on tools to open placeholders
    grid.addEventListener('click', (ev) => {
      const a = ev.target.closest('a[data-tool]');
      if (!a) return;
      ev.preventDefault();
      const tool = a.dataset.tool;
      // If demo mode, block access and force login
      const demoModeNow = localStorage.getItem('isDemo') === 'true';
      if (demoModeNow){ try{ alert('Please log in to use this tool.'); }catch(e){}; window.location.replace('auth.html'); return; }
      // Normal users: open placeholder
      alert(`Opening ${tool} — tool pages are placeholders in this demo.`);
    });
  }

  // Expose for debugging (optional)
  window.drpApp = { getUsers, setUsers, getCurrent, setCurrent, clearCurrent, isAuthenticated };

})();
