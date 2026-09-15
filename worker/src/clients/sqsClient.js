const { SQSClient } = require('@aws-sdk/client-sqs');
const config = require('../config');

const sqsClient = new SQSClient({
  region: config.aws.region,
  endpoint: config.aws.endpoint,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

module.exports = {
  sqsClient,
};
