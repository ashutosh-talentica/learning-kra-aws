const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || process.env.PORT || '3000', 10),
  db: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || 'taskdb',
    user: process.env.DATABASE_USER || 'taskuser',
    password: process.env.DATABASE_PASSWORD || 'taskpassword',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
  sqs: {
    queueName: process.env.SQS_QUEUE_NAME || 'task-events',
    queueUrl: process.env.SQS_QUEUE_URL || 'http://localhost:4566/000000000000/task-events',
  },
};
