export interface UpdateProfileDTO {
  name?: string;
  email?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface ChangePasswordDTO {
  oldPassword: string;
  newPassword: string;
}

export interface AdminUserListQuery {
  page: number;
  limit: number;
  search?: string;
}
