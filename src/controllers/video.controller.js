import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {getVideoDuration} from "../utils/ffmpeg.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    if (!req.user) throw new ApiError(400, "User needs to be loggedin");

    const match = {
        ...(query ? { title: { $regex: query, $options: "i" } } : {} ),
        ...(userId ? { owner: mongoose.Types.ObjectId(userId) } : {} )
    }

    const videos = await Video.aggregate([
        {
            $match: match
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "videosByOwner"
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                owner: { $arrayElemAt: ["$videosByOwner", 0] },
            }
        },
        {
            $sort: {
                [sortBy]: sortType === "desc" ? -1 : 1
            }
        },
        {
            $skip: (page - 1) * parseInt(limit)
        },
        {
            $limit: parseInt(limit)
        }
    ])

    if(!videos?.length) throw new ApiError(404, "Videos not found");

    return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    if (!title || !description) throw new ApiError(400, "Title or Description can't be empty");
    if (!req.user) throw new ApiError(400, "User needs to login to upload a video");

    const videoFileLocalPath = req.files?.videoFile[0]?.path
    if (!videoFileLocalPath) throw new ApiError(400, "Video file is required");

    const thumbnailFileLocalPath = req.files?.thumbnail[0]?.path
    if (!thumbnailFileLocalPath) throw new ApiError(400, "Thumbnail file is required");

    try {
        const duration = await getVideoDuration(videoFileLocalPath)

        const videoFile = await uploadOnCloudinary(videoFileLocalPath)
        if (!videoFile) throw new ApiError(400, "Cloudinary Error: Video file is required");

        const thumbnail = await uploadOnCloudinary(thumbnailFileLocalPath)
        if (!thumbnail) throw new ApiError(400, "Cloudinary Error: Thumbnail file is required");

        const videoDoc = await Video.create({
            videoFile: videoFile.url,
            thumbnail: thumbnail.url,
            title,
            description,
            duration,
            owner: req.user?._id
        })
        if (!videoDoc || videoDoc.length===0) throw new ApiError(500, "Something went wrong while publishing the video");

        return res
        .status(201)
        .json(new ApiResponse(201, videoDoc, "Video published successfully"))
    } catch (error) {
        throw new ApiError(500, error)   
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video ID");

    const video = await Video.findById(video).populate("owner", "name email")
    if (!video) throw new ApiError(404, "Video not found");

    return res 
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video ID");
    if(!req.user) throw new ApiError(400, "User needs to be logged in to update the video details");

    const {title, description} = req.body
    const updateData = {title, description}

    if (req.file){
        const thumbnailFileLocalPath = req.file?.path
        if (!thumbnailFileLocalPath) throw new ApiError(400, "Thumbnail file is missing");
        const thumbnail = await uploadOnCloudinary(thumbnailFileLocalPath)

        if (!thumbnail.url) throw new ApiError(400, "Error while uploading the thumbnail");
        updateData.thumbnail = thumbnail.url
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updateData },
        { new: true, runValidator: true }
    )
    if (!updatedVideo) throw new ApiError(404, "Video not found");

    return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video ID");

    const deleteVideo = await Video.findByIdAndDelete(videoId)
    if(!deleteVideo || deleteVideo.length===0) throw new ApiError(404, "Video not found");

    return res
    .status(200)
    .json(new ApiResponse(200, deleteVideo, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video ID");

    const video = await Video.findById(videoId)
    if (!video) throw new ApiError(404, "Video not found");

    video.isPublished = !video.isPublished
    await video.save()

    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video publish status toggled"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}