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
