# System Architecture

## Overview

The **Cloud-Native AWS Learning POC** is a local, containerized application designed to demonstrate three core modern cloud paradigms:
1. **Microservices Architecture**: Independently deployable, loosely coupled services communicating via asynchronous event messaging.
2. **Serverless Architecture**: Event-driven execution utilizing serverless message queues (SQS), serverless object storage (S3), and serverless compute models (Lambda / ECS Fargate).
3. **Infrastructure as Code (AWS CDK & Terraform)**: Multi-paradigm cloud provisioning with TypeScript/JavaScript AWS CDK constructs and declarative Terraform.

---

## Architecture Diagram

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
                     ┌────────────────────────────────────────┐
                     │          API Microservice              │
                     │    (Node.js / ECS Fargate Task)        │
                     └───────────┬────────────────┬───────────┘
                                 │                │
            [Synchronous Store]  │                │  [Asynchronous Publish]
                                 v                v
                     ┌─────────────────┐  ┌───────────────────────────┐
                     │ PostgreSQL DB   │  │   Amazon SQS Queue        │
                     │ (Amazon RDS)    │  │   "task-events" (+ DLQ)   │
                     └─────────────────┘  └─────────────┬─────────────┘
                                                        │
                                            [Event Poll / Trigger]
                                                        │
                                                        v
                                          ┌───────────────────────────┐
                                          │     Worker Microservice   │
                                          │   (ECS Worker / Lambda)   │
                                          └─────────────┬─────────────┘
                                                        │
                                            [Serverless Object Store]
                                                        │
                                                        v
                                          ┌───────────────────────────┐
                                          │     Amazon S3 Bucket      │
                                          │  "task-event-artifacts"   │
                                          └───────────────────────────┘
```

---

## 1. Microservices Architecture Principles

This project implements fundamental microservices design patterns:

- **Service Decomposition**:
  - **API Microservice**: Handles client requests, input validation, database transactions, and event emission.
  - **Worker Microservice**: Dedicated consumer processing events and generating audit/archival artifacts in S3.
- **Loose Coupling & Asynchronous Messaging**:
  - The API and Worker do not communicate via blocking HTTP calls.
  - SQS acts as an event message broker, ensuring the API is never blocked by downstream worker latency or outages.
- **Failure Isolation**:
  - A crash or delay in the Worker service has zero impact on the API’s ability to accept new tasks.
- **Independent Scalability**:
  - The API can scale horizontally based on HTTP traffic (CPU/Memory or ALB request rate).
  - The Worker can scale independently based on SQS queue depth (`ApproximateNumberOfMessagesVisible`).

---

## 2. Serverless Architecture Principles

This architecture leverages AWS Serverless primitives:

- **Event-Driven Compute**:
  - Processing is driven strictly by event occurrences (`TaskCreated` messages).
  - In production AWS, the worker logic maps directly to **AWS Lambda** triggered by SQS event source mappings (`aws_lambda_event_source_mapping`), or serverless containers on **AWS ECS Fargate**.
- **Serverless Storage & Messaging**:
  - **Amazon S3**: Fully managed, serverless object storage providing high durability (11 9s) with automatic scaling and zero capacity management.
  - **Amazon SQS**: Serverless message queuing providing automated scaling, high throughput, and built-in dead-letter queues (DLQ).
- **Pay-per-Use & Zero Idle Overhead**:
  - True serverless patterns eliminate the need to provision or pay for idle virtual machines.

---

## 3. Infrastructure as Code: AWS CDK & Terraform

Cloud resources are defined using two leading Infrastructure as Code approaches:

1. **AWS CDK (`cdk/`)**:
   - Uses **JavaScript/TypeScript** to define high-level cloud abstractions (`aws-cdk-lib`).
   - Generates deterministic CloudFormation templates (`cdk synth`).
   - Features built-in least-privilege IAM grant methods (e.g. `taskEventsQueue.grantSendMessages(apiRole)`).
2. **Terraform (`terraform/`)**:
   - Declarative HCL definitions targeting LocalStack provider endpoints for cross-cloud compatibility.

---

## 4. Component Breakdown

| Component | Technology | Role in Architecture | AWS Serverless / Cloud Equivalent |
|---|---|---|---|
| **Reverse Proxy** | Nginx (`nginx:alpine`) | Single entry-point, routing `/api/*` and `/health` to the API. | **AWS Application Load Balancer (ALB) / API Gateway** |
| **API Microservice** | Node.js / Express | Synchronous REST API handling CRUD, validating inputs, emitting events. | **AWS ECS Fargate Task / Lambda + API Gateway** |
| **Worker Microservice** | Node.js / AWS SDK v3 | Asynchronous background daemon consuming SQS events and writing to S3. | **AWS Lambda (SQS Trigger) / ECS Fargate Worker** |
| **Database** | PostgreSQL (`postgres:15`) | Relational persistence for task entities with automated schema migrations. | **Amazon RDS PostgreSQL / Aurora Serverless** |
| **Message Queue** | LocalStack SQS | Serverless message queuing and dead-letter queueing. | **Amazon SQS** |
| **Object Storage** | LocalStack S3 | Serverless object storage for task event artifacts. | **Amazon S3** |
| **IaC** | AWS CDK + Terraform | Programmatic and declarative infrastructure definitions. | **AWS CDK / CloudFormation / Terraform** |

---

## 5. Data & Event Flows

### Task Creation & Event Publication
1. **Client** sends `POST /api/tasks` through Nginx (`:8080`).
2. **API Microservice** validates the payload and writes the task record to **PostgreSQL**.
3. **API Microservice** constructs a `TaskCreated` event and publishes it to **SQS** (`task-events`).
4. **API Microservice** returns `201 Created` with the task entity immediately (non-blocking).

### Asynchronous Event Ingestion & Archival
1. **Worker Microservice** consumes `TaskCreated` from **SQS**.
2. Worker parses event payload and constructs an enriched JSON metadata artifact.
3. Worker uploads the artifact to **S3** under `events/{taskId}/{eventId}.json`.
4. Upon successful S3 upload, Worker acknowledges and removes the message from **SQS**.
