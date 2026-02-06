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
router.post("/videos", verifyJWT, uploadVideoAndThumbnail, uploadVideo);
router.route("/videos/:id").patch(verifyJWT, updateVideo);

router.route("/videos/:id/publish").patch(togglePublishStatus);
router.route("/videos/:id").delete(verifyJWT,deleteVideo);
router.route("/videos/:id").get(getVideoById);
router.route("/videos").get(getAllVideos);
export default router