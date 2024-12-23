// task-service/src/models/Task.ts
import { BaseEntity } from '@shared/types';

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE'
}

export interface Task extends BaseEntity {
  title: string;
  description: string;
  projectId: string;
  assigneeId?: string;
  reporterId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  estimatedHours?: number;
  labels: string[];
  parentId?: string;  // For subtasks
  attachments: string[];
  watchers: string[];
}

// task-service/src/repositories/TaskRepository.ts
import { DynamoDB } from 'aws-sdk';
import { Task } from '../models/Task';

export class TaskRepository {
  private readonly tableName = 'Tasks';
  private readonly dynamoDb: DynamoDB.DocumentClient;

  constructor() {
    this.dynamoDb = new DynamoDB.DocumentClient({
      region: process.env.AWS_REGION
    });
  }

  async create(task: Task): Promise<Task> {
    await this.dynamoDb.put({
      TableName: this.tableName,
      Item: task
    }).promise();
    return task;
  }

  async findById(id: string): Promise<Task | null> {
    const result = await this.dynamoDb.get({
      TableName: this.tableName,
      Key: { id }
    }).promise();
    return result.Item as Task || null;
  }

  async findByProject(projectId: string): Promise<Task[]> {
    const result = await this.dynamoDb.query({
      TableName: this.tableName,
      IndexName: 'projectId-index',
      KeyConditionExpression: 'projectId = :projectId',
      ExpressionAttributeValues: {
        ':projectId': projectId
      }
    }).promise();
    return result.Items as Task[];
  }

  async update(id: string, updateData: Partial<Task>): Promise<Task> {
    const updateExpression = this.buildUpdateExpression(updateData);
    const result = await this.dynamoDb.update({
      TableName: this.tableName,
      Key: { id },
      ...updateExpression,
      ReturnValues: 'ALL_NEW'
    }).promise();
    return result.Attributes as Task;
  }
}

// task-service/src/services/TaskService.ts
import { Task, TaskRepository } from '../repositories';
import { SNS } from 'aws-sdk';
import { ApiError } from '@shared/utils/apiError';

export class TaskService {
  private readonly taskRepository: TaskRepository;
  private readonly sns: SNS;

  constructor() {
    this.taskRepository = new TaskRepository();
    this.sns = new SNS({ region: process.env.AWS_REGION });
  }

  async createTask(data: Partial<Task>, userId: string): Promise<Task> {
    const task: Task = {
      ...data,
      id: crypto.randomUUID(),
      reporterId: userId,
      status: TaskStatus.TODO,
      priority: data.priority || TaskPriority.MEDIUM,
      labels: data.labels || [],
      attachments: [],
      watchers: [userId],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const createdTask = await this.taskRepository.create(task);
    await this.publishTaskEvent('TASK_CREATED', createdTask);
    return createdTask;
  }

  private async publishTaskEvent(eventType: string, task: Task): Promise<void> {
    await this.sns.publish({
      TopicArn: process.env.TASK_EVENTS_TOPIC_ARN,
      Message: JSON.stringify(task),
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: eventType
        }
      }
    }).promise();
  }
}

// project-service/src/models/Project.ts
import { BaseEntity } from '@shared/types';

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  COMPLETED = 'COMPLETED'
}

export interface ProjectMember {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: Date;
}

export interface Project extends BaseEntity {
  name: string;
  description: string;
  key: string;  // Short identifier like "PROJ"
  status: ProjectStatus;
  ownerId: string;
  members: ProjectMember[];
  settings: {
    defaultAssigneeId?: string;
    isPrivate: boolean;
    allowExternalSharing: boolean;
    taskPrefix: string;
  };
}

// project-service/src/services/ProjectService.ts
import { Project, ProjectRepository } from '../repositories';
import { ApiError } from '@shared/utils/apiError';

export class ProjectService {
  private readonly projectRepository: ProjectRepository;
  private readonly sns: SNS;

  constructor() {
    this.projectRepository = new ProjectRepository();
    this.sns = new SNS({ region: process.env.AWS_REGION });
  }

  async createProject(data: Partial<Project>, userId: string): Promise<Project> {
    // Validate project key uniqueness
    const existingProject = await this.projectRepository.findByKey(data.key!);
    if (existingProject) {
      throw new ApiError(400, 'Project key already exists');
    }

    const project: Project = {
      ...data,
      id: crypto.randomUUID(),
      ownerId: userId,
      status: ProjectStatus.ACTIVE,
      members: [{
        userId,
        role: 'OWNER',
        joinedAt: new Date()
      }],
      settings: {
        isPrivate: true,
        allowExternalSharing: false,
        taskPrefix: data.key!,
        ...data.settings
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const createdProject = await this.projectRepository.create(project);
    await this.publishProjectEvent('PROJECT_CREATED', createdProject);
    return createdProject;
  }

  async addMember(projectId: string, userId: string, role: string): Promise<Project> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    const memberExists = project.members.some(member => member.userId === userId);
    if (memberExists) {
      throw new ApiError(400, 'User is already a member of this project');
    }

    project.members.push({
      userId,
      role: role as 'MEMBER',
      joinedAt: new Date()
    });

    const updatedProject = await this.projectRepository.update(projectId, {
      members: project.members,
      updatedAt: new Date()
    });

    await this.publishProjectEvent('PROJECT_MEMBER_ADDED', {
      projectId,
      userId,
      role
    });

    return updatedProject;
  }
}

// notification-service/src/services/NotificationService.ts
import { SNS, SES } from 'aws-sdk';
import { Notification, NotificationRepository } from '../repositories';

export class NotificationService {
  private readonly notificationRepository: NotificationRepository;
  private readonly sns: SNS;
  private readonly ses: SES;

  constructor() {
    this.notificationRepository = new NotificationRepository();
    this.sns = new SNS({ region: process.env.AWS_REGION });
    this.ses = new SES({ region: process.env.AWS_REGION });
  }

  async handleTaskEvent(event: any): Promise<void> {
    const { eventType, Message } = event;
    const task = JSON.parse(Message);

    switch (eventType) {
      case 'TASK_CREATED':
        await this.notifyTaskAssignee(task);
        break;
      case 'TASK_UPDATED':
        await this.notifyTaskWatchers(task);
        break;
      case 'TASK_COMMENTED':
        await this.notifyTaskParticipants(task);
        break;
    }
  }

  private async notifyTaskAssignee(task: any): Promise<void> {
    if (!task.assigneeId) return;

    const notification: Notification = {
      id: crypto.randomUUID(),
      userId: task.assigneeId,
      type: 'TASK_ASSIGNED',
      content: `You have been assigned to task ${task.title}`,
      referenceId: task.id,
      referenceType: 'TASK',
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.notificationRepository.create(notification);
    await this.sendEmail(task.assigneeId, 'Task Assigned', `You have been assigned to task ${task.title}`);
  }

  private async sendEmail(userId: string, subject: string, message: string): Promise<void> {
    // Get user email from user service
    const userEmail = await this.getUserEmail(userId);

    await this.ses.sendEmail({
      Source: process.env.NOTIFICATION_EMAIL_FROM!,
      Destination: {
        ToAddresses: [userEmail]
      },
      Message: {
        Subject: {
          Data: subject
        },
        Body: {
          Text: {
            Data: message
          }
        }
      }
    }).promise();
  }
}
