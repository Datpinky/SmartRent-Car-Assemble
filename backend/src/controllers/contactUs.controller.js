const contactUsService = require("../services/contactUs.service");

class ContactUsController {
    async createContact(req, res, next) {
        try {
            const contactData = req.body;
            const result = await contactUsService.create(contactData);
            
            return res.status(201).json({
                message: "Gửi yêu cầu liên hệ thành công",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getListContacts(req, res, next) {
        try {
            const filters = req.query;
            const result = await contactUsService.findAll(filters);
            
            return res.status(200).json({
                message: "Lấy danh sách liên hệ thành công",
                ...result
            });
        } catch (error) {
            next(error);
        }
    }

    async getContactById(req, res, next) {
        try {
            const { id } = req.params;
            const result = await contactUsService.findById(id);
            
            return res.status(200).json({
                message: "Lấy thông tin chi tiết thành công",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
    async deleteContact(req, res, next) {
    try {
        const { id } = req.params;
        
        const result = await contactUsService.delete(id);

        if (!result) {
            return res.status(404).json({
                message: "Không tìm thấy yêu cầu liên hệ để xóa"
            });
        }

        return res.status(200).json({
            message: "Xóa yêu cầu liên hệ thành công",
            data: result
        });
    } catch (error) {
        next(error);
    }
}
}

module.exports = new ContactUsController();