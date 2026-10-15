import { auth, db } from './firebase-config.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  collection,
  getDocs
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

(() => {
  'use strict';

  const ADMIN_EMAIL = 'jay18@gmail.com';
  const loginView = document.querySelector('#login-view');
  const bookingsView = document.querySelector('#bookings-view');
  const loginForm = document.querySelector('#admin-login');
  const loginMessage = document.querySelector('#login-message');
  const bookingCount = document.querySelector('#booking-count');
  const bookingsMessage = document.querySelector('#bookings-message');
  const bookingRows = document.querySelector('#booking-rows');
  const submitButton = loginForm.querySelector('[type="submit"]');

  const showLogin = () => {
    loginView.hidden = false;
    bookingsView.hidden = true;
  };

  const showBookings = () => {
    loginView.hidden = true;
    bookingsView.hidden = false;
  };

  const formatDate = value => {
    if (!value) return '—';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString([], { dateStyle: 'medium' });
  };

  const formatTime = value => {
    if (!value) return '—';
    const [hour, minute] = String(value).split(':').map(Number);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return String(value);
    return new Date(2000, 0, 1, hour, minute)
      .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const formatTimestamp = value => {
    if (!value || typeof value.toDate !== 'function') return '—';
    return value.toDate().toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const addCell = (row, value) => {
    const cell = document.createElement('td');
    cell.className = 'px-3 py-3 text-sm text-[#f2f3f7]';
    cell.textContent = value == null ? '—' : String(value);
    row.append(cell);
  };

  const showTableMessage = text => {
    bookingRows.replaceChildren();
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.className = 'px-3 py-6 text-center text-sm text-[#9a9eab]';
    cell.textContent = text;
    row.append(cell);
    bookingRows.append(row);
  };

  const loadBookings = async () => {
    bookingRows.replaceChildren();
    bookingCount.textContent = '';
    bookingsMessage.textContent = 'Loading bookings…';

    try {
      const snapshot = await getDocs(collection(db, 'bookings'));
      const bookings = snapshot.docs
        .map(bookingDoc => ({
          id: bookingDoc.id,
          ...bookingDoc.data()
        }))
        .sort((first, second) => {
          const firstTime = first.createdAt?.toMillis?.() ?? 0;
          const secondTime = second.createdAt?.toMillis?.() ?? 0;
          return secondTime - firstTime;
        });

      bookingCount.textContent = `${bookings.length} booking${bookings.length === 1 ? '' : 's'}`;
      bookingsMessage.textContent = '';

      if (!bookings.length) {
        showTableMessage('No bookings yet.');
        return;
      }

      const rows = document.createDocumentFragment();
      bookings.forEach(booking => {
        const row = document.createElement('tr');
        addCell(row, booking.name);
        addCell(row, booking.phone);
        addCell(row, booking.address);
        addCell(row, formatDate(booking.date));
        addCell(row, formatTime(booking.timeslot));
        addCell(row, booking.duration);
        addCell(row, formatTimestamp(booking.createdAt));
        rows.append(row);
      });
      bookingRows.replaceChildren(rows);
    } catch (error) {
      console.error('Could not load bookings from Firestore:', error);
      bookingCount.textContent = '';
      bookingsMessage.textContent = error.code === 'permission-denied'
        ? 'Firestore rules denied access. Allow the admin account to read the bookings collection.'
        : 'Could not load bookings. Check your connection and Firebase configuration, then try again.';
      showTableMessage('Bookings could not be loaded.');
    }
  };

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    loginMessage.textContent = '';
    submitButton.disabled = true;

    const username = loginForm.elements.username.value.trim().toLowerCase();
    const email = username === 'jay18' ? ADMIN_EMAIL : username;
    const password = loginForm.elements.password.value;

    if (email !== ADMIN_EMAIL) {
      loginMessage.textContent = 'Use the admin username jay18 or its Firebase email.';
      submitButton.disabled = false;
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
      loginForm.elements.password.value = '';
    } catch (error) {
      console.error('Admin sign-in failed:', error);
      loginMessage.textContent = error.code === 'auth/invalid-credential' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/user-not-found'
        ? 'Incorrect admin username or password.'
        : error.code === 'auth/operation-not-allowed'
          ? 'Enable Email/Password sign-in in Firebase Authentication.'
          : 'Could not sign in. Check the Firebase account and try again.';
    } finally {
      submitButton.disabled = false;
    }
  });

  document.querySelector('#admin-logout').addEventListener('click', async () => {
    bookingsMessage.textContent = '';
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Admin sign-out failed:', error);
      bookingsMessage.textContent = 'Could not sign out. Please try again.';
    }
  });

  onAuthStateChanged(auth, async user => {
    if (!user) {
      showLogin();
      return;
    }

    if (user.email?.toLowerCase() !== ADMIN_EMAIL) {
      loginMessage.textContent = 'This Firebase account is not authorized for admin access.';
      showLogin();
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Could not sign out unauthorized account:', error);
      }
      return;
    }

    showBookings();
    await loadBookings();
  });
})();
