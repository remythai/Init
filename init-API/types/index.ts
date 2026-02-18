import type { Pool, PoolClient, QueryResult } from 'pg';
import type { Request, Response, NextFunction } from 'express';
import type { Socket } from 'socket.io';

// ─── Express augmentation ────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  role: 'user' | 'orga';
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ─── Database ────────────────────────────────────────────────────────────────

export type DbClient = Pool | PoolClient;

export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

// ─── Users ───────────────────────────────────────────────────────────────────

export interface UserRow {
  id: number;
  firstname: string;
  lastname: string;
  mail: string | null;
  tel: string;
  birthday: Date;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export type UserPublic = Omit<UserRow, 'password_hash'>;

export interface UserCreateInput {
  firstname: string;
  lastname: string;
  mail?: string;
  tel: string;
  birthday: string | Date;
  password_hash: string;
}

export interface UserUpdateInput {
  firstname?: string;
  lastname?: string;
  mail?: string;
  tel?: string;
}

// ─── Orga ────────────────────────────────────────────────────────────────────

export interface OrgaRow {
  id: number;
  nom: string;
  mail: string;
  description: string | null;
  tel: string | null;
  password_hash: string;
  logo_path: string | null;
  created_at: Date;
  updated_at: Date;
}

export type OrgaPublic = Omit<OrgaRow, 'password_hash'>;

export interface OrgaCreateInput {
  name: string;
  mail: string;
  description?: string;
  tel?: string;
  password_hash: string;
}

export interface OrgaUpdateInput {
  nom?: string;
  description?: string;
  mail?: string;
  tel?: string;
  logo_path?: string | null;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export interface EventRow {
  id: number;
  orga_id: number;
  name: string;
  description: string;
  location: string | null;
  start_at: Date | null;
  end_at: Date | null;
  event_date: Date | null;
  app_start_at: Date;
  app_end_at: Date;
  theme: string;
  cooldown: string | null; // PostgreSQL interval as string
  max_participants: number | null;
  is_public: boolean;
  has_whitelist: boolean;
  has_link_access: boolean;
  has_password_access: boolean;
  access_password_hash: string | null;
  custom_fields: CustomFieldDefinition[];
  banner_path: string | null;
  created_at: Date;
  updated_at: Date;
}

export type EventSafe = Omit<EventRow, 'access_password_hash'>;

export interface EventCreateInput {
  orga_id: number;
  name: string;
  description?: string;
  start_at?: string;
  end_at?: string;
  location?: string;
  app_start_at: string;
  app_end_at: string;
  theme?: string;
  max_participants?: number;
  is_public?: boolean;
  has_whitelist?: boolean;
  has_link_access?: boolean;
  has_password_access?: boolean;
  access_password_hash?: string;
  cooldown?: string;
  custom_fields?: CustomFieldDefinition[];
}

export interface EventUpdateInput {
  name?: string;
  description?: string;
  start_at?: string | null;
  end_at?: string | null;
  location?: string;
  app_start_at?: string;
  app_end_at?: string;
  theme?: string;
  max_participants?: number | null;
  is_public?: boolean;
  has_whitelist?: boolean;
  has_link_access?: boolean;
  has_password_access?: boolean;
  cooldown?: string | null;
  access_password_hash?: string | null;
  custom_fields?: CustomFieldDefinition[];
  banner_path?: string | null;
}

export interface EventFilters {
  upcoming?: boolean;
  past?: boolean;
  location?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── Custom Fields (discriminated union / pattern matching) ──────────────────

export type CustomFieldDefinition =
  | { type: 'text'; label: string; required?: boolean; min?: number; max?: number }
  | { type: 'textarea'; label: string; required?: boolean; min?: number; max?: number }
  | { type: 'number'; label: string; required?: boolean; min?: number; max?: number }
  | { type: 'email'; label: string; required?: boolean }
  | { type: 'phone'; label: string; required?: boolean }
  | { type: 'date'; label: string; required?: boolean }
  | { type: 'checkbox'; label: string; required?: boolean }
  | { type: 'radio'; label: string; required?: boolean; options: string[] }
  | { type: 'select'; label: string; required?: boolean; options: string[] }
  | { type: 'multiselect'; label: string; required?: boolean; options: string[]; min?: number; max?: number };

// ─── Photos ──────────────────────────────────────────────────────────────────

export interface PhotoRow {
  id: number;
  user_id: number;
  file_path: string;
  event_id: number | null;
  display_order: number;
  is_primary: boolean;
  created_at: Date;
}

export interface PhotoCreateInput {
  userId: number;
  filePath: string;
  eventId?: number;
  displayOrder?: number;
  isPrimary?: boolean;
}

// ─── Matches ─────────────────────────────────────────────────────────────────

export interface MatchRow {
  id: number;
  user1_id: number;
  user2_id: number;
  event_id: number;
  is_archived: boolean;
  created_at: Date;
}

// ─── Likes ───────────────────────────────────────────────────────────────────

export interface LikeRow {
  liker_id: number;
  liked_id: number;
  event_id: number;
  is_like: boolean;
  created_at: Date;
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface MessageRow {
  id: number;
  match_id: number;
  sender_id: number;
  content: string;
  sent_at: Date;
  is_read: boolean;
  is_liked: boolean;
}

// ─── Registration (user_event_rel) ───────────────────────────────────────────

export interface RegistrationRow {
  user_id: number;
  event_id: number;
  profil_info: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

export interface RefreshTokenRow {
  id: number;
  user_id: number | null;
  orga_id: number | null;
  user_type: 'user' | 'orga';
  token: string;
  expiry: Date;
}

export type UserType = 'user' | 'orga';

// ─── Reports ─────────────────────────────────────────────────────────────────

export type ReportType = 'photo' | 'profile' | 'message';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface ReportRow {
  id: number;
  event_id: number;
  reporter_id: number;
  reported_user_id: number;
  match_id: number | null;
  report_type: ReportType;
  reason: string;
  description: string | null;
  status: ReportStatus;
  orga_notes: string | null;
  created_at: Date;
  reviewed_at: Date | null;
  resolved_at: Date | null;
}

export interface ReportCreateInput {
  eventId: number;
  reporterId: number;
  reportedUserId: number;
  matchId?: number;
  reportType: ReportType;
  reason: string;
  description?: string;
}

export interface ReportStats {
  total: number;
  pending: number;
  reviewed: number;
  resolved: number;
  dismissed: number;
  photo_reports: number;
  profile_reports: number;
  message_reports: number;
}

// ─── Whitelist ───────────────────────────────────────────────────────────────

export type WhitelistSource = 'manual' | 'csv' | 'xml';
export type WhitelistStatus = 'active' | 'removed';

export interface WhitelistRow {
  id: number;
  event_id: number;
  phone: string;
  user_id: number | null;
  source: WhitelistSource;
  status: WhitelistStatus;
  created_at: Date;
  updated_at: Date;
  removed_at: Date | null;
}

export interface BulkAddResult {
  total: number;
  added: number;
  skipped_duplicate: number;
  skipped_removed: number;
  invalid: number;
  errors: Array<{ phone: string; reason: string }>;
}

// ─── Blocked Users ───────────────────────────────────────────────────────────

export interface BlockedUserRow {
  id: number;
  event_id: number;
  user_id: number;
  reason: string | null;
  blocked_at: Date;
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message?: string;
  data?: T;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, string>;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Error handling (discriminated union for pattern matching) ────────────────

export type ErrorKind =
  | { kind: 'multer'; code: string }
  | { kind: 'fileType'; message: string }
  | { kind: 'pgDuplicate'; constraint?: string }
  | { kind: 'pgReference' }
  | { kind: 'pgMissing' }
  | { kind: 'operational'; statusCode: number; message: string; code?: string | null }
  | { kind: 'unknown'; error: Error };

// ─── Socket ──────────────────────────────────────────────────────────────────

export interface SocketUser {
  id: number;
  type: UserType;
}

export interface AuthenticatedSocket extends Socket {
  user: SocketUser;
}

// ─── Event Statistics ────────────────────────────────────────────────────────

export interface EventStatistics {
  participants: number;
  whitelist: {
    total_active: number;
    registered: number;
    pending: number;
    removed: number;
  };
  matches: {
    total_matches: number;
    users_with_matches: number;
  };
  messages: {
    total_messages: number;
    users_who_sent: number;
    conversations_with_messages: number;
  };
  likes: {
    total_swipes: number;
    likes: number;
    passes: number;
    users_who_swiped: number;
  };
  activeUsers: number;
}

// ─── Controller method type ──────────────────────────────────────────────────

export type ControllerMethod = (req: Request, res: Response, next?: NextFunction) => Promise<void | Response>;

