const taskConsumer = require('./consumers/taskConsumer');
const config = require('./config');

let isRunning = true;

async function startWorker() {
  console.log(
    JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      service: 'task-worker',
      message: 'Task Worker started. Listening for SQS events...',
      queue: config.sqs.queueName,
      bucket: config.s3.bucketName,
      endpoint: config.aws.endpoint,
    })
  );

  while (isRunning) {
    await taskConsumer.pollMessages();
  }

  console.log('[Worker] Polling loop terminated.');
}

function handleShutdown(signal) {
  console.log(`[Worker] Received ${signal}. Shutting down worker gracefully...`);
  isRunning = false;
  // Give time for current processing to complete
  setTimeout(() => {
    console.log('[Worker] Process exiting.');
    process.exit(0);
  }, 1000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startWorker().catch((err) => {
  console.error('[Worker] Fatal error in worker loop:', err);
  process.exit(1);
});
