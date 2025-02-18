import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const userId = req.user?._id
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videoId passed");
    if (!userId) throw new ApiError(400, "User needs to login to like/dislike the video");

    const existingLike = await Like.findOne({ video: videoId, likedBy: userId })
    if (existingLike) {
        // Video already liked, find and delete
        await Like.findByIdAndDelete(existingLike?._id)
        return res
        .status(200)
        .json( new ApiResponse(200, existingLike, "Video unliked successfully!") );
    }

    // If no like exists, create new like
    const likeVideo = await Like.create({ video: videoId, likedBy: userId })

    return res
    .status(201)
    .json(new ApiResponse(201, likeVideo, "Video liked successfully!"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const userId = req.user?._id
    if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment ID passed");
    if (!userId) throw new ApiError(400, "User needs to login to like/dislike the comment");

    const existingLike = await Like.findOne({ comment: commentId, likedBy: userId })
    if (existingLike) {
        // Comment already liked, find and delete
        await Like.findByIdAndDelete(existingLike?._id)
        return res
        .status(200)
        .json( new ApiResponse(200, existingLike, "Comment unliked successfully!") );
    }

    // If not already liked, create the liked comment
    const likeComment = await Like.create({ comment: commentId, likedBy: userId })
    return res
    .status(201)
    .json(new ApiResponse(201, likeComment, "Comment liked successfully!"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const userId = req.user?._id
    if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid tweet ID passed");
    if (!userId) throw new ApiError(400, "User needs to login to like/dislike the tweet");

    const existingTweet = await Like.findOne({tweet: tweetId, likedBy: userId})
    if (existingTweet) {
        // Tweet already liked, find the tweet and delete
        await Like.findByIdAndDelete(existingTweet?._id)
        return res
        .status(200)
        .json( new ApiResponse(200, existingTweet, "Tweet disliked successfully") )
    }

    // If not liked, create a liked tweet
    const likeTweet = await Like.create({ tweet: tweetId, likedBy: userId })

    return res
    .status(201)
    .json( new ApiResponse(201, likeTweet, "Tweet Liked successfully!") )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    if (!userId) throw new ApiError(400, "User needs to login to see their liked videos");

    const likedVideos = await Like.find({ likedBy: userId, video: { $exists: true }}).populate("video", "_id title url")

    return res
    .status(200)
    .json( new ApiResponse(200, likedVideos, "Liked Videos fetched successfully") )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}