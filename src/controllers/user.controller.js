import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import User from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const loginUser = asyncHandler(async (req, res) =>{
    // req body -> data
    const {email, username, password} = req.body

    // username or email
    if (!(username || email)) throw new ApiError(400, "username or email is required");

    //find the user
    const user = await User.findOne({$or: [{username}, {email}]})
    if (!user) throw new ApiError(404, "User does not exist");

    //password check
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) throw new ApiError(401, "Invalid user credentials");

    //access and referesh token
    const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //send cookie
    const options = {httpOnly: true, secure: true}
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken},"User logged In Successfully"))
})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {httpOnly: true, secure: true}

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    // Fetching the incoming refresh token
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) throw new ApiError(401, "unauthorized request");

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) throw new ApiError(401, "Invalid refresh token");
    
        if (incomingRefreshToken !== user?.refreshToken) throw new ApiError(401, "Refresh token is expired or used");
    
        const options = {httpOnly: true, secure: true}
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "Access token refreshed"))
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }

})

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    const {fullname, email, username, password} = req.body
    // console.log(email);
    
    // validation - not empty
    if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required!")       
    }


    // check if user alreadt exists: email, username
    const existingUser = await User.findOne({
        $or: [{ email }, { username }]
    })
    if (existingUser) throw new ApiError(409, "User with this email or username already exists!")

    // check for images & avatar (on server)
    const avatarLocalPath = req.files?.avatar[0]?.path 
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) coverImageLocalPath = req.files.coverImage[0].path; 

    if (!avatarLocalPath) throw new ApiError(400, "Avatar is required!")

    // upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar) throw new ApiError(400, "Avatar is required!")

    // create user obj - create entry in db
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    })

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check for user creation
    if (!createdUser) throw new ApiError(500, "Unable to register user. Please try again later.")
        
    // return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully!")
    )
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) throw new ApiError(400, "Invalid password");

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body
    if (!fullname || !email) throw new ApiError(400, "All fields are required");

    const user = await User.findByIdAndUpdate(req.user?._id, {$set: { fullname, email }}, { new: true }).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing");

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) throw new ApiError(400, "Error while uploading the avatar")

    const user = await User.findByIdAndUpdate(req.user?._id, {$set: { avatar: avatar.url }}, { new: true }).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar changed succefully"))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) throw new ApiError(400, "Cover Image file is missing");

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.url) throw new ApiError(400, "Error while uploading the coverImage")

    const user = await User.findByIdAndUpdate(req.user?._id, {$set: { coverImage: coverImage.url }}, { new: true }).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image changed succefully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params
    if (!username?.trim()) throw new ApiError(400, "Username is missing");

    //Aggregation pipeline (IMPORTANT)
    const channel = await User.aggregate([
        {
            $match: { username: username?.toLowerCase() }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        // Merging the fields to fetch result
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: { 
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (!channel?.length) throw new ApiResponse(404, "Channel doesn't exist!");

    return res
    .status(200)
    .json( new ApiResponse(200, channel[0], "User channel fetched successully!") )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
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
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully"))
})

export {
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}