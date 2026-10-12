(() => {
  'use strict';

  const STORAGE_KEY = 'bookings:v1';
  const form = document.querySelector('.booking-form');
  if (!form) return;

  const message = form.querySelector('.booking-message');
  const successDialog = document.querySelector('#booking-success');
  document.querySelector('#booking-success-close').addEventListener('click', () => successDialog.close());

  form.addEventListener('submit', event => {
    event.preventDefault();

    const booking = {
      name: form.elements.name.value.trim(),
      address: form.elements.address.value.trim(),
      timeslot: form.elements.timeslot.value,
      duration: form.elements.duration.options[form.elements.duration.selectedIndex].text
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const bookings = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(bookings)) throw new Error('Saved booking data is invalid.');
      bookings.unshift(booking);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
      message.textContent = '';
      form.reset();
      successDialog.showModal();
    } catch (error) {
      console.error('Could not save booking:', error);
      message.textContent = 'Could not save your booking. Please check browser storage and try again.';
    }
  });
})();
