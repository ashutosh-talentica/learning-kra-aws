# AWS Cloud Development Kit (CDK) Infrastructure

This directory contains the **AWS CDK** Infrastructure as Code (IaC) definition for the POC. It defines the cloud resources using JavaScript/TypeScript constructs.

## Resources Defined in CDK

- **Serverless Object Storage**: Amazon S3 bucket (`task-event-artifacts`) with encryption and removal policies.
- **Serverless Messaging**: Amazon SQS queue (`task-events`) with Dead Letter Queue (`task-events-dlq`) and redrive policies.
- **Microservices IAM Roles**: Least-privilege IAM roles for the API microservice (`sqs:SendMessage`) and Worker microservice (`sqs:ReceiveMessage`, `s3:PutObject`).

## Usage

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Synthesize CloudFormation Template**:
   ```bash
   npx cdk synth
   ```

3. **Deploy to AWS / LocalStack**:
   ```bash
   # For LocalStack (via cdklocal):
   cdklocal deploy

   # Or standard AWS:
   npx cdk deploy
   ```
