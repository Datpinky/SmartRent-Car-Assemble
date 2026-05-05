
const BaseService = require('../services/base.service');

class QueryBuilder {
  static buildExactFieldFilter(filters = {}) {
    const filter = {};

    // Exact match filters: chỉ lấy những field có giá trị cụ thể
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        filter[key] = value;
      }
    }

    return filter;
  }
  
/**
 * Nếu không nhận trực tiếp từ req.body thì có thể truyền fieldsObj như:
 * { name: 1, email: 1 } hoặc { name: true, email: true }
 * Giá trị 1/true chỉ để đánh dấu field cần search, không ảnh hưởng đến logic.
 */
  static buildSearchFilter(search, fieldsObj = {}) {
    if (search && String(search).trim()) {
      const regex = new RegExp(String(search).trim(), 'i');

      // Lấy tất cả key trong object (value không quan trọng)
      const fields = Object.keys(fieldsObj);

      if (fields.length > 0) {
        return { $or: fields.map((field) => ({ [field]: regex })) };
      }
    }
    return {};
  }

  static buildSortOptions(sorts = []) {
    const sort = {};

    // thêm các field khác
    for (const { field, value } of sorts) {
      const direction = BaseService.parseSortDirection(value);
      if (direction !== null) {
        sort[field] = direction;
      }
    }

    return sort;
  }
}

module.exports = QueryBuilder;