import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.models.js"
import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCLoudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!req.user) {
        throw new ApiError(401, "User needs to log in");
    }

    const videoLocalPath = req.files?.videoFile?.[0]?.path || null;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path || null;

    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "Video file and thumbnail are required");
    }

    if (!title || title.trim() === "" || !description || description.trim() === "") {
        throw new ApiError(400, "Title and description are required");
    }

    const video = await uploadOnCLoudinary(videoLocalPath);
    const thumbnail = await uploadOnCLoudinary(thumbnailLocalPath);

    if (!video || !thumbnail) {
        throw new ApiError(500, "Failed to upload video or thumbnail");
    }

    if (video.resource_type !== "video" || thumbnail.resource_type !== "image") {
        throw new ApiError(400, "Invalid file types uploaded");
    }

    const newVideo = await Video.create({
        videoFile: video.secure_url,       // use secure_url
        thumbnail: thumbnail.secure_url,   // use secure_url
        title,
        description,
        duration: video.duration || 0,     // safe fallback
        isPublished: true,
        owner: req.user._id
    });

    return res.status(201).json(
        new ApiResponse(201, newVideo, "Video published successfully")
    );
});


const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}