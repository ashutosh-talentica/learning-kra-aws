variable "aws_region" {
  description = "The AWS region"
  type        = string
  default     = "us-east-1"
}

variable "localstack_endpoint" {
  description = "The LocalStack endpoint URL"
  type        = string
  default     = "http://localhost:4566"
}

variable "s3_bucket_name" {
  description = "The name of the S3 bucket for task event artifacts"
  type        = string
  default     = "task-event-artifacts"
}

variable "sqs_queue_name" {
  description = "The name of the primary SQS queue"
  type        = string
  default     = "task-events"
}

variable "sqs_dlq_name" {
  description = "The name of the SQS Dead Letter Queue"
  type        = string
  default     = "task-events-dlq"
}
