#!/usr/bin/env node
const cdk = require('aws-cdk-lib');
const { AwsPocStack } = require('../lib/aws-poc-stack');

const app = new cdk.App();

new AwsPocStack(app, 'AwsLearningPocStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '000000000000',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Cloud-Native AWS Learning POC: S3, SQS, IAM, Microservices, and Serverless Infrastructure',
});

app.synth();
