output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.task_event_artifacts.arn
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.task_event_artifacts.id
}

output "sqs_queue_url" {
  description = "URL of the primary SQS queue"
  value       = aws_sqs_queue.task_events.url
}

output "sqs_queue_arn" {
  description = "ARN of the primary SQS queue"
  value       = aws_sqs_queue.task_events.arn
}

output "sqs_dlq_url" {
  description = "URL of the dead-letter queue"
  value       = aws_sqs_queue.task_events_dlq.url
}
