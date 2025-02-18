import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (_, res) => {
    try {
        return res
        .status(200)
        .json( new ApiResponse(200, {status: "OK"}, "Server is already running...") )
    } catch (error) {
        throw new ApiError(500, "Something went wrong during Healthcheck")
    }
})

export { healthcheck }
    