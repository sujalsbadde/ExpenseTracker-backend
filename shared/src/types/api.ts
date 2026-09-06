export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]> | Array<{ field: string; message: string }>;
  statusCode?: number;
}
