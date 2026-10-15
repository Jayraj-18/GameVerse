import { db } from './firebase-config.js';
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

(() => {
  'use strict';

  const form = document.querySelector('#prebooking-form');
  if (!form) return;

  const message = document.querySelector('#booking-message');
  const durationSelect = form.elements.duration;
  const priceMessage = document.querySelector('#booking-price');
  const submitButton = form.querySelector('[type="submit"]');
  const bookingDialog = document.querySelector('#booking-notice');
  const bookingDialogTitle = document.querySelector('#booking-notice-title');
  const bookingDialogMessage = document.querySelector('#booking-notice-message');
  document.querySelector('#booking-notice-close').addEventListener('click', () => bookingDialog.close());

  const prices = {
    '30-minutes': 70,
    '1-hour': 100,
    '1-hour-30-minutes': 170,
    '2-hours': 200
  };

  const updatePrice = () => {
    const price = prices[durationSelect.value];
    priceMessage.textContent = price === undefined
      ? 'Select a duration to see the price.'
      : `Price: ₹${price}`;
  };

  durationSelect.addEventListener('change', updatePrice);

  const durationInMinutes = value => {
    const match = String(value).match(/(?:(\d+)\s*hours?)?(?:\s*(\d+)\s*minutes?)?/i);
    return match && (match[1] || match[2])
      ? Number(match[1] || 0) * 60 + Number(match[2] || 0)
      : 0;
  };

  const slotsFor = (date, time, duration) => {
    const [hour, minute] = time.split(':').map(Number);
    const start = hour * 60 + minute;
    const end = start + duration;
    const slots = [];

    for (let slot = start; slot < end; slot += 30) {
      slots.push(`${date}_${String(slot).padStart(4, '0')}`);
    }
    return slots;
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    message.textContent = '';
    submitButton.disabled = true;

    const date = form.elements.date.value;
    const timeslot = form.elements.timeslot.value;
    const duration = form.elements.duration.options[form.elements.duration.selectedIndex].text;
    const booking = {
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      address: form.elements.address.value.trim(),
      date,
      timeslot,
      duration
    };

    try {
      const durationMinutes = durationInMinutes(duration);
      if (!date || !timeslot || !durationMinutes) {
        throw new Error('Choose a date, time, and session duration.');
      }

      const bookingRef = doc(collection(db, 'bookings'));
      const slotRefs = slotsFor(date, timeslot, durationMinutes)
        .map(slot => doc(db, 'bookingSlots', slot));

      await runTransaction(db, async transaction => {
        const slotSnapshots = await Promise.all(slotRefs.map(slotRef => transaction.get(slotRef)));
        if (slotSnapshots.some(snapshot => snapshot.exists())) {
          const conflict = new Error('This time slot is already booked. Please choose another time.');
          conflict.code = 'booking/slot-taken';
          throw conflict;
        }

        transaction.set(bookingRef, {
          ...booking,
          createdAt: serverTimestamp()
        });
        slotRefs.forEach(slotRef => {
          transaction.set(slotRef, { bookingId: bookingRef.id });
        });
      });

      form.reset();
      updatePrice();
      bookingDialogTitle.textContent = "You're on the List!";
      bookingDialogMessage.textContent = "Your pre-booking request has been received. GameVerse launches on 24 October 2026. We'll contact you to confirm your VR session.";
      bookingDialog.showModal();
    } catch (error) {
      if (error.code === 'booking/slot-taken') {
        bookingDialogTitle.textContent = 'Slot Already Booked';
        bookingDialogMessage.textContent = error.message;
        bookingDialog.showModal();
      } else {
        console.error('Could not save booking to Firebase:', error);
        message.textContent = error.code === 'permission-denied'
          ? 'Booking could not be saved. Check the Firestore security rules.'
          : 'Could not save your booking. Check your connection and Firebase configuration, then try again.';
      }
    } finally {
      submitButton.disabled = false;
    }
  });
})();
