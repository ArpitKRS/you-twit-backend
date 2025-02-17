import mongoose, {isValidObjectId} from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    // Fetching videoId from request parameters
    const {videoId} = req.params
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");
    

    // Pagination details
    const {page = 1, limit = 10} = req.query

    console.log("Video ID: ", videoId, " Type: ",typeof videoId); // Debugging log

    // Fetch comments
    const comments = await Comment.aggregate([
        {
            $match: { video: new mongoose.Types.ObjectId(videoId) },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "CommentedVideo"
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "OwnerOfComment"
            }
        },
        {
            $project: {
                content: 1,
                owner: { $arrayElemAt: ["OwnerOfComment", 0] }, // To get the first element from owner array
                video: { $arrayElemAt: ["CommentedVideo", 0] }, // To get the first element from video array
                createdAt: 1,
            }
        },
        {
            $skip: (page - 1) * parseInt(limit) // Ignores comments from previous pages and limits the response
        },
        {
            $limit: parseInt(limit),
        },
    ])
    
    console.log(comments); // Debugging log to check fetched comments

    if (!comments?.length)  throw new ApiError(404, "Cannot find the comments");

    return res
    .status(200)
    .json( new ApiResponse(200, comments, "Comments successfully fetched") )
})

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const { content } = req.body;
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video ID");
    if (!req.user) throw new ApiError(401, "User needs to login to comment");
    if (!content) throw new ApiError(400, "Can't make a blank comment");

    const comment = await Comment.create({
        content,
        owner: req.user?._id,
        video: videoId
    })

    if (!comment) throw new ApiError(500, "Something went wrong while commenting");

    return res
    .status(200)
    .json(new ApiResponse(200, comment, videoId, "Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content} = req.body

    if(!isValidObjectId(commentId)) throw new ApiError(400, "Invalid Comment ID");
    if(!content) throw new ApiError(400, "Can't upload blank comment");
    if(!req.user) throw new ApiError(401, "User not logged in to upgrade comment");

    const upgradedComment = await Comment.findOneAndUpdate(
        {
            _id: commentId,
            owner: req.user?._id
        },
        {
            $set: { content }
        },
        { new: true }
    )

    if (!upgradedComment) throw new ApiError(500, "Something went wrong while upgrading the comment");

    return res
    .status(200)
    .json( new ApiResponse(200, upgradedComment, "Comment upgraded successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if(!isValidObjectId(commentId)) throw new ApiError(400, "Invalid Comment ID");
    if(!req.user) throw new ApiError(401, "User not logged in to delete comment");

    const deletedComment = await Comment.findOneAndDelete({
        _id: commentId,
        owner: req.user?._id
    })
    if(!deletedComment) throw new ApiError(500, "Something went wrong while deleting the comment");

    return res
    .status(200) 
    .json( new ApiResponse(200, deletedComment, "Comment deleted successfully") )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}