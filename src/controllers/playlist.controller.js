import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    if (!name || !description) throw new ApiError(400, "Name and description of the playlist must be provided to create playlist");

    if (!req.user) throw new ApiError(400, "User needs to login to create a playlist");

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })

    if (!playlist) throw new ApiError(500, "Something went wrong while creating the playlist");

    return res
    .status(200)
    .json( new ApiResponse(200, playlist, "Playlist created successfully") )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid User ID");
    if (!req.user) throw new ApiError(400, "User needs to login to get");

    const playlist = await Playlist.find({owner: userId})
    if (!playlist || playlist.length===0) throw new ApiError(404, "Playlist not found");

    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"))     
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if (!isValidObjectId(playlistId)) throw new ApiError(400, "Invalid Playlist ID");

    const playlist = await Playlist.findById(playlistId).populate("video") //populate: gives complete details, not just the IDs
    if(!playlist || playlist.length===0) throw new ApiError(404, "Something went wrong while fetching the playlist by ID");

    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully (By ID)"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if (!isValidObjectId(playlistId)) throw new ApiError(400, "Invalid Playlist ID");
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video ID");

    if (!req.user) throw new ApiError(400, "User needs to login to add videos to the playlist");

    // IMP
    const updatedPlaylist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            }
        },
        {
            $addFields: {
                "video": {
                    $setUnion: ["$videos", new mongoose.Types.ObjectId(videoId)],
                }
            }
        },
        {
            $merge: {
                into: "playlists",
            }
        }
    ])

    if (!updatedPlaylist) throw new ApiError(404, "Playlist not found or video already added");

    return res
    .status(200)
    .json( new ApiResponse(200, updatedPlaylist, "Video added to the playlist successfully") )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) throw new ApiError(400, "Invalid Playlist ID or Video ID");

    if (!req.user) throw new ApiError(400, "User needs to login to remove videos from the playlist");

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: new mongoose.Types.ObjectId(videoId)
            }
        },
        { new: true }
    )

    if (!updatedPlaylist) throw new ApiError(500, "Something went wrong while removing the video from the playlist");

    return res
    .status(200)
    .json( new ApiResponse(200, updatedPlaylist, "Video removed from the playlist successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if (!isValidObjectId(playlistId)) throw new ApiError(400, "Invalid Playlist ID");
    if (!req.user) throw new ApiError(400, "User needs to login to delete the playlist");

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)
    if (!deletedPlaylist) throw new ApiError(500, "Something went wrong while deleting the playlist");

    return res
    .status(200)
    .json(new ApiResponse(200, deletedPlaylist, "Playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    if(!isValidObjectId(playlistId)) throw new ApiError(400, "Invalid Playlist ID");
    if (!req.user) throw new ApiError(400, "User needs to login to update the playlist");
    if(!name || !description) throw new ApiError(400, "Name or Description can't be empty");

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: { name, description }
        },
        { new: true }
    )
    if(!updatedPlaylist) throw new ApiError(500, "Something went wrong while updating the playlist");

    return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"))
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