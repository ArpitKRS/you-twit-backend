import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const subscriberId = req.user?._id
    if (!isValidObjectId(channelId)) throw new ApiError(400, "Invalid Channel ID");
    if (!req.user) throw new ApiError(400, "User needs to login to subscribe to any channel");
    if (subscriberId.toString() === channelId.toString()) throw new ApiError(400, "User cannot subscribe to their own channel");

    const existingSubscription = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId
    })

    if (existingSubscription) {
        await Subscription.findByIdAndDelete(existingSubscription._id)
        return res
        .status(200)
        .json(new ApiResponse(200, existingSubscription, "Unsubscribed successfully"))
    }

    // If not, then have to create a new subscription
    const subscription = await Subscription.create({ subscriber: subscriberId, channel: channelId })
    if (!subscription) throw new ApiError(500, "Something went wrong while subscribing the channel");

    return res
    .status(200)
    .json(new ApiResponse(200, subscription, "Subscribed successfully"))
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if (!isValidObjectId(channelId)) throw new ApiError(400, "Invalid Channel ID");

    const subscriberDocs = await Subscription.find({channel: channelId}).populate("subscriber", "_id name email");
    if (!subscriberDocs || subscriberDocs.length===0) throw new ApiError(404, "No subscribers found for this channel");

    return res
    .status(200)
    .json(new ApiResponse(200, subscriberDocs, "Subscribers list fetched successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if (!isValidObjectId(subscriberId)) throw new ApiError(400, "Invalid Subscriber ID");

    const channelDocs = await Subscription.find({subscriber: subscriberId}).populate("channel", "_id name email")
    if (!channelDocs || channelDocs.length===0) throw new ApiError(404, "No subscribed channels found for this subscriber");

    return res
    .status(200)
    .json(new ApiResponse(200, channelDocs, "Subscribed channels list fetched successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}