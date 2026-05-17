import apiClient from './apiClient';
import { mapVehicle } from './vehicleService';

function mapPublicShowroomFromUser(listedBy, userId) {
  if (!listedBy || typeof listedBy !== 'object') {
    return {
      _id: userId,
      id: userId,
      name: 'Showroom',
      business_name: '',
      email: '',
      phone: '',
      address: '',
      public_address: '',
      logo_url: '',
      showroom_representative_name: '',
      opening_hours: '',
      showroom_description: '',
      policy_text: '',
    };
  }
  const id = listedBy._id || userId;
  const displayName = listedBy.business_name || listedBy.name || 'Showroom';
  return {
    _id: id,
    id,
    name: displayName,
    business_name: listedBy.business_name || '',
    email: listedBy.email || '',
    phone: listedBy.phone || '',
    address: listedBy.address || '',
    public_address: listedBy.public_address || '',
    logo_url: listedBy.logo_url || '',
    showroom_representative_name: listedBy.showroom_representative_name || '',
    opening_hours: listedBy.opening_hours || '',
    showroom_description: listedBy.showroom_description || '',
    policy_text: listedBy.policy_text || '',
  };
}

export const showroomService = {
  async getPublicProfile(userId) {
    const payload = await this.getPublicVehicles(userId, { page: 1, limit: 1 });
    return payload.showroom;
  },

  async getPublicVehicles(userId, { page = 1, limit = 12 } = {}) {
    const response = await apiClient.post('/api/vehicles/getListVehicles', {
      added_by: userId,
      page,
      limit,
    });
    const rawVehicles = Array.isArray(response.data?.data) ? response.data.data : [];
    const firstWithOwner = rawVehicles.find((vehicle) => vehicle.added_by && typeof vehicle.added_by === 'object');
    const showroom = mapPublicShowroomFromUser(firstWithOwner?.added_by, userId);

    return {
      data: rawVehicles.map(mapVehicle),
      pagination: response.data?.pagination || {
        total: 0,
        page,
        limit,
        totalPages: 0,
      },
      showroom,
    };
  },
};

export default showroomService;
