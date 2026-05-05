import apiClient from './apiClient';

/**
 * @param {string} bookingId
 * @returns {Promise<object>} payload hợp đồng (trường `data` từ API)
 */
export async function getRentalContractByBookingId(bookingId) {
  const res = await apiClient.get(`/api/rental-contract/by-booking/${bookingId}`);
  return res.data?.data ?? null;
}

const rentalContractService = {
  getRentalContractByBookingId,
};

export default rentalContractService;
