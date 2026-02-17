import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath, resourceType = "image") => {
    try {
        if (!localFilePath) return null;

        cloudinary.config({ 
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
            api_key: process.env.CLOUDINARY_API_KEY, 
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: resourceType,
            folder: resourceType === "video" ? "videos" : "images"
        });

        return response;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        return null;
    } finally {
        if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    }
}
const deleteFromCloudinary = async (cloudinaryFileUrl, resourceType = "image") => {
    try {
        if (!cloudinaryFileUrl) return null;

        const publicId = cloudinaryFileUrl.split("/").pop().split(".")[0];

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        });

        return response;
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        return null;
    }
}

export { uploadOnCloudinary, deleteFromCloudinary };