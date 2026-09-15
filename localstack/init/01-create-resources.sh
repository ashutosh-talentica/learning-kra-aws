#!/usr/bin/env bash

echo "=========================================="
echo "Initializing LocalStack AWS Resources..."
echo "=========================================="

REGION="${AWS_DEFAULT_REGION:-us-east-1}"

# 1. Create S3 Bucket
echo "Creating S3 bucket: task-event-artifacts..."
awslocal s3 mb s3://task-event-artifacts --region "${REGION}" 2>/dev/null || true

# 2. Create SQS Dead Letter Queue (DLQ)
echo "Creating SQS DLQ: task-events-dlq..."
awslocal sqs create-queue --queue-name task-events-dlq --region "${REGION}" 2>/dev/null || true

# 3. Create Main SQS Queue
echo "Creating SQS Queue: task-events..."
awslocal sqs create-queue --queue-name task-events --region "${REGION}" 2>/dev/null || true

echo "=========================================="
echo "LocalStack Resources Initialized Successfully!"
echo "=========================================="
