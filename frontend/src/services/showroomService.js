import apiClient from './apiClient';
import { mapVehicle } from './vehicleService';

export const showroomService = {
  async getPublicProfile(userId) {
    const vehicles = await this.getPublicVehicles(userId, { page: 1, limit: 1 });
    return vehicles.showroom || {
      _id: userId,
      id: userId,
      name: 'Showroom',
      email: '',
      phone: '',
      address: '',
    };
  },

  async getPublicVehicles(userId, { page = 1, limit = 12 } = {}) {
    const response = await apiClient.post('/api/vehicles/getListVehicles', {
      added_by: userId,
      page,
      limit,
    });
    const rawVehicles = Array.isArray(response.data?.data) ? response.data.data : [];
    const firstLister = rawVehicles.find((vehicle) => vehicle.added_by && typeof vehicle.added_by === 'object')?.added_by;
    const showroom = firstLister
      ? {
        _id: firstLister._id || userId,
        id: firstLister._id || userId,
        name: firstLister.business_name || firstLister.name || 'Showroom',
        email: firstLister.email || '',
        phone: firstLister.phone || '',
        address: firstLister.address || '',
      }
      : {
        _id: userId,
        id: userId,
        name: 'Showroom',
        email: '',
        phone: '',
        address: '',
      };

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
