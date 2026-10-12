(() => {
  'use strict';

  const STORAGE_KEY = 'bookings:v1';
  const AUTH_KEY = 'admin:auth';
  const USERNAME = 'jay18';
  const PASSWORD = 'jay181925';
  const loginView = document.querySelector('#login-view');
  const bookingsView = document.querySelector('#bookings-view');
  const loginForm = document.querySelector('#admin-login');
  const loginMessage = document.querySelector('#login-message');
  const bookingRows = document.querySelector('#booking-rows');
  const bookingCount = document.querySelector('#booking-count');
  const bookingsMessage = document.querySelector('#bookings-message');

  function showBookings() {
    loginView.hidden = true;
    bookingsView.hidden = false;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const bookings = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(bookings)) throw new Error('Saved booking data is invalid.');
      bookingRows.replaceChildren();
      bookingCount.textContent = `${bookings.length} booking${bookings.length === 1 ? '' : 's'}`;
      bookingsMessage.textContent = bookings.length ? '' : 'No bookings have been submitted yet.';

      bookings.forEach(booking => {
        const row = document.createElement('tr');
        const time = String(booking.timeslot || booking.slot || '');
        const formattedTime = /^\d{2}:\d{2}$/.test(time)
          ? new Date(`1970-01-01T${time}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          : time.includes('T') ? new Date(time).toLocaleString() : time;
        const cells = [
          booking.name || '',
          booking.address || '',
          formattedTime,
          booking.duration || ''
        ];
        cells.forEach(value => {
          const cell = document.createElement('td');
          cell.textContent = String(value);
          row.append(cell);
        });
        bookingRows.append(row);
      });
    } catch (error) {
      console.error('Could not load bookings:', error);
      bookingsMessage.textContent = 'Could not load bookings. Please check browser storage.';
    }
  }

  loginForm.addEventListener('submit', event => {
    event.preventDefault();
    if (loginForm.elements.username.value.trim() === USERNAME &&
        loginForm.elements.password.value === PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, '1');
      loginMessage.textContent = '';
      showBookings();
    } else {
      loginMessage.textContent = 'Incorrect username or password.';
    }
  });

  document.querySelector('#admin-logout').addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_KEY);
    bookingsView.hidden = true;
    loginView.hidden = false;
    loginForm.reset();
  });

  if (sessionStorage.getItem(AUTH_KEY) === '1') showBookings();
})();
