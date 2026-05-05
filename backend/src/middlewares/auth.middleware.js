const userModel = require("../models/user.model");
const { verifyAccessToken } = require("../utils/jwt");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Missing or invalid Authorization header" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = verifyAccessToken(token);

        const user = await userModel.findById(decoded.userId);
        if (!user) return res.status(401).json({ message: "User not found" });

        req.user = { userId: user._id, role: user.role, email: user.email, name: user.name };
        next();
    } catch (err) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};

module.exports = authMiddleware;
