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

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: resourceType
        });

        // console.log("File uploaded on Cloudinary:", response.secure_url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath); // remove temp file
        return null;
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