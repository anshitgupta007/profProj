import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.models.js"
import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFromCloudinary, uploadOnCLoudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    return res.status(200).json(
        new ApiResponse(200, [], "All videos fetched successfully"))
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
        videoFile: {
            url: video.secure_url, // use secure_url
            public_id: video.public_id // use public_id
        },
        thumbnail: {
            url: thumbnail.secure_url, // use secure_url
            public_id: thumbnail.public_id // use public_id
        },
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
    const { videoId } = req.params;


    if (!req.user || !isValidObjectId(req.user?._id)) {
        throw new ApiError(401, "User needs to log in");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }


    const updated = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { views: 1 } },
        { new: true } // ensures views are incremented and saved
    );

    if (!updated) {
        throw new ApiError(404, "Video not found");
    }


    const video = await Video.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(videoId) }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            userName: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        }
    ]);

    if (!video || video.length === 0) {
        throw new ApiError(404, "Video not found");
    }
    await User.findByIdAndUpdate(req.user?._id,
        //add in the watch history
        { $addToSet: { watchHistory: updated._id } }
    )

    return res.status(200).json(
        new ApiResponse(200, video[0], "Video fetched successfully")
    );
});


const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }
    if (!req.user || !isValidObjectId(req.user._id)) {
        throw new ApiError(401, "User needs to log in");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (!video.owner.equals(req.user?._id)) {
        throw new ApiError(403, "You are not authorized to delete this video");
    }

    // Delete files from Cloudinary
    if (video.videoFile?.public_id) {
        await deleteFromCloudinary(video.videoFile.public_id,"video");
    }
    if (video.thumbnail?.public_id) {
        await deleteFromCloudinary(video.thumbnail.public_id,"image");
    }

    await video.deleteOne();


    return res
        .status(200)
        .json(new ApiResponse(200, null, "Video deleted successfully"));
});


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