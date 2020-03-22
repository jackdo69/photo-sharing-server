const fs = require("fs");
const Photo = require("../models/photo");
const User = require("../models/user");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const HttpError = require("../models/http-error");
const uploadImage = require("./gcloud-controllers");

const uploadPhoto = async (req, res, next) => {
  let url;
  try {
    const file = req.file;
    url = await uploadImage(file);
  } catch (err) {
    return next(new HttpError(err, 401));
  }

  const { name, description, creator } = req.body;
  const uploadedPhoto = new Photo({
    name,
    description,
    image: url,
    creator: creator
  });

  let user;
  try {
    user = await User.findById(creator);
  } catch (err) {
    return next(
      new HttpError("Uploading photo failed, please try again...", 500)
    );
  }

  if (!user) {
    return next(new HttpError("Could not find user for provided id", 404));
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await uploadedPhoto.save({ session: sess });
    user.photos.push(uploadedPhoto);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    return next(new HttpError(err, 500));
  }
  res.status(201).json({ photo: uploadedPhoto });
};

const updatePhoto = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(err, 422));
  }

  const { name, description, creator } = req.body;
  const photoId = req.params.pid;

  let photo;
  try {
    photo = await Photo.findById(photoId);
  } catch (err) {
    return next(new HttpError("Could not find photo.", 500));
  }
  if (photo.creator.toString() !== creator) {
    return next(new HttpError("Could not find creator", 401));
  }

  photo.name = name;
  photo.description = description;

  try {
    await photo.save();
  } catch (err) {
    return next(new HttpError("Could not save photo.", 500));
  }

  res.status(200).json({ photo: photo.toObject({ getters: true }) });
};

const deletePhoto = async (req, res, next) => {
  const photoId = req.params.pid;
  let photo;

  try {
    photo = await Photo.findById(photoId).populate("creator");
  } catch (err) {
    return next(new HttpError(err, 500));
  }

  if (!photo) {
    return next(new HttpError("Could not find photo by this ID", 404));
  }

  const path = photo.image;
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await photo.remove({ session: sess });
    photo.creator.photos.pull(photo);
    await photo.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError("Something went wrong, coud not delete place.", 500)
    );
  }
  fs.unlink(path, err => {
    console.log(err);
  });

  res.status(200).json({ message: "Deleted photo." });
};

const likePhoto = async (req, res, next) => {
  let photo;
  let user;

  const { photoId, userId } = req.body;
  try {
    photo = await Photo.findById(photoId);
  } catch (err) {
    return next(new HttpError("Could not find photo.", 500));
  }
  try {
    user = await User.findById(userId);
  } catch (err) {
    return next(new HttpError("Could not find user.", 500));
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    user.likes.push(photo);
    await user.save({ session: sess });
    photo.likedBy.push(user);
    await photo.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    return next(new HttpError("Could not save like photo", 500));
  }

  res.status(200).json({ message: "Photo liked." });
};

const downloadPhoto = async (req, res, next) => {
  const photoId = req.params.pid;
  let photo;
  try {
    photo = await Photo.findById(photoId);
  } catch (err) {
    return next(new HttpError("Could not find the photo", 401));
  }
  let name = photo.name + ".jpg";
  res.download(photo.image, name);
};

const getPhotos = async (req, res, next) => {
  let photos;
  try {
    photos = await Photo.find();
  } catch (err) {
    return next(new HttpError(err, 500));
  }
  res.json({ photos: photos.map(photo => photo.toObject({ getters: true })) });
};

const getUploadedPhotosByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let photos;
  try {
    photos = await Photo.find({ creator: userId });
  } catch (err) {
    return next(new HttpError(err, 401));
  }
  res.json({ photos: photos.map(photo => photo.toObject({ getters: true })) });
};

const getLikedPhotosByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let photos;
  try {
    photos = await Photo.find({ likedBy: userId });
  } catch (err) {
    return next(new HttpError(err, 401));
  }

  res.json({ photos: photos.map(photo => photo.toObject({ getters: true })) });
};

exports.uploadPhoto = uploadPhoto;
exports.updatePhoto = updatePhoto;
exports.deletePhoto = deletePhoto;
exports.likePhoto = likePhoto;
exports.getPhotos = getPhotos;
exports.downloadPhoto = downloadPhoto;
exports.getLikedPhotosByUserId = getLikedPhotosByUserId;
exports.getUploadedPhotosByUserId = getUploadedPhotosByUserId;
