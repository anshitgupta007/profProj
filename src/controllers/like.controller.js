import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.models.js"
import { Video } from "../models/video.models.js"
import { Tweet } from "../models/tweet.models.js"
import { Comment } from "../models/comment.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    if (!req.user || !req.user?._id) {
        throw new ApiError(401, "user not authenticated")
    }
    const video = await Video.findById(videoId).select('_id isPublished');
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (!video.isPublished) {
        throw new ApiError(403, "Cannot like unpublished video");
    }


    const like = await Like.findOneAndDelete({ video: videoId, likedBy: req.user._id });
    if (like) {
        return res.status(200).json(new ApiResponse(200, "Video unliked successfully", { liked: false }));
    }

    await Like.create({ video: videoId, likedBy: req.user._id });
    return res.status(200).json(new ApiResponse(200, "Video liked successfully", { liked: true }));


})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    if (!req.user || !req.user?._id) {
        throw new ApiError(401, "user not authenticated")
    }

    const comment = await Comment.exists({ _id: commentId });
    if (!comment) throw new ApiError(404, "Comment not found");

    const like = await Like.findOneAndDelete({ comment: commentId, likedBy: req.user._id });
    if (like) {
        return res.status(200).json(new ApiResponse(200, "Comment unliked successfully", { liked: false }));
    }

    await Like.create({ comment: commentId, likedBy: req.user._id });
    return res.status(200).json(new ApiResponse(200, "Comment liked successfully", { liked: true }));



})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    if (!req.user || !req.user?._id) {
        throw new ApiError(401, "user not authenticated")
    }
    //check if tweet exists
    const tweet = await Tweet.findById(tweetId).select('_id');
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }
    const like = await Like.findOneAndDelete({ tweet: tweetId, likedBy: req.user._id });
    if (like) {
        return res.status(200).json(new ApiResponse(200, "Tweet unliked successfully", { liked: false }));
    }
    await Like.create({ tweet: tweetId, likedBy: req.user._id });
    return res.status(200).json(new ApiResponse(200, "Tweet liked successfully", { liked: true }));
}
)

const getLikedVideos = asyncHandler(async (req, res) => {


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
            $addFields: {
                video: { $first: "$video" }
            }
        }

    ]);

    if (!likedVideos || likedVideos.length === 0) {
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