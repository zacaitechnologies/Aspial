// Project-related types
export type ProjectWithQuotation = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  created_at: Date;
  updated_at: Date;
  priority: string;
  taskCount?: number;
  clientName?: string;
  clientId?: string;
  createdByUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    supabase_id: string;
  };
  quotation: {
    id: number;
    name: string;
    description: string;
    totalPrice: number;
    status: string;
    services: {
      id: number;
      service: {
        id: number;
        name: string;
        description: string;
        basePrice: number;
      };
    }[];
  };
};

// Project status options
export type ProjectStatusOption = {
  value: string;
  label: string;
  color?: "secondary" | "default" | "destructive" | "outline";
};

export const projectStatusOptions: ProjectStatusOption[] = [
  { value: "planning", label: "Planning", color: "secondary" },
  { value: "in_progress", label: "In Progress", color: "default" },
  { value: "completed", label: "Completed", color: "outline" },
  { value: "cancelled", label: "Cancelled", color: "destructive" },
];

export const projectStatusFilterOptions: ProjectStatusOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "planning", label: "Planning" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// Project form types
export type ProjectFormData = {
  name: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
};

export type CreateProjectData = {
  name: string;
  description?: string;
  quotationId: number;
  createdBy: string;
  startDate?: Date;
  endDate?: Date;
  clientName?: string;
  clientId?: string;
};

export type UpdateProjectData = {
  name: string;
  description?: string;
  status: string;
  startDate?: Date;
  endDate?: Date;
};

// Project permission types
export type ProjectPermission = {
  id: number;
  userId: string;
  projectId: number;
  canView: boolean;
  canEdit: boolean;
  isOwner: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export type AvailableUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  supabase_id: string;
};

// Project invitation types
export type ProjectInvitation = {
  id: number;
  projectId: number;
  invitedBy: string;
  invitedUser: string;
  status: string;
  canView: boolean;
  canEdit: boolean;
  isOwner: boolean;
  createdAt: Date;
  updatedAt: Date;
  inviter: {
    firstName: string;
    lastName: string;
    email: string;
  };
  invitee: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

export type InvitePermissions = {
  canView: boolean;
  canEdit: boolean;
  isOwner: boolean;
};



// Project ownership state type
export type ProjectOwnershipState = {
  [key: number]: boolean;
};

// Project stats type
export type ProjectStats = {
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
};

// Task-related types
export type Task = {
  id: number;
  title: string;
  description: string | null;
  projectId: number;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  tags: string[];
  type: TaskType;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    supabase_id: string;
  };
};

export type TaskWithAssignee = Task & {
  assignee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    supabase_id: string;
  } | null;
};

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TaskType = "task" | "milestone";

export type CreateTaskData = {
  title: string;
  description?: string;
  projectId: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: Date;
  tags?: string[];
  type?: TaskType;
  order?: number;
};

export type UpdateTaskData = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: Date | null;
  tags?: string[];
  type?: TaskType;
  order?: number;
};

// Task status options for UI
export const taskStatusOptions = [
  { value: "todo", label: "To Do", color: "bg-blue-100" },
  { value: "in_progress", label: "In Progress", color: "bg-yellow-100" },
  { value: "done", label: "Done", color: "bg-green-100" },
];

export const taskPriorityOptions = [
  { value: "low", label: "Low", color: "text-green-600 bg-green-50 border-green-200" },
  { value: "medium", label: "Medium", color: "text-orange-600 bg-orange-50 border-orange-200" },
  { value: "high", label: "High", color: "text-red-600 bg-red-50 border-red-200" },
];

export const taskTypeOptions = [
  { value: "task", label: "Task" },
  { value: "milestone", label: "Milestone" },
];
