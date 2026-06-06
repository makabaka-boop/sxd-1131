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
  project_name?: string;
  floor_name?: string;
  area_name?: string;
  hazard_type_name?: string;
  hazard_type_parent_name?: string;
  group_name?: string;
  executor_name?: string;
  supervisor_name?: string;
  remaining_days?: number | null;
  is_overdue?: boolean;
  overdue_days?: number;
  warning_status?: 'normal' | 'expiring_soon' | 'overdue' | 'closed';
}

export interface RectificationDeadlineRule {
  id: number;
  hazard_type_parent_id: number;
  default_days: number;
  created_at: string;
  updated_at: string;
  hazard_type_name?: string;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FilterParams {
  projectId?: number;
  floorId?: number;
  areaId?: number;
  hazardTypeId?: number;
  groupId?: number;
  status?: string;
  keyword?: string;
  warningStatus?: string;
}
