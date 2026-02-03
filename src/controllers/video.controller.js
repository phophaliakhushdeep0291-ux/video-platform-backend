import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose, { mongo } from "mongoose";
import { User } from "../models/user.model.js";

const uploadVideo=asyncHandler(async(req,res)=>{
    const {title,description,isPublished} =  req.body
    if(!title||!description){
        throw new ApiError (400,"Title and description is required");
    }
    const localFileVideo=req.files?.videoFile[0]?.path
    const localFileThumbnail=req.files?.thumbnail[0]?.path
    if(!localFileVideo){
        throw new ApiError(400,"Video file is required")
    }
    const uploadedVideo=await uploadOnCloudinary(localFileVideo,"Video");
    if(!uploadedVideo?.secure_url){
        throw new ApiError(500,"Failed to upload");
    }
    let uploadedThumbnail=""
    if(localFileThumbnail){
        uploadedThumbnail=await uploadOnCloudinary(localFileThumbnail,"image");
        if(!uploadedThumbnail?.secure_url){
            throw new ApiError(500,"Failed to upload thumbnail")
        }
        uploadedThumbnail=uploadedThumbnail.secure_url;
    }
 const NewVideo=await Video.create({
    title,
    description,
    videoFile:uploadedVideo.secure_url,
    thumbnail:uploadedThumbnail,
    isPublished:isPublished!==undefined? isPublished:true,
    owner:req.user._id
 });
return res.status(201)
    .json(new ApiResponse(201,NewVideo,"Video uploaded successfully"))
    
})
const getVideoById=asyncHandler(async(req,res)=>{
    const {videoId}=req.params;
    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video ID")
    }
    const video=await Video.findById(videoId)
        .populate("owner","username fullname avatar")
    if(!video){
        throw new ApiError(404,"Video not found")
    }    
    if(!video.isPublished&&video.owner._id.toString()!==req.user?._id?.toString()){
        throw new ApiError(403,"This video is private")
    }
    video.views+=1
    await video.save({validateBeforeSave:false})
    if(req.user){
        await User.findByIdAndUpdate(
            req.user._id,
            {$addToSet:{watchHistory:videoId}}
        )
    }
    return res.status(200)
        .json(new ApiResponse(200,{},"Video fetch successfully"))
})
const updateVideo= asyncHandler(async(req,res)=>{
    const {videoId}=req.params;
    const {title,description,isPublished}=req.body
    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video ID")
    }
    const video=await Video.findOneAndUpdate(
        {_id:videoId,owner:req.user._id},
        {$set:{title:title,description:description,isPublished:isPublished}},
        {new:true, runValidators:true}
    )
    if(!video){
        throw new ApiError(404,"Video not found")
    }
    return res.status(200)
        .json(new ApiResponse(200,video,"Video updated successfully"))
})
const deleteVideo=asyncHandler(async(req,res)=>{
    const {videoId}=req.params
    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video Id")
    }
    const video = await Video.findOneAndDelete(
        { _id: videoId, owner: req.user._id },
    )
    if(!video){
        throw new ApiError(404,"Video not found")
    }
    if(video.videoFile){
        await deleteFromCloudinary(video.videoFile,"video")
    }
    if(video.thumbnail){
        await deleteFromCloudinary(video.thumbnail,"image")
    }
    return res.status(200)
        .json(new ApiResponse(200,{},"Video deleted successfully"))
})
const togglePublishStatus = asyncHandler(async(req,res)=>{
    const {videoId}=req.params
    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video Id")
    }
    const video = await Video.findOneAndUpdate(
        { _id: videoId, owner: req.user._id },
        { $bit: { isPublished: { xor: 1 } } },
        { new: true }
    )
    if(!video){
        throw new ApiError(404,"Video not found")
    }

    return res.status(200)
        .json(new ApiResponse(200,video,"Video publish status toggled successfully"))
})

export {
    uploadVideo,
}