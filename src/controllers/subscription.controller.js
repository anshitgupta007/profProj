import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.models.js"
import { Subscription } from "../models/subscription.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription
    //channelId is the id of the user who is the owner of the channel
    //req.user.id is the id of the user who is subscribing to the channel
    if (!req.user || !isValidObjectId(req.user?._id)) {
        throw new ApiError(401, "User needs to log in");
    }
    if (!channelId || !isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }
    if (req.user._id.toString() === channelId.toString()) {
        throw new ApiError(400, "You cannot subscribe to yourself");
    }
    const isSubscribed = await Subscription.exists({
        subscriber: req.user._id,
        channel: channelId
    });
    if (isSubscribed) {
        //unsubscribe
        const deleted = await Subscription.findOneAndDelete({
            subscriber: req.user._id,
            channel: channelId
        });
        if (!deleted) {
            throw new ApiError(500, "Failed to unsubscribe");
        }
        return res.status(200).json(new ApiResponse(200, { isSubscribed: false }, "Unsubscribed successfully"));
    }

    const newSubscription = await Subscription.create({
        subscriber: req.user._id,
        channel: channelId
    });
    if (!newSubscription) {
        throw new ApiError(500, "Failed to subscribe");
    }
    return res.status(201).json(new ApiResponse(201, { isSubscribed: true }, "Subscribed successfully"));



})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { subscriberId:channelId } = req.params
    if (!req.user || !isValidObjectId(req.user?._id)) {
        throw new ApiError(401, "User needs to log in");
    }
    if (!channelId || !isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }
    const subscribers = await Subscription.aggregate([
        {
            $match: { channel: new mongoose.Types.ObjectId(channelId) }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
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
                subscriber: { $first: "$subscriber" },
                subscriberCount: { $size: "$subscriber" }

            }
        }
    ])
    if (!subscribers) {
        throw new ApiError(500, "Failed to fetch subscribers");
    }
    return res.status(200).json(new ApiResponse(200, subscribers, "Subscribers fetched successfully"))

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId: subscriberId } = req.params;
    if (!req.user || !isValidObjectId(req.user?._id)) {
        throw new ApiError(401, "User needs to log in");
    }
    //console.log(req.params)
    if (!subscriberId || !isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID");
    }
    if (req.user._id.toString() !== subscriberId.toString()) {
        throw new ApiError(403, "You are not authorized to view this");
    }
    const subscribedChannels = await Subscription.aggregate([
        {
            $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
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
                channel: { $first: "$channel" },
                channelCount: { $size: "$channel" }
                
            }
        },
       

    ])
    if (!subscribedChannels) {
        throw new ApiError(500, "Failed to fetch subscribed channels");
    }
    return res.status(200).json(new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}