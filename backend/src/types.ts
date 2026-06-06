export interface User {
  id: number;
  username: string;
  role: 'admin' | 'executor' | 'supervisor';
  name: string;
}

export interface Project {
  id: number;
  name: string;
  code: string;
  created_at: string;
}

export interface Floor {
  id: number;
  project_id: number;
  name: string;
  code: string;
  created_at: string;
}

export interface Area {
  id: number;
  floor_id: number;
  name: string;
  code: string;
  created_at: string;
}

export interface HazardType {
  id: number;
  parent_id: number | null;
  name: string;
  code: string;
  created_at: string;
}

export interface ResponsibilityGroup {
  id: number;
  name: string;
  leader: string;
  phone: string;
  created_at: string;
}

export interface HazardRecord {
  id: number;
  project_id: number;
  floor_id: number;
  area_id: number;
  hazard_type_id: number;
  group_id: number;
  description: string;
  photos: string;
  status: 'pending' | 'rectifying' | 'closed';
  executor_id: number;
  supervisor_id: number | null;
  rectification_desc: string | null;
  rectification_photos: string | null;
  review_comment: string | null;
  deadline_date: string | null;
  created_at: string;
  rectified_at: string | null;
  closed_at: string | null;
}

export interface RectificationDeadlineRule {
  id: number;
  hazard_type_parent_id: number;
  default_days: number;
  created_at: string;
  updated_at: string;
}

export interface JwtPayload {
  userId: number;
  username: string;
  role: 'admin' | 'executor' | 'supervisor';
}
