const Booking = require('../models/booking.model');
const BaseService = require('./base.service');
const throwError = require('../utils/throwError');
const QueryBuilder = require('../utils/queryBuilder');


class BookingService {

  static async createBooking(data) {
    const booking = new Booking(data);
    return booking.save();
  }

  static async getListBookings(body = {}) {
    const { search, status, user_id, showroom_id, sort_by, sort_by_price, page, limit } = body;

    const pagination = BaseService.parsePagination({ page, limit });

    const searchFilter = QueryBuilder.buildSearchFilter(search, {note : 1} );
    const fieldFilter = QueryBuilder.buildExactFieldFilter({ status, user_id, showroom_id });

    // const filter = { ...searchFilter, ...fieldFilter };
    const filter = { $and: [searchFilter, fieldFilter] };
    const sortOptions = QueryBuilder.buildSortOptions([
      { field: 'total_price', value: sort_by_price },
      { field: 'createdAt', value: sort_by }
    ]);


    // Find paginated
    return BaseService.findPaginated(Booking, filter, sortOptions, pagination);
  }

  static async getBookingById(id) {
    return Booking.findById(id)

  }

  static async updateBookingStatus(id, status) {
    const booking = await Booking.findById(id);
    if (!booking) throwError('Booking không tồn tại');

    const validStatuses = Booking.schema.path('status').enumValues;

    if (!validStatuses || !validStatuses.includes(status)) {
      throw new Error(`Trạng thái "${status}" không hợp lệ`);
    }
    // dùng log để audit hoặc giải quyết tranh chấp nếu cần

    booking.status = status;
    return booking.save();
  }


  static async deleteBooking(id) {
    return Booking.findByIdAndDelete(id);
  }
}

module.exports = BookingService;