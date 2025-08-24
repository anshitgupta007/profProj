import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.models.js"
import { Video } from "../models/video.models.js"
import { Like } from "../models/like.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    let { page = 1, limit = 10 } = req.query
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1 || limit > 50) limit = 10;
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }
    const videoExist = await Video.exists({ _id: videoId, isPublished: true });
    if (!videoExist) {
        throw new ApiError(404, "Video not found");
    }
    const comments = Comment.aggregate([
        {
            $match: { video: new mongoose.Types.ObjectId(videoId) }
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" },
                likeCount: { $size: "$likes" }
            }
        },
        { $sort: { createdAt: -1 } },
        {
            $project: {
                video: 0,
                likes: 0
            }
        }

    ])

    const options = {
        page,
        limit,
    }
    const commentsPaginated = await Comment.aggregatePaginate(comments, options);
    if (!commentsPaginated) {
        throw new ApiError(500, "Failed to fetch comments");
    }


    return res.status(200).json(new ApiResponse(200, commentsPaginated, "Comments fetched successfully"))

})

const addComment = asyncHandler(async (req, res) => {

    const { videoId } = req.params;
    const { content } = req.body;
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }
    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Comment content cannot be empty");
    }
    if (!req.user || !req.user._id) {
        throw new ApiError(401, "User needs to log in");
    }
    //check if video exists
    const videoExist = await Video.exists({ _id: videoId, isPublished: true });
    if (!videoExist) {
        throw new ApiError(404, "Video not found");
    }
    const comment = await Comment.create({
        video: new mongoose.Types.ObjectId(videoId),
        owner: req.user._id,
        content: content.trim()
    });
    if (!comment) {
        throw new ApiError(500, "Failed to add comment");
    }
    return res.status(201).json(new ApiResponse(201, comment, "Comment added successfully"));
})

const updateComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params;
    const { content } = req.body;
    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }
    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Comment content cannot be empty");
    }
    if (!req.user || !req.user._id) {
        throw new ApiError(401, "User needs to log in");
    }
    const comment = await Comment.findOneAndUpdate(
        {
            _id: commentId, owner: req.user._id
        },
        {
            content: content.trim()
        },
        {
            new: true
        });
    if (!comment) {
        throw new ApiError(404, "Comment not found or you're not authorized to update this comment");
    }
    return res.status(200).json(new ApiResponse(200, comment, "Comment updated successfully"));

})

const deleteComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params;

    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    if (!req.user || !req.user._id) {
        throw new ApiError(401, "User needs to log in");
    }
    const comment = await Comment.findOneAndDelete(
        {
            _id: commentId, owner: req.user._id
        });
    if (!comment) {
        throw new ApiError(404, "Comment not found or you're not authorized to delete this comment");
    }
    try {

        await Like.deleteMany({ comment: comment._id });
    }
    catch (err) {
        throw new ApiError(500, "Failed to delete likes associated with the comment");
    }

    return res.status(200).json(new ApiResponse(200, {}, "Comment deleted successfully"));


})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}