import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose, { mongo } from "mongoose";
import { User } from "../models/user.model.js";
import { use } from "react";
import { create } from "domain";
import { title } from "process";

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
    const uploadedVideo=await uploadOnCloudinary(localFileVideo,"video");
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
    const videoagg=await Video.aggregate([
        {$match:{_id:mongoose.Types.ObjectId(videoId)}},
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"ownerDetails"
            }
        },
        {$unwind:"$ownerDetails"},
        {$match:{
            $or:[
                {isPublished:true},
                {"ownerDetails._id":mongoose.Types.ObjectId(req.user?._id)}
            ]
        }},
        {
            $set:{
                views:{$add:["$views",1]}
            }
        },
        {
            $project:{
                title:1,
                description:1,
                videoFile:1,
                thumbnail:1,
                isPublished:1,
                views:1,
                createdAt:1,
                updatedAt:1,
                "owner._id":"$ownerDetails._id",
                "owner.username":"$ownerDetails.username",
                "owner.fullname":"$ownerDetails.fullname",
                "owner.avatar":"$ownerDetails.avatar"
            }
        }
    ]);
        
    if(!videoagg||videoagg.length==0){
        throw new ApiError(403,"This Video is private or does not exist")
    }
    const video=videoagg[0];
    await Video.updateOne(
        {_id: videoId},
        {$inc:{views:1}}
    )
    if(req.user){
        await User.findByIdAndUpdate(
            req.user._id,
            {$addToSet:{watchHistory:[{video: videoId,lastWatchedAt:Date.now(),lastPosition:123}]}}
        )
    }
    return res.status(200)
        .json(new ApiResponse(200,video,"Video fetch successfully"))
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
const getAllVideos=asyncHandler(async(req,res)=>{
    const page=parseInt(req.query.page)||1;
    const limit=parseInt(req.query.limit)||10;
    
    const now= new Date();
    const start =Date.now();
    const aggregate= Video.aggregate([
        {
            $match:{isPublished:true}
        },
        {
            $set:{
                ageInDays:{
                    $divide:[
                        {$subtract:[now,"$createdAt"]},
                        1000*60*60*24
                    ]
                },
                score:{
                    $add:[
                        {$multiply:["$views",0.5]},
                        {
                            $multiply:[
                            {$divide:[1,{$add:["$ageInDays",1]}]},
                            0.3
                            ]
                        },{
                            $multiply: [{ $ifNull: ["$likes", 0] }, 0.2]
                        }
                    ]
                }
            }
        },
        {
            $sort:{
                score:-1,
            }
        },
        // {
        //     $limit:limit
        // },
        // {
        //     $lookup:{
        //         from:"users",
        //         localField:"owner",
        //         foreignField:"_id",
        //         as:"owner"
        //     }
        // },
        // {$unwind:"$owner"},
        // {
        //     $project:{
        //         title:1,
        //         thumbnail:1,
        //         views:1,
        //         ageInDays:1,
        //         "owner.username":1,
        //         "owner.avatar":1,
        //     }
        // }
    ])
    const end=Date.now();
    const options={page,limit};
    const result =await Video.aggregatePaginate(aggregate,options);
    return res.status(200)
        .json(new ApiResponse(200,{
            getVideo:result.docs,
            page:result.page,
            limit:result.limit,
            count:result.totalDocs,
            totalPages:result.totalPages,
            executionTimeMs:end-start,
        },"Videos fetched successfully"))
            
})

export {
    uploadVideo,
    togglePublishStatus,
    deleteVideo,
    updateVideo,
    getVideoById,
    getAllVideos,
}