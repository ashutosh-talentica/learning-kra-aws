const cdk = require('aws-cdk-lib');
const { Stack, Duration, RemovalPolicy, CfnOutput } = cdk;
const s3 = require('aws-cdk-lib/aws-s3');
const sqs = require('aws-cdk-lib/aws-sqs');
const iam = require('aws-cdk-lib/aws-iam');

class AwsPocStack extends Stack {
  /**
   * @param {cdk.App} scope
   * @param {string} id
   * @param {cdk.StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // 1. Serverless Object Storage: S3 Bucket for Event Artifacts
    const artifactBucket = new s3.Bucket(this, 'TaskEventArtifactsBucket', {
      bucketName: 'task-event-artifacts',
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // 2. Serverless Messaging: Dead Letter Queue (DLQ)
    const taskEventsDlq = new sqs.Queue(this, 'TaskEventsDlq', {
      queueName: 'task-events-dlq',
      retentionPeriod: Duration.days(14),
    });

    // 3. Serverless Messaging: Main SQS Queue with Redrive Policy
    const taskEventsQueue = new sqs.Queue(this, 'TaskEventsQueue', {
      queueName: 'task-events',
      visibilityTimeout: Duration.seconds(30),
      retentionPeriod: Duration.days(1),
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: taskEventsDlq,
      },
    });

    // 4. IAM Roles for Microservices (Least-Privilege Principle)
    
    // API Microservice Execution Role (Can only send messages to SQS)
    const apiServiceRole = new iam.Role(this, 'ApiServiceRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'IAM role granting API microservice permissions to publish to SQS',
    });
    taskEventsQueue.grantSendMessages(apiServiceRole);

    // Worker Microservice Execution Role (Can consume SQS & put objects in S3)
    const workerServiceRole = new iam.Role(this, 'WorkerServiceRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'IAM role granting Worker microservice permissions to consume SQS and write to S3',
    });
    taskEventsQueue.grantConsumeMessages(workerServiceRole);
    artifactBucket.grantReadWrite(workerServiceRole);

    // 5. Stack Outputs
    new CfnOutput(this, 'S3BucketName', {
      value: artifactBucket.bucketName,
      description: 'S3 Bucket Name for Task Event Artifacts',
    });

    new CfnOutput(this, 'S3BucketArn', {
      value: artifactBucket.bucketArn,
      description: 'S3 Bucket ARN',
    });

    new CfnOutput(this, 'SqsQueueUrl', {
      value: taskEventsQueue.queueUrl,
      description: 'SQS Primary Queue URL',
    });

    new CfnOutput(this, 'SqsQueueArn', {
      value: taskEventsQueue.queueArn,
      description: 'SQS Primary Queue ARN',
    });

    new CfnOutput(this, 'SqsDlqUrl', {
      value: taskEventsDlq.queueUrl,
      description: 'SQS Dead Letter Queue URL',
    });
  }
}

module.exports = { AwsPocStack };
