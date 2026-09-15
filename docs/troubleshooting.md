# Troubleshooting Guide

This guide covers common issues encountered when running the POC locally and their solutions.

---

## 1. Port Conflicts (Port 8080, 5432, or 4566 already in use)

**Symptom**: `docker compose up` fails with `bind: address already in use`.

**Fix**:
Check what process is occupying the port:
```bash
lsof -i :8080
lsof -i :5432
lsof -i :4566
```
Kill the conflicting process or change the port mapping in `docker-compose.yml` and `.env`.

---

## 2. LocalStack Resources Not Created

**Symptom**: Worker logs show `QueueDoesNotExist` or `NoSuchBucket`.

**Fix**:
1. Check LocalStack logs:
   ```bash
   docker compose logs localstack
   ```
2. Manually trigger initialization if needed:
   ```bash
   docker compose exec localstack /etc/localstack/init/ready.d/01-create-resources.sh
   ```
3. Or provision via Terraform:
   ```bash
   cd terraform
   terraform init && terraform apply -auto-approve
   ```

---

## 3. Database Connection Errors

**Symptom**: API logs show `Waiting for database connection...`.

**Fix**:
- Ensure PostgreSQL health check passes:
  ```bash
  docker compose ps postgres
  ```
- Check PostgreSQL container logs:
  ```bash
  docker compose logs postgres
  ```
- Reset the volume if data corruption occurred:
  ```bash
  docker compose down -v
  docker compose up --build
  ```

---

## 4. Resetting the Entire Environment

To start completely fresh:
```bash
docker compose down -v
docker compose up --build
```
