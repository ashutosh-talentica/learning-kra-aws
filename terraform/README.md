# Terraform Infrastructure as Code (LocalStack)

This directory contains Terraform definitions to provision AWS-compatible resources (S3 and SQS) locally inside LocalStack.

## Prerequisites

- [Terraform](https://www.terraform.io/) (v1.0+)
- LocalStack container running (via `docker compose up -d localstack`)

## Usage

1. **Initialize Terraform**:
   ```bash
   terraform init
   ```

2. **Review the Execution Plan**:
   ```bash
   terraform plan
   ```

3. **Apply Infrastructure to LocalStack**:
   ```bash
   terraform apply -auto-approve
   ```

4. **Verify Resources in LocalStack**:
   ```bash
   aws --endpoint-url=http://localhost:4566 s3 ls
   aws --endpoint-url=http://localhost:4566 sqs list-queues
   ```

5. **Clean Up**:
   ```bash
   terraform destroy -auto-approve
   ```

> **Note**: In our Docker Compose environment, LocalStack auto-provisions these resources on startup via `localstack/init/01-create-resources.sh`. Terraform is provided here as an alternative Infrastructure as Code demonstration.
