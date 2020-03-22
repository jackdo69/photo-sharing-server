require("dotenv").config();
const fs = require("fs");
const path = require("path");
const PASSWORD = process.env.MONGO_DB_PASSWORD;
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const usersRoutes = require("./routes/users-routes");
const photosRoutes = require("./routes/photos-routes");
const HttpError = require("./models/http-error");
const app = express();

app.use(bodyParser.json());
//Make sure we can serve static images from the server
//So user image can be seen from the client
app.use("/uploads/images", express.static(path.join("uploads", "images")));

//Fixing the CORS errors
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

app.use("/api/users", usersRoutes); //Filter the routes
app.use("/api/photos", photosRoutes); //Filter the routes

//Error for unknown route
app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});


app.use((error, req, res, next) => {
  //Check if there is any file in the request
  // if (req.file) {
  //   fs.unlink(req.file.path, (err) => {
  //     console.log(err);
  //   });
  // }

  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message });
});

mongoose
  .connect(
    `mongodb+srv://jack:${PASSWORD}@cluster0-vfzco.mongodb.net/photos-sharing?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(process.env.PORT || 5000);
  })
  .catch(err => {
    console.log(err);
  });
