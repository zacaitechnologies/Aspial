// Service-related types
export type ServiceTag = {
  id: number;
  name: string;
  color: string | null;
  created_at: Date;
  services?: Service[];
};

export type Service = {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  imageUrl?: string | null;
  hidden: boolean;
  created_at: Date;
  updated_at: Date;
  tags?: ServiceTag[];
};

export type CreateServiceData = {
  name: string;
  description: string;
  basePrice: number;
  imageUrl?: string | null;
  hidden?: boolean;
  tagIds?: number[];
};

export type UpdateServiceData = {
  name?: string;
  description?: string;
  basePrice?: number;
  imageUrl?: string | null;
  hidden?: boolean;
  tagIds?: number[];
};

export type HiddenFilter = "visible" | "hidden" | "all";

export type CreateServiceTagData = {
  name: string;
  color?: string;
};

export type UpdateServiceTagData = {
  name?: string;
  color?: string;
};
