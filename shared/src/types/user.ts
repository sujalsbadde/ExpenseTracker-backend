export type Role = 'USER' | 'ADMIN';

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}
