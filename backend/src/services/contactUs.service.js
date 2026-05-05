const BaseService = require('./base.service');
const ContactUsModel = require('../models/contactUs.model');

class ContactUsService {
    async create(data) {
        return await ContactUsModel.create({...data});
    }

    async findById(id) {
        return await ContactUsModel.findById(id).lean();
    }

    async findAll(query = {}) {
        const { search, name, email, sort_by, page, limit } = query;

        // 1. Xây dựng Filter
        const filter = {};
        if (search && String(search).trim()) {
            const regex = new RegExp(String(search).trim(), 'i');
            filter.$or = [
                { title: regex },
                { body: regex },
                { name: regex }
            ];
        }
        if (name) filter.name = name;
        if (email) filter.email = email;

        const parsedSort = BaseService.parseSortDirection(sort_by);
        const sort = {
            createdAt: parsedSort !== null ? parsedSort : -1
        };

        const pagination = BaseService.parsePagination({ page, limit });

        return await BaseService.findPaginated(ContactUsModel, filter, sort, pagination);
    }

    async delete(id) {
    return await ContactUsModel.findByIdAndDelete(id);
}

}

module.exports = new ContactUsService();