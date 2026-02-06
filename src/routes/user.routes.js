import { Router } from "express";
import {  registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetail,
    updateUserAvatar,
    updateUserCoverImage,
    verifyEmail,
    resendEmailVerification,
    resetPasswordWithOtp,
    forgotPassword,
    resendForgotPasswordOtp,
    getWatchHistory,
    getUserChannelProfile,} from "../controllers/user.controller.js";
import { uploadImage } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    uploadImage.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        },
    ]),
    registerUser
)
router.route("/login").post(loginUser)


//secured routes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/verify-email/:token").get(verifyEmail)
router.route("/resend-verification").post(verifyJWT,resendEmailVerification)
router.route("/change-password").patch(verifyJWT,changeCurrentPassword)
router.route("/update-account").patch(verifyJWT,updateAccountDetail)
router.route("/me/avatar").patch(verifyJWT,uploadImage.single("avatar"),updateUserAvatar)
router.route("/me").get(verifyJWT,getCurrentUser)
router.route("/me/cover").patch(verifyJWT,uploadImage.single("coverImage"),updateUserCoverImage)
router.route("/forgot-password").post(forgotPassword)
router.route("/reset-password").patch(resetPasswordWithOtp)
router.route("/resend-otp").post(resendForgotPasswordOtp)
router.route("/watch-history").get(verifyJWT,getWatchHistory)
router.route("/users/:username").get(verifyJWT,getUserChannelProfile)
export default router