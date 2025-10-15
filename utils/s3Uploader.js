const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function uploadProfileImage(localFilePath, filename) {
  const fileStream = fs.createReadStream(localFilePath);

  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `profile/${filename}`,
    Body: fileStream,
    ContentType: 'image/jpeg' // or infer type dynamically
  };

  await s3.send(new PutObjectCommand(uploadParams));

  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/profile/${filename}`;
}

module.exports = { uploadProfileImage };
