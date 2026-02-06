import mongoose from "mongoose";
import dotenv from "dotenv";
import { Video } from "../models/video.model.js";

dotenv.config();

const DB_NAME = "videotube"; // Your database name
const MONGODB_URI = process.env.MONGODB_URI;

const seedVideos = async () => {
  try {
    // Connect to MongoDB Atlas (no extra options needed in Mongoose 7+)
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log("✅ MongoDB connected");

    // Remove old videos
    await Video.deleteMany({});
    console.log("🧹 Old videos removed");

    const dummyOwnerId = new mongoose.Types.ObjectId();

    const videos = [];
    for (let i = 1; i <= 1000; i++) {
      videos.push({
        videoFile: `https://dummy.cdn/videos/video_${i}.mp4`,
        thumbnail: `https://dummy.cdn/thumbnails/thumb_${i}.jpg`,
        title: `Learning Backend Video ${i}`,
        description: `This is a test video number ${i} for performance testing`,
        views: Math.floor(Math.random() * 100000),
        likes:Math.floor(Math.random()*100000),
        isPublished: true,
        owner: dummyOwnerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await Video.insertMany(videos);
    console.log("🚀 10,000 videos inserted successfully");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedVideos();
