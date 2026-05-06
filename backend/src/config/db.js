const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');

const { setServers } = require("node:dns/promises");
setServers(["1.1.1.1", "8.8.8.8"]);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};
module.exports = connectDB;

