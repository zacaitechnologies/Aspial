# Task Management System

This document describes the task management system implemented in the Aspial project management application.

## Overview

The task system allows users to create, manage, and track tasks within each project. Tasks are organized using a Kanban board with different status columns (Backlog, To Do, In Progress, Review, Done).

## Features

### Task Management
- **Create Tasks**: Add new tasks with title, description, priority, assignee, due date, and tags
- **Edit Tasks**: Modify existing task details
- **Delete Tasks**: Remove tasks from the project
- **Task Types**: Support for regular tasks and milestones
- **Task Priority**: Low, Medium, High priority levels
- **Task Assignment**: Assign tasks to project collaborators
- **Due Dates**: Set and track task deadlines
- **Tags**: Add custom tags to categorize tasks

### Kanban Board
- **Status Columns**: Backlog, To Do, In Progress, Review, Done
- **Visual Organization**: Drag-and-drop interface for task management
- **Task Cards**: Compact display of task information
- **Quick Actions**: Edit and delete tasks directly from cards

### Project Integration
- **Project-Specific Tasks**: All tasks are associated with specific projects
- **Task Statistics**: Overview of task distribution across statuses
- **Collaborator Management**: Assign tasks to project team members
- **Progress Tracking**: Visual indicators of project completion

## Database Schema

### Task Model
```prisma
model Task {
  id          Int       @id @default(autoincrement())
  title       String
  description String?
  projectId   Int
  status      TaskStatus @default(backlog)
  priority    TaskPriority @default(medium)
  assigneeId  String?
  startDate   DateTime?
  dueDate     DateTime?
  tags        String[]  @default([])
  type        TaskType  @default(task)
  order       Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  project  Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee User?   @relation("TaskAssignee", fields: [assigneeId], references: [supabase_id])

  @@map("tasks")
}
```

### Task Statuses
- `backlog`: Tasks that are planned but not yet started
- `todo`: Tasks ready to be worked on
- `in_progress`: Tasks currently being worked on
- `review`: Tasks completed and ready for review
- `done`: Tasks completed and approved

### Task Priorities
- `low`: Low priority tasks
- `medium`: Medium priority tasks (default)
- `high`: High priority tasks

### Task Types
- `task`: Regular project tasks
- `milestone`: Important project milestones

## File Structure

```
src/app/(main)/projects/
├── components/
│   ├── ProjectKanbanBoard.tsx    # Main Kanban board component
│   ├── TaskCard.tsx              # Individual task card component
│   ├── TaskForm.tsx              # Task creation/editing form
│   └── ...
├── task-actions.ts               # Server actions for task CRUD operations
├── types.ts                      # TypeScript type definitions
└── [id]/page.tsx                 # Project detail page with task management
```

## Usage

### Accessing Tasks
1. Navigate to the Projects page (`/projects`)
2. Click "View Tasks" on any project
3. The project detail page will open with two tabs:
   - **Overview**: Project information and task statistics
   - **Tasks**: Kanban board for task management

### Creating Tasks
1. In the Tasks tab, click the "+" button in any column
2. Fill in the task details:
   - Title (required)
   - Description (optional)
   - Status (defaults to the column you clicked)
   - Priority (Low/Medium/High)
   - Assignee (select from project collaborators)
   - Due Date (optional)
   - Tags (optional)
   - Type (Task/Milestone)
3. Click "Create Task"

### Managing Tasks
- **Edit**: Click the three dots menu on any task card and select "Edit Task"
- **Delete**: Click the three dots menu and select "Delete"
- **Move**: Drag and drop tasks between columns to change status
- **View Details**: Click on task cards to see full information

### Task Statistics
The Overview tab shows:
- Total number of tasks
- Tasks by status (Backlog, To Do, In Progress, Review, Done)
- Visual progress indicators

## API Endpoints

### Task Actions (Server Actions)
- `getProjectTasks(projectId)`: Get all tasks for a project
- `getTask(taskId)`: Get a specific task
- `createTask(data)`: Create a new task
- `updateTask(taskId, data)`: Update an existing task
- `deleteTask(taskId)`: Delete a task
- `updateTaskStatus(taskId, status)`: Update task status
- `reorderTasks(taskIds)`: Reorder tasks (for drag-and-drop)
- `getTasksByStatus(projectId, status)`: Get tasks by status
- `getProjectTaskStats(projectId)`: Get task statistics
- `getProjectCollaborators(projectId)`: Get available assignees

## Permissions

- **Project Owners**: Can create, edit, delete, and assign tasks
- **Project Collaborators**: Can view and edit tasks they're assigned to
- **Project Viewers**: Can view tasks but cannot modify them

## Styling

The task system uses the existing design system with:
- Consistent color scheme using CSS variables
- Responsive design for mobile and desktop
- Hover effects and transitions
- Clear visual hierarchy
- Accessible color contrasts

## Future Enhancements

Potential improvements for the task system:
- Drag-and-drop reordering within columns
- Bulk task operations
- Task dependencies and relationships
- Time tracking integration
- Task templates
- Advanced filtering and search
- Task comments and discussions
- File attachments
- Email notifications for task assignments
- Task export functionality

## Troubleshooting

### Common Issues
1. **Tasks not appearing**: Check if the user has project permissions
2. **Cannot assign tasks**: Verify that collaborators are added to the project
3. **Database errors**: Ensure the Task model is properly migrated

### Development
To add sample tasks for testing:
```bash
npx tsx prisma/seed-tasks.ts
```

This will create sample tasks for the first project in the database.
