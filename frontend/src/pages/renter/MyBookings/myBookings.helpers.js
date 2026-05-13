import { mapRenterBooking } from '../../../utils/renterBookingView';

export const filterActiveBookingsByTerm = (activeBookings, searchTerm) => {
  const normalized = String(searchTerm || '')
    .trim()
    .toLowerCase();

  if (!normalized) {
    return activeBookings;
  }

  return activeBookings.filter((booking) =>
    [booking.id, booking.vehicleName, booking.showroomName, booking.status]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized)),
  );
};

export const buildActiveBookingsSummary = (activeBookings) => ({
  active: activeBookings.length,
  dueReturn: activeBookings.filter((booking) => booking.hasRentalEnded).length,
  waitingReturnConfirmation: activeBookings.filter((booking) => booking.status === 'waiting_return_confirmation')
    .length,
});

export const applyRenterBookingUpdate = (booking, nextStatus, nextWorkflow, nextAiInspection) => {
  if (!booking) {
    return booking;
  }

  const updatedStatus = nextStatus || booking.status;
  const nextAi = nextAiInspection !== undefined ? nextAiInspection : booking.raw?.ai_inspection;

  const updatedRaw = booking.raw
    ? {
        ...booking.raw,
        _id: booking.raw._id || booking.id,
        status: updatedStatus,
        payment: booking.paymentRecord || booking.raw.payment || null,
        ai_inspection: nextAi,
      }
    : {
        // Preserve the minimal raw shape required by mapRenterBooking when raw data is missing.
        _id: booking.id,
        start_date: booking.startDate,
        end_date: booking.endDate,
        total_price: booking.totalPrice,
        note: booking.note,
        status: updatedStatus,
        payment: booking.paymentRecord || null,
        ai_inspection: nextAi,
        vehicle: null,
        vehicle_id: null,
        showroom: null,
        showroom_id: null,
      };

  const remapped = mapRenterBooking(updatedRaw);

  return {
    ...remapped,
    workflow: nextWorkflow || remapped.workflow,
  };
};
