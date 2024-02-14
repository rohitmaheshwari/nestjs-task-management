import { DeleteResult, FindOneOptions, Repository } from 'typeorm';
import { Task } from './task.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus } from './task-status.enum';
import { TaskFilterDto } from './dto/get-task-filter.dto';
import { User } from 'src/auth/entities/user.entity';
import { InternalServerErrorException, Logger } from '@nestjs/common';

export class TasksRepository {
  private logger = new Logger('TaskRepository', { timestamp: true });

  constructor(
    @InjectRepository(Task)
    private readonly repository: Repository<Task>,
  ) {}

  async getTasks(taskFilterDto: TaskFilterDto, user: User): Promise<Task[]> {
    const { status, search } = taskFilterDto;

    const query = this.repository.createQueryBuilder('task');
    query.where({ user });

    if (status) {
      query.andWhere('task.status = :status', { status });
    }
    if (search) {
      query.andWhere(
        '(LOWER(task.title) LIKE LOWER(:search) OR LOWER(task.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    try {
      const tasks = await query.getMany();
      return tasks;
    } catch (error) {
      this.logger.error(
        `Failed to get tasks for user "${user.username}". Filters: ${JSON.stringify(taskFilterDto)}`,
        error.stack,
      );
      throw new InternalServerErrorException();
    }
  }

  async createTask(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    const { title, description } = createTaskDto;
    const task: Task = this.repository.create({
      title,
      description,
      status: TaskStatus.OPEN,
      user,
    });

    await this.repository.save(task);
    return task;
  }

  async findOne(options: FindOneOptions<Task>): Promise<Task | null> {
    return this.repository.findOne(options);
  }

  async save(task: Task): Promise<Task> {
    return this.repository.save(task);
  }

  async delete(criteria: Partial<Task>): Promise<DeleteResult> {
    return this.repository.delete(criteria);
  }
}
