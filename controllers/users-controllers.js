require("dotenv").config();
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_KEY = process.env.JWT_SIGNATURE;
const HttpError = require("../models/http-error");
const User = require("../models/user");
const uploadImage = require("./gcloud-controllers");

const getUserById = async (req, res, next) => {
  const userId = req.params.uid;
  let user;

  try {
    user = await User.findById(userId);
  } catch (err) {
    return next(new HttpError(err, 500));
  }

  if (!user) {
    return next(
      new HttpError("Could not find an user for the provided id.", 404)
    );
  }

  res.json({ user: user.toObject({ getters: true }) }); // => { place } => { place: place }
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid inputs, please try again!", 422));
  }

  const { name, email, introduction, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    return next(new HttpError(err, 500));
  }

  if (existingUser) {
    return next(new HttpError("User existed already", 422));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(new HttpError(err, 500));
  }

  let url;
  try {
    const file = req.file;
    url = await uploadImage(file);
  } catch (err) {
    return next(new HttpError(err, 401));
  }

  const createdUser = new User({
    name,
    introduction,
    email,
    image: url,
    password: hashedPassword,
    photos: []
  });

  try {
    await createdUser.save();
  } catch (err) {
    return next(new HttpError(err, 500));
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: createdUser.id,
        email: createdUser.email
      },
      JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(new HttpError(err, 500));
  }

  res.status(201).json({
    userId: createdUser.id,
    email: createdUser.email,
    token: token
  });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    return next(
      new HttpError("Logging in failed, please try again later.", 500)
    );
  }

  if (!existingUser) {
    return next(
      new HttpError("Invalid credentialssss, could not log you in.", 401)
    );
  }

  let matchedPassword = false;
  try {
    matchedPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(new HttpError("Something went wrong, please try again", 500));
  }

  if (!matchedPassword) {
    return next(new HttpError("Incorrect password, please try again.", 401));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token
  });
};

exports.getUserById = getUserById;
exports.signup = signup;
exports.login = login;
