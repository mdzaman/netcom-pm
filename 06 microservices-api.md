# Microservices Architecture

## 1. Authentication Service
### API Endpoints
```yaml
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh-token
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET /api/auth/me
POST /api/auth/logout
```

### Implementation
```typescript
// auth-service/src/routes/authRoutes.ts
import express from 'express';
import { AuthController } from '../controllers/authController';
import { validateRegistration, validateLogin } from '../middleware/validation';

const router = express.Router();
const authController = new AuthController();

router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authMiddleware, authController.getCurrentUser);
router.post('/logout', authMiddleware, authController.logout);

export default router;

// auth-service/src/controllers/authController.ts
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { ApiError } from '../utils/apiError';

export class AuthController {
  private cognito: CognitoIdentityServiceProvider;

  constructor() {
    this.cognito = new CognitoIdentityServiceProvider({
      region: process.env.AWS_REGION
    });
  }

  async register(req: Request, res: Response) {
    const { email, password, name } = req.body;
    
    try {
      const params = {
        ClientId: process.env.COGNITO_CLIENT_ID!,
        Username: email,
        Password: password,
        UserAttributes: [
          {
            Name: 'name',
            Value: name
          },
          {
            Name: 'email',
            Value: email
          }
        ]
      };

      await this.cognito.signUp(params).promise();
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      throw new ApiError(400, error.message);
    }
  }

  // Additional controller methods...
}
```

## 2. Task Service
### API Endpoints
```yaml
GET /api/tasks
POST /api/tasks
GET /api/tasks/{taskId}
PUT /api/tasks/{taskId}
DELETE /api/tasks/{taskId}
POST /api/tasks/{taskId}/assign
POST /api/tasks/{taskId}/comments
GET /api/tasks/{taskId}/comments
PUT /api/tasks/{taskId}/status
```

### Implementation
```typescript
// task-service/src/routes/taskRoutes.ts
import express from 'express';
import { TaskController } from '../controllers/taskController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const taskController = new TaskController();

router.get('/', authMiddleware, taskController.getTasks);
router.post('/', authMiddleware, taskController.createTask);
router.get('/:taskId', authMiddleware, taskController.getTaskById);
router.put('/:taskId', authMiddleware, taskController.updateTask);
router.delete('/:taskId', authMiddleware, taskController.deleteTask);
router.post('/:taskId/assign', authMiddleware, taskController.assignTask);
router.post('/:taskId/comments', authMiddleware, taskController.addComment);
router.get('/:taskId/comments', authMiddleware, taskController.getComments);
router.put('/:taskId/status', authMiddleware, taskController.updateStatus);

export default router;

// task-service/src/models/task.ts
interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId?: string;
  projectId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  priority: TaskPriority;
  dueDate?: Date;
  labels: string[];
}

// task-service/src/services/taskService.ts
export class TaskService {
  private taskRepository: TaskRepository;
  private eventBus: EventBus;

  constructor() {
    this.taskRepository = new TaskRepository();
    this.eventBus = new EventBus();
  }

  async createTask(taskData: CreateTaskDto): Promise<Task> {
    const task = await this.taskRepository.create({
      ...taskData,
      id: uuid(),
      status: TaskStatus.TODO,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.eventBus.publish('task.created', task);
    return task;
  }

  // Additional service methods...
}
```

## 3. Project Service
### API Endpoints
```yaml
GET /api/projects
POST /api/projects
GET /api/projects/{projectId}
PUT /api/projects/{projectId}
DELETE /api/projects/{projectId}
POST /api/projects/{projectId}/members
DELETE /api/projects/{projectId}/members/{userId}
GET /api/projects/{projectId}/tasks
GET /api/projects/{projectId}/activity
```

### Implementation
```typescript
// project-service/src/routes/projectRoutes.ts
import express from 'express';
import { ProjectController } from '../controllers/projectController';
import { authMiddleware, projectAccessMiddleware } from '../middleware/auth';

const router = express.Router();
const projectController = new ProjectController();

router.get('/', authMiddleware, projectController.getProjects);
router.post('/', authMiddleware, projectController.createProject);
router.get('/:projectId', authMiddleware, projectAccessMiddleware, projectController.getProjectById);
router.put('/:projectId', authMiddleware, projectAccessMiddleware, projectController.updateProject);
router.delete('/:projectId', authMiddleware, projectAccessMiddleware, projectController.deleteProject);
router.post('/:projectId/members', authMiddleware, projectAccessMiddleware, projectController.addMember);
router.delete('/:projectId/members/:userId', authMiddleware, projectAccessMiddleware, projectController.removeMember);
router.get('/:projectId/tasks', authMiddleware, projectAccessMiddleware, projectController.getProjectTasks);
router.get('/:projectId/activity', authMiddleware, projectAccessMiddleware, projectController.getProjectActivity);

export default router;

// project-service/src/models/project.ts
interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: ProjectMember[];
  createdAt: Date;
  updatedAt: Date;
  settings: ProjectSettings;
  status: ProjectStatus;
}

// project-service/src/services/projectService.ts
export class ProjectService {
  private projectRepository: ProjectRepository;
  private eventBus: EventBus;

  constructor() {
    this.projectRepository = new ProjectRepository();
    this.eventBus = new EventBus();
  }

  async createProject(projectData: CreateProjectDto, userId: string): Promise<Project> {
    const project = await this.projectRepository.create({
      ...projectData,
      id: uuid(),
      ownerId: userId,
      members: [{ userId, role: 'OWNER' }],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: ProjectStatus.ACTIVE
    });

    await this.eventBus.publish('project.created', project);
    return project;
  }

  // Additional service methods...
}
```

## 4. User Service
### API Endpoints
```yaml
GET /api/users
GET /api/users/{userId}
PUT /api/users/{userId}
GET /api/users/{userId}/projects
GET /api/users/{userId}/tasks
PUT /api/users/{userId}/preferences
GET /api/users/{userId}/notifications
```

### Implementation
```typescript
// user-service/src/routes/userRoutes.ts
import express from 'express';
import { UserController } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const userController = new UserController();

router.get('/', authMiddleware, userController.getUsers);
router.get('/:userId', authMiddleware, userController.getUserById);
router.put('/:userId', authMiddleware, userController.updateUser);
router.get('/:userId/projects', authMiddleware, userController.getUserProjects);
router.get('/:userId/tasks', authMiddleware, userController.getUserTasks);
router.put('/:userId/preferences', authMiddleware, userController.updatePreferences);
router.get('/:userId/notifications', authMiddleware, userController.getNotifications);

export default router;

// user-service/src/models/user.ts
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences: UserPreferences;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

// user-service/src/services/userService.ts
export class UserService {
  private userRepository: UserRepository;
  private eventBus: EventBus;

  constructor() {
    this.userRepository = new UserRepository();
    this.eventBus = new EventBus();
  }

  async updateUser(userId: string, userData: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.update(userId, {
      ...userData,
      updatedAt: new Date()
    });

    await this.eventBus.publish('user.updated', user);
    return user;
  }

  // Additional service methods...
}
```

## 5. Notification Service
### API Endpoints
```yaml
POST /api/notifications
GET /api/notifications
PUT /api/notifications/{notificationId}/read
DELETE /api/notifications/{notificationId}
PUT /api/notifications/settings
```

### Implementation
```typescript
// notification-service/src/routes/notificationRoutes.ts
import express from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const notificationController = new NotificationController();

router.post('/', authMiddleware, notificationController.createNotification);
router.get('/', authMiddleware, notificationController.getNotifications);
router.put('/:notificationId/read', authMiddleware, notificationController.markAsRead);
router.delete('/:notificationId', authMiddleware, notificationController.deleteNotification);
router.put('/settings', authMiddleware, notificationController.updateSettings);

export default router;

// notification-service/src/services/notificationService.ts
export class NotificationService {
  private notificationRepository: NotificationRepository;
  private emailService: EmailService;
  private pushNotificationService: PushNotificationService;

  constructor() {
    this.notificationRepository = new NotificationRepository();
    this.emailService = new EmailService();
    this.pushNotificationService = new PushNotificationService();
  }

  async createNotification(data: CreateNotificationDto): Promise<Notification> {
    const notification = await this.notificationRepository.create({
      ...data,
      id: uuid(),
      status: NotificationStatus.UNREAD,
      createdAt: new Date()
    });

    // Send notifications through different channels based on user preferences
    await this.sendNotificationThroughChannels(notification);

    return notification;
  }

  private async sendNotificationThroughChannels(notification: Notification) {
    const userPreferences = await this.getUserNotificationPreferences(notification.userId);

    if (userPreferences.emailEnabled) {
      await this.emailService.sendNotificationEmail(notification);
    }

    if (userPreferences.pushEnabled) {
      await this.pushNotificationService.sendPushNotification(notification);
    }
  }

  // Additional service methods...
}
```

## 6. Search Service
### API Endpoints
```yaml
GET /api/search
POST /api/search/index
DELETE /api/search/index/{documentId}
```

### Implementation
```typescript
// search-service/src/routes/searchRoutes.ts
import express from 'express';
import { SearchController } from '../controllers/searchController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const searchController = new SearchController();

router.get('/', authMiddleware, searchController.search);
router.post('/index', authMiddleware, searchController.indexDocument);
router.delete('/index/:documentId', authMiddleware, searchController.deleteDocument);

export default router;

// search-service/src/services/searchService.ts
export class SearchService {
  private elasticsearch: Client;

  constructor() {
    this.elasticsearch = new Client({
      node: process.env.ELASTICSEARCH_NODE
    });
  }

  async search(query: SearchQueryDto): Promise<SearchResult[]> {
    const { body } = await this.elasticsearch.search({
      index: 'tasks,projects,comments',
      body: {
        query: {
          multi_match: {
            query: query.searchTerm,
            fields: ['title', 'description', 'content']
          }
        },
        ...this.buildFilters(query.filters)
      }
    });

    return this.transformSearchResults(body.hits.hits);
  }

  // Additional service methods...
}
```

## Inter-service Communication
```typescript
// shared/src/eventBus.ts
export class EventBus {
  private sns: SNS;

  constructor() {
    this.sns = new SNS({
      region: process.env.AWS_REGION
    });
  }

  async publish(event: string, payload: any): Promise<void> {
    await this.sns.publish({
      TopicArn: process.env.SNS_TOPIC_ARN,
      Message: JSON.stringify(payload),
      MessageAttributes: {
        event: {
          DataType: 'String',
          StringValue: event
        }
      }
    }).promise();
  }
}

// shared/src/middleware/auth.ts
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new ApiError(401, 'No token provided');
    }

    const decoded = await verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(new ApiError(401, 'Invalid token'));
  }
};
```
