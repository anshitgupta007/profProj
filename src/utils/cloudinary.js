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
        console.log("File uploaded to Cloudinary successfully", response.url);
        return response;

    }
    catch (err) {
        fs.unlinkSync(localFilePath);
        return null;

    }
}


export { uploadOnCLoudinary };