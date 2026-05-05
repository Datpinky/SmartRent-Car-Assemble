const favoriteService = require("../services/favorite.service");

class FavoriteController {
    async toggleFavorite(req, res, next) {
        try {
            const userId = req.user.userId;
            const { vehicle_id } = req.body;
            const result = await favoriteService.toggleFavorite(vehicle_id, userId);
            return res.status(200).json({ message: "Favorite toggled successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async getMyFavorites(req, res, next) {
        try {
            const userId = req.user.userId;
            const result = await favoriteService.getMyFavorites(userId, req.body);
            return res.status(200).json({ message: "My favorites received successfully", ...result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new FavoriteController();
