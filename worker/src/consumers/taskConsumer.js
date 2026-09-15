const os = require('os');
const {
  ReceiveMessageCommand,
  DeleteMessageCommand,
  CreateQueueCommand,
  GetQueueUrlCommand,
} = require('@aws-sdk/client-sqs');
const { PutObjectCommand, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { sqsClient } = require('../clients/sqsClient');
const { s3Client } = require('../clients/s3Client');
const config = require('../config');

class TaskConsumer {
  constructor() {
    this.workerHostname = os.hostname();
    this.isInitialized = false;
  }

  /**
   * Ensure SQS queue and S3 bucket exist before polling
   */
  async ensureResources() {
    if (this.isInitialized) return;

    // Ensure S3 Bucket exists
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: config.s3.bucketName }));
    } catch (err) {
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: config.s3.bucketName }));
        console.log(`[Worker] S3 bucket '${config.s3.bucketName}' verified/created.`);
      } catch (createErr) {
        // Ignore if already created
      }
    }

    // Ensure SQS Queue exists
    try {
      await sqsClient.send(new CreateQueueCommand({ QueueName: config.sqs.queueName }));
      console.log(`[Worker] SQS queue '${config.sqs.queueName}' verified/created.`);
    } catch (err) {
      // Ignore if already created
    }

    this.isInitialized = true;
  }

  /**
   * Process a single SQS message
   */
  async processMessage(message) {
    const startTime = Date.now();
    let parsedEvent;

    try {
      parsedEvent = JSON.parse(message.Body);
    } catch (parseErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          timestamp: new Date().toISOString(),
          service: 'task-worker',
          messageId: message.MessageId,
          error: `Failed to parse message body: ${parseErr.message}`,
        })
      );
      // Delete corrupt/unparseable message or let DLQ handle it
      return;
    }

    const { eventType, eventId, timestamp, requestId, payload } = parsedEvent;
    const taskId = payload?.taskId || 'unknown';
    const objectKey = `events/${taskId}/${eventId}.json`;

    console.log(
      JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        service: 'task-worker',
        requestId,
        operation: 'processEventStart',
        eventType,
        eventId,
        taskId,
      })
    );

    // Prepare JSON artifact for S3
    const artifact = {
      metadata: {
        eventId,
        eventType,
        eventTimestamp: timestamp,
        processedAt: new Date().toISOString(),
        processedByWorker: this.workerHostname,
        requestId,
      },
      task: payload,
    };

    // Upload artifact to S3
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.s3.bucketName,
          Key: objectKey,
          Body: JSON.stringify(artifact, null, 2),
          ContentType: 'application/json',
          Metadata: {
            'event-id': eventId || '',
            'task-id': taskId,
            'request-id': requestId || '',
          },
        })
      );

      // Delete message from SQS upon successful S3 write
      await sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: config.sqs.queueUrl,
          ReceiptHandle: message.ReceiptHandle,
        })
      );

      const processingDuration = Date.now() - startTime;
      console.log(
        JSON.stringify({
          level: 'info',
          timestamp: new Date().toISOString(),
          service: 'task-worker',
          requestId,
          operation: 'processEventSuccess',
          eventId,
          taskId,
          bucket: config.s3.bucketName,
          objectKey,
          processingDurationMs: processingDuration,
          status: 'COMPLETED',
        })
      );
    } catch (err) {
      const processingDuration = Date.now() - startTime;
      console.error(
        JSON.stringify({
          level: 'error',
          timestamp: new Date().toISOString(),
          service: 'task-worker',
          requestId,
          operation: 'processEventFailed',
          eventId,
          taskId,
          bucket: config.s3.bucketName,
          objectKey,
          processingDurationMs: processingDuration,
          error: err.message,
          status: 'FAILED',
        })
      );
      // Message is NOT deleted; SQS visibility timeout will trigger retry or DLQ
      throw err;
    }
  }

  /**
   * Poll SQS for messages
   */
  async pollMessages() {
    try {
      await this.ensureResources();

      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: config.sqs.queueUrl,
          MaxNumberOfMessages: config.sqs.maxNumberOfMessages,
          WaitTimeSeconds: config.sqs.waitTimeSeconds, // Long polling
          VisibilityTimeout: config.sqs.visibilityTimeout,
          MessageAttributeNames: ['All'],
        })
      );

      if (response.Messages && response.Messages.length > 0) {
        console.log(
          JSON.stringify({
            level: 'info',
            timestamp: new Date().toISOString(),
            service: 'task-worker',
            message: `Received ${response.Messages.length} message(s) from SQS`,
          })
        );

        for (const message of response.Messages) {
          try {
            await this.processMessage(message);
          } catch (err) {
            // Processing error logged; continue processing others
          }
        }
      }
    } catch (err) {
      // LocalStack might be temporarily initializing
      console.warn(
        JSON.stringify({
          level: 'warn',
          timestamp: new Date().toISOString(),
          service: 'task-worker',
          message: `SQS polling error (waiting to retry): ${err.message}`,
        })
      );
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
}

module.exports = new TaskConsumer();
