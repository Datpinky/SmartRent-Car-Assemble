const REVIEWABLE_BOOKING_STATUSES = new Set([
  'completed',
]);

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
  // Đồng bộ API tạo review (backend chỉ yêu cầu booking completed).
  // Không chờ qua end_date: showroom có thể xác nhận trả xe / hoàn tất sớm hơn lịch.
  return REVIEWABLE_BOOKING_STATUSES.has(status);
};
