import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const content = req.body
    const ownerId = req.user?._id
    if (!content) throw new ApiError(400, "Tweet can't be empty");
    if (!isValidObjectId(ownerId)) throw new ApiError(400, "Invalid User ID");

    const tweet = await Tweet.create({ content, owner: ownerId });
    if (!tweet) throw new ApiError(500, "Something went wrong while posting the tweet");

    return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet generated successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const ownerId = req.params
    if (isValidObjectId(ownerId)) throw new ApiError(400, "Invalid User ID");

    const tweet = await Tweet.find({owner: ownerId}).sort({ createdAt: -1 })
    if (!tweet || tweet.length===0) throw new ApiError(404, "No tweets found for this user");

    return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweets retrieved successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const content = req.body
    const userId = req.user?._id
    if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid Tweet ID");
    if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid User ID");
    if (!content) throw new ApiError(400, "Tweet can't be empty");

    
    const tweet = await Tweet.findById(tweetId)
    if (!tweet) throw new ApiError(404, "Tweet not found");
    if (userId.toString()!==tweet.owner.toString()) throw new ApiError(403, "User can only update their own tweet");

    const existingTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        { $set: {content: content} },
        { new: true }
    )
    if (!existingTweet) throw new ApiError(500, "Something went wrong while updating the tweet");

    return res
    .status(200)
    .json(new ApiResponse(200, existingTweet, "Tweet updated successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const tweetId = req.params
    const userId = req.user?._id
    if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid Tweet ID");
    if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid User ID");

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) throw new ApiError(404, "Tweet not found");

    if (userId.toString()!==tweet.owner.toString()) throw new ApiError(403, "User can only delete their own tweet");

    const deleteTweet = await Tweet.findByIdAndDelete(tweetId)
    if (!deleteTweet || deleteTweet.length===0) throw new ApiError(500, "Something went wrong while deleting the tweet");

    return res
    .status(200)
    .json(new ApiResponse(200, deleteTweet, "Tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}