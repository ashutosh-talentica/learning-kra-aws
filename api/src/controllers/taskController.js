const taskService = require('../services/taskService');

class TaskController {
  async createTask(req, res, next) {
    try {
      const task = await taskService.createTask(req.body, req.id);
      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  }

  async getTasks(req, res, next) {
    try {
      const { page, limit } = req.query;
      const tasks = await taskService.getTasks({ page, limit });
      res.status(200).json(tasks);
    } catch (err) {
      next(err);
    }
  }

  async getTaskById(req, res, next) {
    try {
      const task = await taskService.getTaskById(req.params.id);
      res.status(200).json(task);
    } catch (err) {
      next(err);
    }
  }

  async updateTask(req, res, next) {
    try {
      const task = await taskService.updateTask(req.params.id, req.body);
      res.status(200).json(task);
    } catch (err) {
      next(err);
    }
  }

  async deleteTask(req, res, next) {
    try {
      await taskService.deleteTask(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TaskController();
