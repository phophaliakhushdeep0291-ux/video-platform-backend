import { Router } from "express";
import {uploadVideo,
    togglePublishStatus,
    deleteVideo,
    updateVideo,
    getVideoById,
    getAllVideos,} from "../controllers/video.controller.js";
import { uploadVideoFiles,uploadImage } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router=Router();

const uploadVideoAndThumbnail = uploadVideoFiles.fields([
  { name: "videoFile", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 }
]);
router.post("/upload", verifyJWT, uploadVideoAndThumbnail, uploadVideo);
router.route("/update/:videoId").patch(verifyJWT, updateVideo);
router.route("/getvideos").get(getAllVideos);
router.route("/toggle/:videoId/publish").patch(togglePublishStatus);
router.route("/delete/:videoId").delete(verifyJWT,deleteVideo);
router.route("/:videoId").get(getVideoById);

export default router