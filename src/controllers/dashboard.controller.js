import mongoose from "mongoose"
import { Video } from "../models/video.models.js"
import { Subscription } from "../models/subscription.models.js"
import { Like } from "../models/like.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    
    if (!req.user || !req.user?.id) {
        throw new ApiError(401, "User needs to log in");
    }
    const channelId = req.user.id;
    const totalSubscribers = await Subscription.aggregate([
        {
            $match: { channel: new mongoose.Types.ObjectId(channelId) }

        },
        {
            $group: {
                _id: null,
                Subscriberscount: { $sum: 1 }
            }
        }



    ]);
    const otherStats = await Video.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(channelId) }
        },
        {
            $lookup: {
                from: "likes",
                let: { videoId: "$_id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$video", "$$videoId"] } } },
                    { $count: "count" }
                ],
                as: "likes"
            }
        },

        {
            $project: {
                likesCount: { $ifNull: [{ $arrayElemAt: ["$likes.count", 0] }, 0] },
                views: 1

            }
        },
        {
            $group: {
                _id: null,
                totalVideos: { $sum: 1 },
                totalLikes: { $sum: "$likesCount" },
                totalViews: { $sum: "$views" }
            }
        },
        {
            $project: { _id: 0, totalVideos: 1, totalLikes: 1, totalViews: 1 }
        }
    ]);
    const channelStats = {
        totalSubscribers: totalSubscribers[0]?.Subscriberscount || 0,
        totalVideos: otherStats[0]?.totalVideos || 0,
        totalLikes: otherStats[0]?.totalLikes || 0,
        totalViews: otherStats[0]?.totalViews || 0
    }
    res.status(200).json(new ApiResponse(200, "Channel stats fetched successfully", channelStats));

})

const getChannelVideos = asyncHandler(async (req, res) => {

    if (!req.user || !req.user?.id) {
        throw new ApiError(401, "User needs to log in");
    }
    const channelId = req.user.id;
    const channelVideos = await Video.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(channelId) }

        },
        {
            $lookup: {
                from: "likes",
                let: { videoId: "$_id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$video", "$$videoId"] } } },
                    { $count: "count" }
                ],
                as: "likes"
            }
        },

        {
            $project: {
                title: 1,
                description: 1,
                url: 1,
                thumbnailUrl: 1,
                isPublished: 1,
                createdAt: 1,
                updatedAt: 1,
                likesCount: { $ifNull: [{ $arrayElemAt: ["$likes.count", 0] }, 0] },
                viewsCount: "$views"
            }
        },
        {
            $sort: { createdAt: -1 }
        }



    ]);
    if (!channelVideos || channelVideos.length === 0) {
        throw new ApiError(500, "Failed to fetch channel videos");
    }
    res.status(200).json(new ApiResponse(200, "Channel videos fetched successfully", channelVideos));

})

export {
    getChannelStats,
    getChannelVideos
}