import { v2 as cloudinary } from "cloudinary";

import fs from "fs";


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const uploadOnCLoudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        //file uploaded


        fs.unlinkSync(localFilePath);


        return response;

    }
    catch (err) {
        if (fs.existsSync(localFilePath)) {

            fs.unlinkSync(localFilePath);
        }
        return null;

    }
}

const deleteFromCloudinary = async (publicId, type="image") => {

    try {
        if (!publicId) return null;

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: type
        });
        return response;
    } catch (err) {
        console.error("Error deleting from Cloudinary:", err);
        return null;
    }
}


export { uploadOnCLoudinary, deleteFromCloudinary };