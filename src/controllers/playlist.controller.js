import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.models.js"
import { Video } from "../models/video.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body
    if (!req.user || !isValidObjectId(req.user?._id)) {
        throw new ApiError(401, "User needs to log in");
    }
    if (!name || !description || name.trim() === "" || description.trim() == "") {
        throw new ApiError(400, "Name and description are required");
    }
    const playlist = await Playlist.create({
        name,
        description,
        videos: [],
        owner: req.user._id
    })
    if (!playlist) {
        throw new ApiError(500, "Failed to create playlist");
    }
    return res.status(201).json(new ApiResponse(201, playlist, "Playlist created successfully"));


})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    //TODO: get user playlists
    const playlists = await Playlist.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",

            }
        },
        {
            $addFields: {
                videoCount: { $size: "$videos" },
                totalViews: { $sum: "$videos.views" }
            }
        },
        {
            $project:{
                videos:0
            }
        }

    ])
    if (!playlists || playlists.length === 0) {
        throw new ApiError(404, "Playlists not found");
    }
    return res.status(200).json(new ApiResponse(200, playlists, "Playlists fetched successfully"));

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }
    if (!req.user || !isValidObjectId(req.user?._id)) {
        throw new ApiError(401, "User needs to log in");
    }
    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
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



                ]
            },
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
    if (!playlist || playlist.length === 0) {
        throw new ApiError(404, "Playlist not found");
    }
    return res.status(200).json(new ApiResponse(200, playlist[0], "Playlist fetched successfully"));
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    // Validate IDs
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist ID or video ID");
    }

    if (!req.user || !isValidObjectId(req.user?._id)) {
        throw new ApiError(401, "User needs to log in");
    }


    const videoExists = await Video.exists({ _id: videoId });
    if (!videoExists) {
        throw new ApiError(404, "Video not found");
    }


    const updatedPlaylist = await Playlist.findOneAndUpdate(
        { _id: playlistId, owner: req.user._id },
        { $addToSet: { videos: videoId } },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(404, "Playlist not found or you are not the owner");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully")
    );
});


const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    // Validate IDs
    if (!playlistId || !isValidObjectId(playlistId) || !videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist ID or video ID");
    }

    if (!req.user || !isValidObjectId(req.user?._id)) {
        throw new ApiError(401, "User needs to log in");
    }

    // Directly update if conditions match
    const updatedPlaylist = await Playlist.findOneAndUpdate(
        { _id: playlistId, owner: req.user._id, videos: videoId }, // ensures ownership & video existence
        { $pull: { videos: videoId } },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(404, "Playlist not found, unauthorized, or video not in playlist");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully")
    );
});


const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist
    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }
    if (!req.user || !isValidObjectId(req.user?._id)) {
        throw new ApiError(401, "User needs to log in");
    }
    const playlist = await Playlist.findOneAndDelete({ _id: playlistId, owner: req.user._id });
    if (!playlist) {
        throw new ApiError(404, "Playlist not found or you are not the owner");
    }

    return res.status(200).json(new ApiResponse(200, null, "Playlist deleted successfully"));
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    const { name, description } = req.body


    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }
    if (!name || name.trim() === "" || !description || description.trim() === "") {
        throw new ApiError(400, "Name and description are required");
    }
    if (!req.user || !isValidObjectId(req.user?._id)) {
        throw new ApiError(401, "User needs to log in");
    }
    const playlist = await Playlist.findOneAndUpdate({ _id: playlistId, owner: req.user._id }, { name, description }, { new: true });
    if (!playlist) {
        throw new ApiError(404, "Playlist not found or you are not the owner");
    }
    return res.status(200).json(new ApiResponse(200, playlist, "Playlist updated successfully"));


})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}