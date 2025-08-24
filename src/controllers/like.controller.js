import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    if (!req.user || !req.user?._id) {
        throw new ApiError(401, "user not authenticated")
    }

    const existingLike = await Like.findOne({ video: videoId, likedBy: req.user._id });
    if (existingLike) {

        await existingLike.deleteOne();
        return res.status(200).json(new ApiResponse(200, "Video unliked successfully", { liked: false }));
    }
    const newLike = await Like.create({ video: videoId, likedBy: req.user._id });
    return res.status(200).json(new ApiResponse(200, "Video liked successfully", { liked: true }));

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    if (!req.user || !req.user?._id) {
        throw new ApiError(401, "user not authenticated")
    }

    const existingLike = await Like.findOne({ comment: commentId, likedBy: req.user._id });
    if (existingLike) {

        await existingLike.deleteOne();
        return res.status(200).json(new ApiResponse(200, "Comment unliked successfully", { liked: false }));
    }
    const newLike = await Like.create({ comment: commentId, likedBy: req.user._id });
    return res.status(200).json(new ApiResponse(200, "Comment liked successfully", { liked: true }));


})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    if (!req.user || !req.user?._id) {
        throw new ApiError(401, "user not authenticated")
    }

    const existingLike = await Like.findOne({ tweet: tweetId, likedBy: req.user._id });
    if (existingLike) {

        await existingLike.deleteOne();
        return res.status(200).json(new ApiResponse(200, "Tweet unliked successfully", { liked: false }));
    }
    const newLike = await Like.create({ tweet: tweetId, likedBy: req.user._id });
    return res.status(200).json(new ApiResponse(200, "Tweet liked successfully", { liked: true }));
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    if (!req.user || !req.user?._id) {
        throw new ApiError(401, "user not authenticated")
    }
    const likedVideos = await Like.aggregate([
        {
            $match: { likedBy: new mongoose.Types.ObjectId(req.user._id), video: { $ne: null } }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                { $project: { _id: 1, userName: 1, fullName: 1, avatar: 1 } }
                            ]
                        }
                    },
                    { $addFields: { owner: { $first: "$owner" } } }
                ]
            }
        },
        {
            $addFields:{
                video: { $first: "$video" }
            }
        }
        
    ]);
    if (likedVideos.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No liked videos found"))
    }
    return res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}