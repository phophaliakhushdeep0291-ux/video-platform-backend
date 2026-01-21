import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
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
        username: username.toLowerCase()
    })
    const createdUser=await User.findById(user._id).select(
        "-password -RefereshToken"
    )

    if (!createdUser) {
        throw new ApiError(500,"something went wrong while registering the user")
    }
    return res.status(201).json(
        new ApiResponse(200, createdUser,"user registered succesfully")
    )
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
            $set:{
                RefreshToken: undefined
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
        const decodedtoken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user=await User.findById(decodedtoken?._id)
    
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


export {registerUser,loginUser,logoutUser,refreshAccessToken}