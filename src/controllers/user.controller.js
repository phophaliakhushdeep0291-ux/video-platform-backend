import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary,deleteFromCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { sendEmail } from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { validateHeaderName } from "http";
import { isStrongPassword } from "../utils/passwordValidator.js";
import { subscribe } from "diagnostics_channel";
import mongoose from "mongoose";
const generateAccessAndRefreshTokens= async(userId)=>{
    try {
        const user= await User.findById(userId)
        const AccessToken=user.generateAccessToken()
        const RefreshToken=user.generateRefreshToken()

        user.RefreshToken=RefreshToken
        await user.save({validateBeforeSave:false})
        return {AccessToken,RefreshToken}

    } catch (error) {
        throw new ApiError(500,"something went wrong while generating refresh and access token")
    }
}

const registerUser= asyncHandler(async(req,res)=>{
    //get user details from frontend
    //validation -not empty
    //check if user already exists: username,email
    //check for images ,check for avatar
    //upload them to cloudinary, avatar
    //create user object - create entry in dp
    //remove password and refresh token field from response
    //check for user creation 
    //return responce
    const {fullname,email,username,password}=req.body
    // console.log("email :",email);
    
    if([fullname,email,username,password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"All field are required")
    }
    if (!isStrongPassword(password)) {
        throw new ApiError(400,"Password must be at least 8 characters long, include a capital letter, a small letter, a number, and a special character.")
    }
    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })
    if (existedUser) {
        throw new ApiError(409,"this user or email already exist")
    }
    //console.log(req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage)&&req.files.coverImage.length>0){
        coverImageLocalPath= req.files.coverImage[0].path;
    }
    if(!avatarLocalPath){
        throw new ApiError(400,"this file is mandotary")
    }
    const avatar =await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }
    const user=await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url||"",
        email,
        password,
        username: username.toLowerCase(),
        isEmailVerified:false
    })
    const verificationToken=user.generateEmailVerificationToken();
    await user.save({validateBeforeSave:false});

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    const message = `
        <h1>Welcome to VideoTube!</h1>
        <p>Hi ${fullname},</p>
        <p>Thank you for registering! Please verify your email by clicking the link below:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #646cff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>Or copy this link: ${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create this account, please ignore this email.</p>
    `;
    try {
        await sendEmail({
           to:user.email,
           subject:"Email Verification - VideoTube",
           message
        });
    } catch (error) {
        user.emailVerificationToken=undefined;
        user.emailVerificationExpiry=undefined;
        await user.save({validateBeforeSave:false});
        console.error("Failed to send verification email:",error);
    }
    const createdUser=await User.findById(user._id).select(
        "-password -RefreshToken -emailVerificationToken -emailVerificationExpiry"
    )

    if (!createdUser) {
        throw new ApiError(500,"something went wrong while registering the user")
    }
    return res.status(201).json(
        new ApiResponse(201, createdUser,"user registered succesfully! Please check your email to verify your account.")
    )
})
const verifyEmail=asyncHandler(async(req,res)=>{
    const {token} =req.params;
    if(!token){
        throw new ApiError(400,"Verification token is required");
    }
    const hashedToken  = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpiry:{$gt:Date.now()}
    })
    if(!user){
        throw new ApiError(400,"Invalid or expired verification link")
    }
    user.isEmailVerified=true;
    user.emailVerificationToken=undefined
    user.emailVerificationExpiry=undefined

    await user.save({validateBeforeSave:false})
    return res
    .status(200)
    .json(new ApiResponse(200,{},"Email verified successfully"))
})
const resendEmailVerification=asyncHandler(async(req,res)=>{
    const user=await User.findById(req.user._id);
    if(!user){
        throw new ApiError(404,"User not found");
    }
    if(user.isEmailVerified){
        throw new ApiError(400,"Email arleady verified");
    }
    const verificationToken=user.generateEmailVerificationToken();
    await user.save({validateBeforeSave:false});

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const {fullname}=user;
    const message = `
        <h1>Welcome to VideoTube!</h1>
        <p>Hi ${fullname},</p>
        <p>Thank you for registering! Please verify your email by clicking the link below:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #646cff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>Or copy this link: ${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create this account, please ignore this email.</p>
    `;
    try {
        await sendEmail({
           to:user.email,
           subject:"Email Verification - VideoTube",
           message
        });
    } catch (error) {
        user.emailVerificationToken=undefined;
        user.emailVerificationExpiry=undefined;
        await user.save({validateBeforeSave:false});
        console.error("Failed to send verification email:",error);
    }
    return res.status(200).json(new ApiResponse(200,{},"Verification email resent successfully"))
})

const loginUser= asyncHandler(async (req,res)=>{
    // req body-> data
    //username or email
    //find the user
    //password check
    //access and refresh tocken
    //send cookie

    const{email,username,password}=req.body
    if(!(username||email)){
        throw new ApiError (400,"username or email is required")
    }
    const user=await User.findOne({
        $or:[{email},{username}]
    })
    if(!user){
        throw new ApiError(404,"User does not exist")
    }
    if(!user.isEmailVerified){
        throw new ApiError(403,"Please verify your email before logging in");
    }
    const isPasswordValid=await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Password is incorrect")
    }
    const {AccessToken,RefreshToken}= await generateAccessAndRefreshTokens(user._id)

    const loggedInUser=await User.findById(user._id).select("-password -RefreshToken")

    const options={
        httpOnly: true,
        secure: true,
    }
    return res.status(200)
    .cookie("AccessToken",AccessToken,options)
    .cookie("RefreshToken",RefreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser, AccessToken,RefreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate (
        req.user._id,
        {
            $unset:{
                RefreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options={
        httpOnly: true,
        secure: true,
    }
    return res
    .status(200)
    .clearCookie("AccessToken", options)
    .clearCookie("RefreshToken", options)
    .json(new ApiResponse(200,{},"User logged Out"))
})

const refreshAccessToken= asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.RefreshToken || req.body.RefreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

    try {
        const decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user=await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
        if(incomingRefreshToken!==user?.RefreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
        const {AccessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("AccessToken",AccessToken,options)
        .cookie("RefreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {AccessToken, RefreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message||"Invalid refresh token")
    }
})  

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body
    const user=await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }
    if (!isStrongPassword(newPassword)) {
        throw new ApiError(400,"Password must be at least 8 characters long, include a capital letter, a small letter, a number, and a special character.")
    }
    user.password=newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changed Successfully"))
})

const getCurrentUser= asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"current user fetched successfully"))

})

const updateAccountDetail= asyncHandler(async(req,res)=>{
    const {fullname,email} =req.body
    if(!fullname||!email){
        throw new ApiError(400,"All fields are required")
    }
    const user =await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname:fullname,
                email:email
            }
        },
        {new:true}
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account detail updated successfully"))

})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath= req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar")
    }
    const userBeforeUpdate = await User.findById(req.user?._id);
    const oldAvatarUrl = userBeforeUpdate?.avatar;

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")
    if(oldAvatarUrl){
        try {
            await deleteFromCloudinary(oldAvatarUrl);
        } catch (error) {
            console.error("Failed to delete old avatar:",error);
        }
    }
    return res
    .status(200)
    .json(new ApiResponse(200,user,"Avatar changed successfully"))
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath= req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"coverImage file is missing")
    }
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading coverImage")
    }
    const userBeforeUpdate=await User.findById(req.user?._id)
    const oldCoverImage=userBeforeUpdate?.coverImage
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")
    if(oldCoverImage){
        try {
            await deleteFromCloudinary(oldCoverImage);
        } catch (error) {
            console.error("Failed to delete old coverImage:",error)
        }
    }
    return res
    .status(200)
    .json(new ApiResponse(200,user,"Coverimage changed successfully"))
})

const forgotPassword=asyncHandler(async(req,res)=>{
    const {email} =req.body;
    const user=await User.findOne({email});
    if(!user){
        throw new ApiError(404,"User not found");
    }
    const otp=user.generateForgetPasswordToken();
    await user.save({validateBeforeSave:false});
    const resetLink=`${process.env.FRONTEND_URL}/verify-email/reset-password?token=${otp}&email=${email}`;
    const message = `
        <p>Hello ${user.fullname},</p>
        <p>Use the following OTP to reset your password:</p>
        <h1 style="font-size: 2em; font-weight: bold; color: #646cff;">${otp}</h1>
        <p>Or click this link to reset your password (auto-fills OTP):</p>
        <a href="${resetLink}" style="display:inline-block; padding:10px 20px; background-color:#646cff; color:white; text-decoration:none; border-radius:5px;">Reset Password</a>
        <p>This OTP will expire in 1 minute.</p>
        <p>If you didn’t request this, ignore this email.</p>
        `;
    try {
        await sendEmail({
            to:email,
            subject:"Reset your password",
            message
        });
    } catch (error) {
        console.error("Failed to send otp:",error);
        throw new ApiError(500, "Failed to send OTP");
    }
    res.status(200).json(new ApiResponse(200,{},"Password reset email sent"));
})
const resetPasswordWithOtp=asyncHandler(async(req,res)=>{
    const {email,otp,newPassword,confirmPassword}=req.body
    if(!email||!otp||!newPassword||!confirmPassword){
        throw new ApiError(400,"All fields are required");
    }
    if(newPassword.length < 6) {
        throw new ApiError(400, "Password must be at least 6 characters long");
    }

    if(newPassword!=confirmPassword){
        throw new ApiError(400,"Password do not match");
    }

    const user=await User.findOne({email});
    if(!user){
        throw new ApiError(404,"User not found")
    }
    const hashedOTP=crypto.createHash("sha256").update(otp).digest("hex")
    if(!user.forgotPasswordToken||user.forgotPasswordToken!==hashedOTP||!user.forgotPasswordExpiry||user.forgotPasswordExpiry<Date.now()){
        throw new ApiError(400,"Invalid or expired OTP");
    }
    if (user.otpRequests && user.otpRequests >= 5) {
        throw new ApiError(429, "Max OTP requests reached. Try again later.");
    }
    if (!isStrongPassword(newPassword)) {
        throw new ApiError(400,"Password must be at least 8 characters long, include a capital letter, a small letter, a number, and a special character.")
    }
    user.password=newPassword;
    user.forgotPasswordToken=undefined;
    user.forgotPasswordExpiry=undefined;
    user.otpRequests=0;
    user.lastOtpRequest= undefined;

    await user.save({validateBeforeSave:false});
    res.status(200)
    .json(new ApiResponse(200,{},"Password reset successfully"))
})
const resendForgotPasswordOtp = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) throw new ApiError(400, "Email is required");

    const user = await User.findOne({ email });
    if (!user) throw new ApiError(404, "User not found");

    const now=Date.now();

    if (user.lastOtpRequest && now - user.lastOtpRequest.getTime() < 60 * 1000) {
        throw new ApiError(429, "Please wait a minute before requesting a new OTP");
    }
    const otp = user.generateForgetPasswordToken();
    user.otpRequests=(user.otpRequests||0)+1;
    user.lastOtpRequest=now;
    await user.save({ validateBeforeSave: false });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?email=${email}&otp=${otp}`;

    const message = `
        <p>Hello ${user.fullname},</p>
        <p>Here’s your OTP to reset your password:</p>
        <h1 style="font-size: 2em; font-weight: bold; color: #646cff;">${otp}</h1>
        <p>Or click this link to reset your password (auto-fills OTP):</p>
        <a href="${resetLink}" style="display:inline-block; padding:10px 20px; background-color:#646cff; color:white; text-decoration:none; border-radius:5px;">Reset Password</a>
        <p>This OTP will expire in 1 minute.</p>
        <p>If you didn’t request this, ignore this email.</p>
    `;

    try {
        await sendEmail({
            to: email,
            subject: "Your password reset OTP",
            message,
        });
    } catch (error) {
        console.error("Failed to send OTP:", error);
        throw new ApiError(500, "Failed to send OTP");
    }

    res.status(200).json(new ApiResponse(200, {}, "OTP resent successfully"));
});

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params
    if(!username?.trim()){
        throw new ApiError(400,"Username is missing")
    }
    const channel=await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribeTo"
            }
        },
        {
            $addFields:{
                subscribesCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribeTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribesCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404,"Channel does not exist")
    }
    return res.status(200)
    .json(new ApiResponse(200,channel[0],"User channel fetched successfully"))
})
const getWatchHistory= asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id),

            },
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            },
        },
    ])
    return res.status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"Watch history fetched successfully"))
})
export {
    registerUser,
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
    getUserChannelProfile,
    getWatchHistory,
}