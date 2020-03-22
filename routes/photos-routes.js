const express = require("express");
const router = express.Router();
const photosControllers = require("../controllers/photos-controllers");
const fileUpload = require("../middleware/file-upload");
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");

router.get("/", photosControllers.getPhotos);
router.get('/user/download/:pid', photosControllers.downloadPhoto);
router.get("/user/:uid", photosControllers.getUploadedPhotosByUserId);
router.get("/user/like/:uid", photosControllers.getLikedPhotosByUserId);
router.patch("/:pid", photosControllers.updatePhoto);
router.patch("/user/like", photosControllers.likePhoto);


router.use(checkAuth);

router.post(
  "/",
  fileUpload.single("image"),
  [
    check("name")
      .not()
      .isEmpty(),
    check("description").isLength({ min: 5 })
  ],
  photosControllers.uploadPhoto
);


router.delete("/:pid", photosControllers.deletePhoto);

module.exports = router;
