(() => {
  'use strict';
  const KEY = 'bookings:v1', AUTH = 'admin:auth';
  const AUTH_USER = 'jay', AUTH_PASS = 'jay181925'; // demo only: client-side checks are not real security
  const $ = s => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; } };
  const authed = () => { try { return sessionStorage.getItem(AUTH) === '1'; } catch { return false; } };
  const setAuth = v => { try { v ? sessionStorage.setItem(AUTH, '1') : sessionStorage.removeItem(AUTH); } catch {} };

  // Duration options: 45 minutes to 3 hours for VR demo bookings
  const dur = $('#duration');
  for (let m = 45; m <= 180; m += 15) {
    const h = Math.floor(m / 60), r = m % 60;
    const label = `${h ? `${h} hour` : ''}${h && r ? ' ' : ''}${r ? `${r} min` : ''}`.trim() || '45 min';
    dur.add(new Option(label, label));
  }
  const pad = n => String(n).padStart(2, '0');
  const OPEN_TIME = 10 * 60, CLOSE_TIME = 17 * 60;
  const slotInput = $('#slot');
  const setSlotWindow = (value = slotInput.value) => {
    if (!value) return;
    const date = value.slice(0, 10);
    slotInput.min = `${date}T10:00`;
    slotInput.max = `${date}T17:00`;
  };
  const isWithinBookingWindow = (value) => {
    if (!value) return false;
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return false;
    const totalMinutes = (dt.getHours() * 60) + dt.getMinutes();
    return totalMinutes >= OPEN_TIME && totalMinutes <= CLOSE_TIME;
  };
  slotInput.addEventListener('change', () => {
    if (!slotInput.value) return;
    setSlotWindow(slotInput.value);
    if (!isWithinBookingWindow(slotInput.value)) {
      slotInput.value = '';
      setErr('slot', 'Choose a time between 10:00 AM and 5:00 PM only.');
    }
  });

  /* Cursor: dot + trailing ring + sparks */
  const dot = $('.dot'), ring = $('.ring');
  const dx = gsap.quickTo(dot, 'x', { duration: .1, ease: 'power3' }), dy = gsap.quickTo(dot, 'y', { duration: .1, ease: 'power3' });
  const rx = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
  function spark(x, y) {
    const s = document.createElement('i');
    Object.assign(s.style, { position: 'fixed', left: x + 'px', top: y + 'px', width: '6px', height: '6px', borderRadius: '50%', background: '#ffd27a', pointerEvents: 'none', zIndex: 98 });
    document.body.appendChild(s);
    gsap.to(s, { x: gsap.utils.random(-24, 24), y: gsap.utils.random(10, 40), opacity: 0, scale: 0, duration: .8, ease: 'power2.out', onComplete: () => s.remove() });
  }
  addEventListener('pointermove', e => {
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    if (!reduce && Math.random() < .12) spark(e.clientX, e.clientY);
  }, { passive: true });
  const hoverSel = 'a,button,input,select';
  document.addEventListener('pointerover', e => { if (e.target.closest(hoverSel)) gsap.to(ring, { scale: 1.8, duration: .25 }); });
  document.addEventListener('pointerout', e => { if (e.target.closest(hoverSel)) gsap.to(ring, { scale: 1, duration: .25 }); });
  addEventListener('pointerdown', () => gsap.to(ring, { scale: .7, duration: .12 }));
  addEventListener('pointerup', () => gsap.to(ring, { scale: 1, duration: .2 }));

  /* Router: #/ and #/admin */
  const views = { home: $('#view-home'), login: $('#view-login'), admin: $('#view-admin') };
  let first = true;
  function enter(name) {
    if (reduce) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (first) { tl.from('header', { y: -30, autoAlpha: 0, duration: .7 }); first = false; }
    if (name === 'home') {
      tl.from('#h1', { clipPath: 'inset(0 0 100% 0)', y: 40, duration: 1 }, .1)
        .from('.lede', { autoAlpha: 0, y: 20, duration: .7 }, '-=.5')
        .from('#form', { autoAlpha: 0, x: 60, duration: .9 }, '-=.7')
        .from('#form .field, #form .btn', { autoAlpha: 0, y: 16, stagger: .08, duration: .5 }, '-=.5');
    } else {
      tl.from(views[name].querySelector('.card'), { autoAlpha: 0, y: 40, scale: .97, duration: .8 }, .1);
    }
  }
  function route() {
    const path = location.hash.replace(/^#/, '') || '/';
    const name = path.startsWith('/admin') ? (authed() ? 'admin' : 'login') : 'home';
    Object.entries(views).forEach(([k, v]) => v.classList.toggle('active', k === name));
    if (name === 'admin') renderRows();
    enter(name);
  }
  addEventListener('hashchange', route);

  /* Booking form */
  const form = $('#form');
  const setErr = (k, msg) => { document.querySelector(`[data-for="${k}"]`).textContent = msg; };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = form.name.value.trim(), address = form.address.value.trim(), slot = form.slot.value;
    setErr('name', name ? '' : 'Enter your name.');
    setErr('address', address ? '' : 'Enter the address.');
    setErr('slot', slot ? '' : 'Choose a date and time.');
    if (slot && !isWithinBookingWindow(slot)) {
      setErr('slot', 'Choose a time between 10:00 AM and 5:00 PM only.');
    }
    if (!name || !address || !slot || !isWithinBookingWindow(slot)) {
      if (!reduce) gsap.fromTo(form, { x: -8 }, { x: 0, duration: .5, ease: 'elastic.out(1,.3)' });
      return;
    }
    const data = load();
    data.unshift({ id: Date.now(), name, address, slot, duration: form.duration.value, created: new Date().toISOString() });
    const ok = save(data), t = $('#toast');
    t.textContent = ok ? `Thanks, ${name}. Your Quest 3S demo request has been saved.` : 'Could not save. Check that browser storage is enabled.';
    t.style.display = 'block';
    if (!reduce) gsap.from(t, { autoAlpha: 0, y: 12, duration: .5, ease: 'back.out(1.7)' });
    if (ok) form.reset();
  });

  /* Admin */
  const fmt = iso => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function renderRows() {
    const data = load();
    $('#empty').style.display = data.length ? 'none' : 'block';
    $('#rows').innerHTML = data.map(d => `<tr><td>${esc(d.name)}</td><td>${esc(d.address)}</td><td>${fmt(d.slot)}</td><td>${esc(d.duration)}</td><td>${fmt(d.created)}</td><td><button class="btn danger" data-del="${d.id}">Delete</button></td></tr>`).join('');
    if (!reduce && data.length) gsap.from('#rows tr', { autoAlpha: 0, x: -20, stagger: .05, duration: .4, ease: 'power2.out' });
  }
  $('#rows').addEventListener('click', e => {
    const id = e.target.dataset.del; if (!id) return;
    save(load().filter(d => String(d.id) !== id)); renderRows();
  });
  $('#clear').addEventListener('click', () => { if (confirm('Delete all bookings?')) { save([]); renderRows(); } });
  $('#logout').addEventListener('click', () => { setAuth(false); location.hash = '#/'; route(); });
  $('#login').addEventListener('submit', e => {
    e.preventDefault();
    if ($('#user').value === AUTH_USER && $('#pass').value === AUTH_PASS) { setAuth(true); $('#pass').value = ''; $('#loginErr').textContent = ''; route(); }
    else { $('#loginErr').textContent = 'Wrong username or password.'; if (!reduce) gsap.fromTo('#login', { x: -10 }, { x: 0, duration: .5, ease: 'elastic.out(1,.3)' }); }
  });

  route();
})();
