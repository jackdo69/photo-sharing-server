const { Storage } = require("@google-cloud/storage");
const path = require("path");
const util = require("util");
const { format } = util;

const uploadImage = file =>
new Promise((resolve, reject) => {
  const { originalname, buffer } = file;

  const storage = new Storage({
    projectId: process.env.GCLOUD_PROJECT_ID,
    keyFilename: path.join(__dirname, "./key.json")
  });
  const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);
  const blob = bucket.file(originalname.replace(/ /g, "_"));
  const blobStream = blob.createWriteStream({
    resumable: false
  });

  blobStream
    .on("finish", () => {
      const publicUrl = format(
        `https://storage.googleapis.com/${bucket.name}/${blob.name}`
      );
      resolve(publicUrl);
    })
    .on("error", () => {
      reject(`Unable to upload image, something went wrong`);
    })
    .end(buffer);
});

module.exports = uploadImage