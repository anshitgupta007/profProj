
import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.models.js"
import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet

    const { content } = req.body;
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet content is required");
    }
    if (!req.user || !isValidObjectId(req.user?._id)) {
        throw new ApiError(401, "User needs to log in");
    }
    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    })
    if (!tweet) {
        throw new ApiError(500, "Failed to create tweet");
    }
    return res.status(201).json(new ApiResponse(201, tweet, "Tweet created successfully"));
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params;
    const filter = {};
    if (userId && isValidObjectId(userId)) {
        filter.owner = new mongoose.Types.ObjectId(userId);
    }
    else {
        throw new ApiError(400, "Invalid userId");
    }
    const tweets = await Tweet.aggregate([{
        $match: filter
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
        },


    },
    {
        $addFields: {
            owner: { $first: "$owner" }

        }
    }
    ])
    if (!tweets) {
        throw new ApiError(404, "Tweets not found");
    }
    return res.status(200).json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params;
    const { content } = req.body;
    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId");
    }
    if (!req.user || !isValidObjectId(req.user?._id)) {
        throw new ApiError(401, "User needs to log in");
    }
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet content is required");
    }
    const tweet = await Tweet.findOneAndUpdate(
        {
            _id: new mongoose.Types.ObjectId(tweetId),
            owner: new mongoose.Types.ObjectId(req.user._id)
        },
        {
            content
        },
        {
            new: true
        });
    if (!tweet) {
        throw new ApiError(404, "Tweet not found or user not authorized");
    }
    return res.status(200).json(new ApiResponse(200, tweet, "Tweet updated successfully"));


})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;
    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId");
    }
    if (!req.user || !isValidObjectId(req.user?._id)) {
        throw new ApiError(401, "User needs to log in");
    }
    const tweet = await Tweet.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(tweetId),
        owner: new mongoose.Types.ObjectId(req.user._id)
    });
    if (!tweet) {
        throw new ApiError(404, "Tweet not found or user not authorized");
    }
    return res.status(200).json(new ApiResponse(200, {}, "Tweet deleted successfully"));

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
