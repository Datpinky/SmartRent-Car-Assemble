const authService = require("../services/auth.service");
const ProfileService = require("../services/profile.service");

class AuthController {
    async getMe(req, res, next) {
        try {
            const user = await ProfileService.getProfileById(req.user.userId);
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }
            return res.status(200).json({ message: "OK", data: user });
        } catch (error) {
            next(error);
        }
    }

    async register(req, res, next) {
        try {
            const userData = req.body;
            const result = await authService.register(userData);
            return res.status(201).json({ message: "Register successfully", data: result });
        } catch (error) {
            next(error);
        }
    }
    async login(req, res, next) {
        try {
            const userData = req.body;
            const result = await authService.login(userData);
            return res.status(201).json({ message: "Login successfully", data: result });
        } catch (error) {
            next(error);
        }
    }
}



module.exports = new AuthController();
