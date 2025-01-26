import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //Upload the file
        const response = await cloudinary.uploader.upload(
            localFilePath,
            {
                resource_type: "auto"
            }
        )
        //file successfully uploaded
        console.log("file is uploaded on cloudinary", response.url);
        return response       
    } catch (error) {
        // remove locally saved file from the server
        fs.unlinkSync(localFilePath)
    }
}

export {uploadOnCloudinary}