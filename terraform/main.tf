terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region                      = var.aws_region
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  endpoints {
    s3  = var.localstack_endpoint
    sqs = var.localstack_endpoint
  }
}

# 1. S3 Bucket for Event Artifacts
resource "aws_s3_bucket" "task_event_artifacts" {
  bucket        = var.s3_bucket_name
  force_destroy = true

  tags = {
    Environment = "Local-POC"
    ManagedBy   = "Terraform"
    Project     = "AWS-Learning-POC"
  }
}

# 2. Dead Letter Queue (DLQ) for Poison Pill Events
resource "aws_sqs_queue" "task_events_dlq" {
  name                      = var.sqs_dlq_name
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Environment = "Local-POC"
    ManagedBy   = "Terraform"
  }
}

# 3. Main SQS Queue with Redrive Policy
resource "aws_sqs_queue" "task_events" {
  name                      = var.sqs_queue_name
  visibility_timeout_seconds = 30
  message_retention_seconds  = 86400 # 1 day

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.task_events_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Environment = "Local-POC"
    ManagedBy   = "Terraform"
  }
}
