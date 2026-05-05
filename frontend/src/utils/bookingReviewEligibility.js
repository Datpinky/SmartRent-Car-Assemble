const REVIEWABLE_BOOKING_STATUSES = new Set([
  'paid',
  'waiting_handover',
  'handed_over',
  'in_use',
  'waiting_return_confirmation',
  'completed',
]);

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const resolveBookingVehicleId = (booking) => {
  const vehicle =
    booking?.vehicle
    || booking?.vehicle_id
    || booking?.raw?.vehicle
    || booking?.raw?.vehicle_id;

  if (!vehicle) {
    return '';
  }

  if (typeof vehicle === 'string') {
    return vehicle;
  }

  return vehicle._id || vehicle.id || '';
};

export const resolveReviewBookingId = (review) => {
  const booking = review?.booking_id || review?.booking || review?.raw?.booking_id;

  if (!booking) {
    return '';
  }

  if (typeof booking === 'string') {
    return booking;
  }

  return booking._id || booking.id || '';
};

export const canReviewBooking = (booking) => {
  const rawBooking = booking?.raw || booking || {};
  const status = booking?.status || rawBooking.status || '';
  const endDate = parseDate(booking?.endDate || rawBooking.end_date || rawBooking.endDate);

  if (!REVIEWABLE_BOOKING_STATUSES.has(status) || !endDate) {
    return false;
  }

  return Date.now() >= endDate.getTime();
};
