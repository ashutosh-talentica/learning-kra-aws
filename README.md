# Cloud-Native AWS Learning POC

> A production-like, locally executable Task Management application demonstrating AWS cloud-native architecture concepts without requiring an AWS account or incurring any cloud costs.

---

## Architecture Overview

```text
                             ┌────────────────────────┐
                             │         Client         │
                             │     (curl / Postman)   │
                             └───────────┬────────────┘
                                         │ :8080
                                         v
                             ┌────────────────────────┐
                             │         Nginx          │
                             │     Reverse Proxy      │
                             │ (ALB / API Gateway)    │
                             └───────────┬────────────┘
                                         │ :3000
                                         v
                             ┌────────────────────────┐
                             │       Node.js API      │
                             │   (ECS Fargate Task)   │
                             └───────────┬────────────┘
                                         │
                         ┌───────────────┴───────────────┐
                         │                               │
                         v                               v
             ┌───────────────────────┐       ┌───────────────────────┐
             │      PostgreSQL       │       │       LocalStack      │
             │       Database        │       │       (SQS Queue)     │
             │ (Amazon RDS Postgres) │       │      "task-events"    │
             └───────────────────────┘       └───────────┬───────────┘
                                                         │
                                                         v
                                             ┌───────────────────────┐
                                             │     Node.js Worker    │
                                             │   (ECS Async Worker)  │
                                             └───────────┬───────────┘
                                                         │
                                                         v
                                             ┌───────────────────────┐
                                             │       LocalStack      │
                                             │       (S3 Bucket)     │
                                             │"task-event-artifacts" │
                                             └───────────────────────┘
```

## Core Architectural Pillars

1. **Microservices Architecture**: Loosely coupled API and Worker microservices communicating through an asynchronous event bus.
2. **Serverless Architecture**: Event-driven execution leveraging serverless messaging (SQS), serverless object storage (S3), and serverless compute primitives (AWS Lambda / Fargate).
3. **AWS CDK & Infrastructure as Code**: Programmatic cloud provisioning with **AWS CDK** (`aws-cdk-lib`) alongside declarative Terraform.

---

## Technology Stack

- **Runtime & Language**: Node.js 20 LTS (JavaScript)
- **Web Framework**: Express.js
- **Database**: PostgreSQL 15 (RDS / Aurora Serverless concept)
- **Local AWS Emulation**: LocalStack (SQS & S3)
- **AWS SDK**: AWS SDK for JavaScript v3 (`@aws-sdk/client-sqs`, `@aws-sdk/client-s3`)
- **Infrastructure as Code**: **AWS CDK** (JavaScript/TypeScript) & Terraform
- **Reverse Proxy**: Nginx Alpine (ALB / API Gateway concept)
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions

---

## AWS Service Mapping

| Local POC Component | AWS Production Equivalent | Purpose |
|---|---|---|
| **API Docker Container** | **AWS ECS Fargate Task** | Serverless containerized application compute |
| **Worker Docker Container** | **AWS ECS Background Worker** | Asynchronous event consumer compute |
| **PostgreSQL Container** | **Amazon RDS PostgreSQL** | Managed relational database |
| **LocalStack SQS** | **Amazon SQS** | Decoupled asynchronous messaging |
| **LocalStack S3** | **Amazon S3** | Durable event artifact object storage |
| **Nginx Reverse Proxy** | **AWS Application Load Balancer (ALB)** | Request routing, TLS termination, front-door gateway |
| **Docker Network** | **Amazon VPC** | Isolated private network environment |
| **JSON Structured Logs** | **Amazon CloudWatch Logs** | Centralized application observability |
| **Terraform** | **AWS Terraform / CloudFormation** | Declarative Infrastructure as Code |

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js](https://nodejs.org/) (v20+)
- (Optional) [Terraform](https://www.terraform.io/) (v1.0+)
- (Optional) [AWS CLI](https://aws.amazon.com/cli/) with `awslocal` wrapper

---

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd "AWS POC"
   ```

2. **Setup environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Start all services**:
   ```bash
   docker compose up --build
   ```

4. **Verify Health**:
   ```bash
   curl http://localhost:8080/health
   # Response: {"status":"UP","service":"task-api","timestamp":"..."}

   curl http://localhost:8080/ready
   # Response: {"status":"UP","service":"task-api","checks":{"database":"CONNECTED"},"timestamp":"..."}
   ```

---

## API Usage & End-to-End Walkthrough

### 1. Create a Task (Emits SQS Event)
```bash
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn AWS Cloud-Native Architecture",
    "description": "Understand ECS, SQS, S3, RDS, and ALB",
    "priority": "HIGH"
  }'
```

**Response (`201 Created`)**:
```json
{
  "id": "e9a05b38-54e7-4b8c-a6a9-e6118d2bf411",
  "title": "Learn AWS Cloud-Native Architecture",
  "description": "Understand ECS, SQS, S3, RDS, and ALB",
  "status": "TODO",
  "priority": "HIGH",
  "createdAt": "2026-09-15T00:00:00.000Z",
  "updatedAt": "2026-09-15T00:00:00.000Z"
}
```

### 2. List Tasks
```bash
curl "http://localhost:8080/api/tasks?page=1&limit=10"
```

### 3. Get Task by ID
```bash
curl http://localhost:8080/api/tasks/<task-id>
```

### 4. Update Task Status
```bash
curl -X PUT http://localhost:8080/api/tasks/<task-id> \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS",
    "priority": "HIGH"
  }'
```

### 5. Delete Task
```bash
curl -X DELETE http://localhost:8080/api/tasks/<task-id>
```

---

## Verifying Asynchronous S3 Artifact Processing

When a task is created, the API sends a `TaskCreated` event to SQS. The worker polls SQS, generates an artifact, and stores it in S3.

1. **Check Worker Logs**:
   ```bash
   docker compose logs worker
   ```
   You will see structured logs with:
   - `operation: "processEventSuccess"`
   - `objectKey: "events/<taskId>/<eventId>.json"`
   - `status: "COMPLETED"`

2. **Inspect S3 Objects via LocalStack**:
   ```bash
   docker compose exec localstack awslocal s3 ls s3://task-event-artifacts/events/ --recursive
   ```

---

## Demonstrating Asynchronous Resilience & Worker Recovery

To demonstrate how the decoupled architecture handles worker failures without losing user requests:

1. **Stop the Worker**:
   ```bash
   docker compose stop worker
   ```

2. **Create a new task while worker is offline**:
   ```bash
   curl -X POST http://localhost:8080/api/tasks \
     -H "Content-Type: application/json" \
     -d '{"title":"Resilience Test Task","priority":"MEDIUM"}'
   ```
   *Note: The API succeeds and persists the task to Postgres and queues the event in SQS.*

3. **Restart the Worker**:
   ```bash
   docker compose start worker
   ```

4. **Observe logs**:
   ```bash
   docker compose logs -f worker
   ```
   *The worker resumes, consumes the queued event from SQS, uploads the artifact to S3, and acknowledges the message.*

---

## Infrastructure as Code (Terraform)

You can inspect or apply the infrastructure resources via Terraform:

```bash
cd terraform
terraform init
terraform plan
terraform apply -auto-approve
```

---

## KRA Review Demo Script

1. **Architecture Walkthrough**: Present the reverse proxy (ALB), API (ECS), PostgreSQL (RDS), and LocalStack (SQS/S3) mapping.
2. **Synchronous Flow**: Call `POST /api/tasks` and verify task persisted in PostgreSQL.
3. **Asynchronous Flow**: Show SQS event consumed and verified in S3.
4. **Resilience Demonstration**: Stop worker, create task, restart worker, demonstrate zero data loss.
5. **Infrastructure as Code**: Demonstrate Terraform resource definitions.
6. **Production Evolution**: Walk through `docs/aws-mapping.md` explaining Multi-AZ RDS, IAM Task Roles, Secrets Manager, and Autoscaling.
