import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";




const videoSchema =new Schema(
    {
        videoFile:{
            type:String,
            required:true,
        },
        thumbnail:{
            type:String,
            required:true,
        },
        title:{
            type:String,
            required:true,
        },
        description:{
            type:String,
            required:true,
        },
        views:{
            type:Number,
            default: 0
        },
        isPublished:{
            type:Boolean,
            // default:true,
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref:"User"
        },
        likes:{
            type:Number,
            default:0
        }
        
    },
    {
        timestamps:true,
    }
)
videoSchema.index(
  { title: "text", description: "text" },
  { weights: { title: 5, description: 1 } }
);

videoSchema.plugin(mongooseAggregatePaginate)
videoSchema.index({ isPublished: 1, createdAt: -1 });
videoSchema.index({ views: -1 });
videoSchema.index({ likes: -1 });
export const Video=mongoose.model("Video",videoSchema)