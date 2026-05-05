const { v2: cloudinary } = require('cloudinary');
const { model } = require('mongoose');


cloudinary.config(
    {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    })

class UploadService {
    async uploadBased64Image(based64DataUri) {
        const result = await cloudinary.uploader.upload(based64DataUri, { resource_type: "image" });
        return { url: result.secure_url, publicId: result.public_id };
    }
    async uploadBuffer(buffer, filename) {
        const ext = (filename && filename.split(".").pop()) || "png";
        const base64 = `data:image/${ext};base64,${buffer.toString("base64")}`;
        return this.uploadBased64Image(base64);
    }
}
module.exports = new UploadService();
