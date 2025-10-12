// Project-related types
export type ProjectWithQuotations = {
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
  quotations: {
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
  }[];
};

// Keep the old type for backward compatibility during transition
export type ProjectWithQuotation = ProjectWithQuotations;

// Project status options
export type ProjectStatusOption = {
  value: string;
  label: string;
  color?: "secondary" | "default" | "destructive" | "outline";
};

export const projectStatusOptions: ProjectStatusOption[] = [
  { value: "planning", label: "Planning", color: "secondary" },
  { value: "in_progress", label: "In Progress", color: "default" },
  { value: "on_hold", label: "On Hold", color: "outline" },
  { value: "completed", label: "Completed", color: "default" },
  { value: "cancelled", label: "Cancelled", color: "destructive" },
];

export const projectStatusFilterOptions: ProjectStatusOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "planning", label: "Planning" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
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
  quotationId?: number; // Make optional - can create project without quotation
  createdBy: string;
  startDate?: Date;
  endDate?: Date;
  clientName?: string;
  clientId?: string;
  priority?: "low" | "medium" | "high";
};

export type UpdateProjectData = {
  name: string;
  description?: string;
  status: "planning" | "in_progress" | "on_hold" | "completed" | "cancelled";
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

// Milestone-related types
export type Milestone = {
  id: number;
  title: string;
  description: string | null;
  projectId: number;
  dueDate: Date;
  priority: TaskPriority;
  status: MilestoneStatus;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  tasks?: Task[];
};

export type MilestoneStatus = "not_started" | "in_progress" | "completed";

export type CreateMilestoneData = {
  title: string;
  description?: string;
  projectId: number;
  dueDate?: Date;
  priority?: TaskPriority;
  order?: number;
};

export type UpdateMilestoneData = {
  title?: string;
  description?: string;
  dueDate?: Date | null;
  priority?: TaskPriority;
  status?: MilestoneStatus;
  order?: number;
};

// Task-related types
export type Task = {
  id: number;
  title: string;
  description: string | null;
  projectId: number;
  milestoneId: number | null;
  status: TaskStatus;
  priority: TaskPriority;
  creatorId: string;
  assigneeId: string | null;
  startDate: Date;
  dueDate: Date;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    supabase_id: string;
  };
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    supabase_id: string;
  };
  milestone?: Milestone;
};

export type TaskWithAssignee = Task & {
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    supabase_id: string;
  };
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    supabase_id: string;
  };
  project?: {
    id: number;
    name: string;
  };
  milestone?: Milestone;
};

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type CreateTaskData = {
  title: string;
  description?: string;
  projectId: number;
  milestoneId?: number | null;
  status: TaskStatus;
  priority: TaskPriority;
  creatorId: string;
  assigneeId?: string | null;
  startDate: Date;
  dueDate: Date;
  order?: number;
};

export type UpdateTaskData = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  creatorId?: string;
  assigneeId?: string | null;
  milestoneId?: number | undefined;
  dueDate?: Date | undefined;
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

export const milestoneStatusOptions = [
  { value: "not_started", label: "Not Started", color: "bg-gray-100" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100" },
  { value: "completed", label: "Completed", color: "bg-green-100" },
];

// New type for project selection
export type AvailableProject = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  clientName: string | null;
  startDate: Date | null;
  endDate: Date | null;
  clientId: string | null;
  created_at: Date;
  quotationCount: number;
};
