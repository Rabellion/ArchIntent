export type UserRole = 'client' | 'architect' | 'contractor' | 'admin';
export type AccountStatus = 'active' | 'pending' | 'suspended';

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  role: UserRole;
  phone_number?: string;
  phone_verified_at?: string | null;
  profile_image?: string;
  account_status: AccountStatus;
  identity_type?: 'cnic' | 'passport';
  identity_number?: string;
  profile_completed?: boolean;
  architect?: {
    architect_id: number;
    user_id: number;
    license_number?: string;
    experience_years: number;
    specialization?: string;
    bio?: string;
    verification_status: 'pending' | 'verified' | 'rejected';
    verification_document?: string;
  };
  contractor?: {
    contractor_id: number;
    user_id: number;
    company_name: string;
    registration_number?: string;
    company_address?: string;
    verification_status: 'pending' | 'verified' | 'rejected';
    verification_document?: string;
    experience_years: number;
    specialization?: string;
    bio?: string;
  };
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  clearAuth: () => void;
  validateToken: () => Promise<boolean>;
  /** Re-fetch `/profile` and update `user` + sessionStorage (avatar, name, etc.) */
  refreshUser: () => Promise<void>;
}