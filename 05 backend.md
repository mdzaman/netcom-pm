// src/types/index.ts
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  projectId: string;
  assigneeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// src/controllers/taskController.ts
import { Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { ApiError } from '../utils/apiError';

export class TaskController {
  constructor(private taskService: TaskService) {}

  async createTask(req: Request, res: Response) {
    try {
      const task = await this.taskService.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async getTasks(req: Request, res: Response) {
    try {
      const tasks = await this.taskService.getTasks(req.query);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getTaskById(req: Request, res: Response) {
    try {
      const task = await this.taskService.getTaskById(req.params.id);
      if (!task) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

// src/services/taskService.ts
import { Task, TaskStatus } from '../types';
import { TaskRepository } from '../repositories/taskRepository';
import { ApiError } from '../utils/apiError';

export class TaskService {
  constructor(private taskRepository: TaskRepository) {}

  async createTask(taskData: Partial<Task>): Promise<Task> {
    // Validate task data
    if (!taskData.title) {
      throw new ApiError(400, 'Task title is required');
    }

    const task: Task = {
      id: crypto.randomUUID(),
      title: taskData.title,
      description: taskData.description || '',
      status: TaskStatus.TODO,
      projectId: taskData.projectId!,
      assigneeId: taskData.assigneeId!,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.taskRepository.create(task);
  }

  async getTasks(filters: any): Promise<Task[]> {
    return this.taskRepository.findAll(filters);
  }

  async getTaskById(id: string): Promise<Task | null> {
    return this.taskRepository.findById(id);
  }
}

// src/repositories/taskRepository.ts
import { DynamoDB } from 'aws-sdk';
import { Task } from '../types';

export class TaskRepository {
  private tableName = 'Tasks';
  private dynamoDB: DynamoDB.DocumentClient;

  constructor() {
    this.dynamoDB = new DynamoDB.DocumentClient({
      region: process.env.AWS_REGION
    });
  }

  async create(task: Task): Promise<Task> {
    await this.dynamoDB
      .put({
        TableName: this.tableName,
        Item: task
      })
      .promise();

    return task;
  }

  async findAll(filters: any): Promise<Task[]> {
    const params: DynamoDB.DocumentClient.ScanInput = {
      TableName: this.tableName,
      FilterExpression: filters.status ? 'status = :status' : undefined,
      ExpressionAttributeValues: filters.status ? { ':status': filters.status } : undefined
    };

    const result = await this.dynamoDB.scan(params).promise();
    return result.Items as Task[];
  }

  async findById(id: string): Promise<Task | null> {
    const result = await this.dynamoDB
      .get({
        TableName: this.tableName,
        Key: { id }
      })
      .promise();

    return (result.Item as Task) || null;
  }
}

// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      message: error.message
    });
    return;
  }

  res.status(500).json({
    message: 'Internal server error'
  });
};

// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  tokenUse: 'access'
});

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const payload = await verifier.verify(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// src/config/database.ts
import { DynamoDB } from 'aws-sdk';

export const connectDB = async () => {
  const dynamoDB = new DynamoDB({
    region: process.env.AWS_REGION
  });

  try {
    await dynamoDB.listTables().promise();
    console.log('Successfully connected to DynamoDB');
  } catch (error) {
    console.error('Failed to connect to DynamoDB:', error);
    throw error;
  }
};
