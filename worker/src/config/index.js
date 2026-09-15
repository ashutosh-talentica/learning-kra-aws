const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
  sqs: {
    queueName: process.env.SQS_QUEUE_NAME || 'task-events',
    queueUrl: process.env.SQS_QUEUE_URL || 'http://localhost:4566/000000000000/task-events',
    waitTimeSeconds: parseInt(process.env.SQS_WAIT_TIME_SECONDS || '10', 10),
    maxNumberOfMessages: parseInt(process.env.SQS_MAX_MESSAGES || '5', 10),
    visibilityTimeout: parseInt(process.env.SQS_VISIBILITY_TIMEOUT || '30', 10),
  },
  s3: {
    bucketName: process.env.S3_BUCKET_NAME || 'task-event-artifacts',
  },
};
