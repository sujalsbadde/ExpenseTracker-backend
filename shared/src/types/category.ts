export interface CategoryDTO {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  isDefault: boolean;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  icon?: string;
  color?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  icon?: string;
  color?: string;
}
