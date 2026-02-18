import multer from "multer";

const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "/tmp")
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname)
  }
})

export const uploadImage = multer({
  storage: imageStorage,
})

const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "/tmp")
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname)
  }
})

export const uploadVideoFiles = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }
});