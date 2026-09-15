# AWS Production Service Mapping & Architecture Evolution

This document details how every component in this local POC maps directly to AWS production services, focusing on **Microservices**, **Serverless Architecture**, and **AWS CDK**.

---

## 1. Local-to-AWS Component Mapping

| Local POC Component | AWS Production Equivalent | Architectural Role | Category |
|---|---|---|---|
| **API Microservice Container** | **AWS ECS Fargate / Lambda + API Gateway** | Synchronous REST compute | **Microservice / Serverless Compute** |
| **Worker Microservice Container** | **AWS Lambda (SQS Trigger) / ECS Fargate** | Asynchronous event processing | **Microservice / Serverless Compute** |
| **LocalStack SQS** | **Amazon SQS (Simple Queue Service)** | Decoupled asynchronous messaging buffer | **Serverless Messaging** |
| **LocalStack S3** | **Amazon S3 (Simple Storage Service)** | Durable JSON event artifact storage | **Serverless Storage** |
| **PostgreSQL Container** | **Amazon RDS PostgreSQL / Aurora Serverless** | Managed relational database | **Database** |
| **Nginx Reverse Proxy** | **AWS Application Load Balancer (ALB) / API Gateway** | Routing, TLS termination, front-door | **Networking / API Management** |
| **Docker Bridge Network** | **Amazon VPC (Subnets, NAT, Security Groups)** | Network isolation | **Networking** |
| **Structured JSON Logs** | **Amazon CloudWatch Logs & Metrics** | Centralized observability | **Observability** |
| **AWS CDK Stack (`cdk/`)** | **AWS Cloud Development Kit (CDK)** | Programmatic TypeScript/JS IaC | **Infrastructure as Code** |
| **Terraform (`terraform/`)** | **AWS Terraform Provider** | Declarative multi-cloud IaC | **Infrastructure as Code** |
| **GitHub Actions** | **AWS CodePipeline / GitHub Actions + OIDC** | Automated CI/CD pipeline | **DevOps / CI/CD** |

---

## 2. Microservices Architecture & Boundaries

```text
       ┌─────────────────────────────────┐
       │   API Microservice Domain       │
       │  - Task CRUD operations         │
       │  - Input validation & auth      │
       │  - PostgreSQL persistence       │
       │  - Event publication            │
       └────────────────┬────────────────┘
                        │
                        │ [Async Event Bus: Amazon SQS]
                        v
       ┌─────────────────────────────────┐
       │   Worker Microservice Domain    │
       │  - Event consumption            │
       │  - Data enrichment & audit      │
       │  - S3 artifact storage          │
       │  - At-least-once processing     │
       └─────────────────────────────────┘
```

### Key Microservices Patterns Demonstrated:
1. **Single Responsibility**: Each microservice has a distinct domain responsibility (CRUD vs asynchronous event ingestion).
2. **Database per Service / Clean Boundaries**: Services do not share direct database connections; communication happens through explicit asynchronous contracts over SQS.
3. **Fault Isolation**: If the worker microservice fails or experiences heavy load, the API microservice continues serving user traffic with zero downtime.

---

## 3. Serverless Architecture Patterns

In modern AWS cloud deployments, this architecture seamlessly translates into a pure **Serverless Architecture**:

```text
               Client (HTTPS)
                     │
                     v
        ┌─────────────────────────┐
        │   Amazon API Gateway    │ (Serverless API Management)
        └────────────┬────────────┘
                     │
                     v
        ┌─────────────────────────┐
        │     AWS Lambda (API)    │ (Serverless Compute)
        └──────┬────────────┬─────┘
               │            │
               ▼            ▼
     ┌──────────────┐   ┌─────────────────┐
     │  Amazon RDS  │   │   Amazon SQS    │ (Serverless Messaging)
     │  PostgreSQL  │   │   "task-events" │
     └──────────────┘   └────────┬────────┘
                                 │
                                 │ (Event Source Mapping)
                                 v
                        ┌─────────────────┐
                        │ AWS Lambda      │ (Serverless Event Consumer)
                        │ (Worker)        │
                        └────────┬────────┘
                                 │
                                 v
                        ┌─────────────────┐
                        │   Amazon S3     │ (Serverless Object Storage)
                        │   Artifacts     │
                        └─────────────────┘
```

### Serverless Benefits:
- **Zero Idle Capacity**: Lambda functions execute only when requests or SQS messages arrive.
- **Auto-Concurrency**: SQS automatically triggers concurrent Lambda instances proportional to message volume.
- **Built-in Resiliency**: SQS Dead Letter Queues (DLQ) capture failed events automatically after max retry attempts.

---

## 4. AWS CDK (Cloud Development Kit) Implementation

The project includes an **AWS CDK** stack located in [`cdk/lib/aws-poc-stack.js`](file:///Users/ashutoshk/Desktop/AWS%20POC/cdk/lib/aws-poc-stack.js):

- **High-Level Constructs (L2)**: Uses idiomatic JavaScript/TypeScript classes for `s3.Bucket` and `sqs.Queue`.
- **Automated IAM Policies**: Grants permissions programmatically using typed helper methods:
  ```javascript
  taskEventsQueue.grantSendMessages(apiServiceRole);
  taskEventsQueue.grantConsumeMessages(workerServiceRole);
  artifactBucket.grantReadWrite(workerServiceRole);
  ```
- **Synthesis**: Runs `npx cdk synth` to generate pure CloudFormation templates.
