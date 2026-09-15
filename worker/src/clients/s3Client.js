const { S3Client } = require('@aws-sdk/client-s3');
const config = require('../config');

const s3Client = new S3Client({
  region: config.aws.region,
  endpoint: config.aws.endpoint,
  forcePathStyle: true, // Required for LocalStack S3 compatibility
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

module.exports = {
  s3Client,
};
