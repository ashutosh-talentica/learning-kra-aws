const { v4: uuidv4 } = require('uuid');
const { SendMessageCommand, CreateQueueCommand } = require('@aws-sdk/client-sqs');
const db = require('../db');
const { sqsClient } = require('../clients/sqsClient');
const config = require('../config');

let isQueueEnsured = false;

async function ensureQueue() {
  if (isQueueEnsured) return;
  try {
    await sqsClient.send(new CreateQueueCommand({ QueueName: config.sqs.queueName }));
    isQueueEnsured = true;
  } catch (err) {
    // Ignore if already created
  }
}

class TaskService {
  async createTask({ title, description, priority = 'MEDIUM' }, requestId) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      const err = new Error('Task title is required');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    const formattedPriority = priority.toUpperCase();
    if (!validPriorities.includes(formattedPriority)) {
      const err = new Error(`Priority must be one of: ${validPriorities.join(', ')}`);
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const taskId = uuidv4();
    const queryText = `
      INSERT INTO tasks (id, title, description, status, priority, created_at, updated_at)
      VALUES ($1, $2, $3, 'TODO', $4, NOW(), NOW())
      RETURNING id, title, description, status, priority, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const result = await db.query(queryText, [taskId, title.trim(), description || null, formattedPriority]);
    const task = result.rows[0];

    // Publish TaskCreated event to SQS
    const eventId = uuidv4();
    const event = {
      eventType: 'TaskCreated',
      eventVersion: 1,
      eventId,
      timestamp: new Date().toISOString(),
      requestId,
      payload: {
        taskId: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
      },
    };

    try {
      await ensureQueue();
      const sqsStart = Date.now();
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: config.sqs.queueUrl,
          MessageBody: JSON.stringify(event),
          MessageAttributes: {
            EventType: {
              DataType: 'String',
              StringValue: 'TaskCreated',
            },
            RequestId: {
              DataType: 'String',
              StringValue: requestId || '',
            },
          },
        })
      );
      const sqsDuration = Date.now() - sqsStart;
      console.log(
        JSON.stringify({
          level: 'info',
          timestamp: new Date().toISOString(),
          service: 'task-api',
          requestId,
          operation: 'publishTaskCreatedEvent',
          taskId: task.id,
          eventId,
          queue: config.sqs.queueName,
          durationMs: sqsDuration,
          status: 'SUCCESS',
        })
      );
    } catch (sqsErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          timestamp: new Date().toISOString(),
          service: 'task-api',
          requestId,
          operation: 'publishTaskCreatedEvent',
          taskId: task.id,
          eventId,
          error: sqsErr.message,
        })
      );
      // We do not fail the REST request since the DB write succeeded (outbox/async pattern demonstration)
    }

    return task;
  }

  async getTasks({ page = 1, limit = 20 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const countResult = await db.query('SELECT COUNT(*) FROM tasks');
    const totalItems = parseInt(countResult.rows[0].count, 10);

    const queryText = `
      SELECT id, title, description, status, priority, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM tasks
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(queryText, [limitNum, offset]);

    return {
      data: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum),
      },
    };
  }

  async getTaskById(id) {
    const queryText = `
      SELECT id, title, description, status, priority, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM tasks
      WHERE id = $1
    `;
    const result = await db.query(queryText, [id]);
    if (result.rows.length === 0) {
      const err = new Error(`Task with id '${id}' was not found`);
      err.statusCode = 404;
      err.code = 'TASK_NOT_FOUND';
      throw err;
    }
    return result.rows[0];
  }

  async updateTask(id, updates) {
    const existing = await this.getTaskById(id);

    const title = updates.title !== undefined ? updates.title.trim() : existing.title;
    const description = updates.description !== undefined ? updates.description : existing.description;
    const status = updates.status !== undefined ? updates.status.toUpperCase() : existing.status;
    const priority = updates.priority !== undefined ? updates.priority.toUpperCase() : existing.priority;

    const queryText = `
      UPDATE tasks
      SET title = $1, description = $2, status = $3, priority = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING id, title, description, status, priority, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const result = await db.query(queryText, [title, description, status, priority, id]);
    return result.rows[0];
  }

  async deleteTask(id) {
    await this.getTaskById(id);
    await db.query('DELETE FROM tasks WHERE id = $1', [id]);
    return true;
  }
}

module.exports = new TaskService();
