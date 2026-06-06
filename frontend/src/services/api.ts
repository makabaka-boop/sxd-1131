import { User, Project, Floor, Area, HazardType, ResponsibilityGroup, HazardRecord, PageResult, FilterParams } from '../types';

const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.hash = '#/login';
    }
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }

  if (url.includes('/export')) {
    return response.blob() as unknown as T;
  }

  return response.json();
}

export const authApi = {
  login: (username: string, password: string) => 
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
};

export const adminApi = {
  getProjects: (page = 1, pageSize = 20, keyword = '') =>
    request<PageResult<Project>>(`/admin/projects?page=${page}&pageSize=${pageSize}&keyword=${encodeURIComponent(keyword)}`),
  createProject: (data: Partial<Project>) =>
    request<Project>('/admin/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: number, data: Partial<Project>) =>
    request<{ success: boolean }>(`/admin/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: number) =>
    request<{ success: boolean }>(`/admin/projects/${id}`, { method: 'DELETE' }),

  getFloors: (projectId?: number, page = 1, pageSize = 20, keyword = '') =>
    request<PageResult<Floor>>(`/admin/floors?projectId=${projectId || ''}&page=${page}&pageSize=${pageSize}&keyword=${encodeURIComponent(keyword)}`),
  createFloor: (data: Partial<Floor>) =>
    request<Floor>('/admin/floors', { method: 'POST', body: JSON.stringify(data) }),
  updateFloor: (id: number, data: Partial<Floor>) =>
    request<{ success: boolean }>(`/admin/floors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFloor: (id: number) =>
    request<{ success: boolean }>(`/admin/floors/${id}`, { method: 'DELETE' }),

  getAreas: (floorId?: number, page = 1, pageSize = 20, keyword = '') =>
    request<PageResult<Area>>(`/admin/areas?floorId=${floorId || ''}&page=${page}&pageSize=${pageSize}&keyword=${encodeURIComponent(keyword)}`),
  createArea: (data: Partial<Area>) =>
    request<Area>('/admin/areas', { method: 'POST', body: JSON.stringify(data) }),
  updateArea: (id: number, data: Partial<Area>) =>
    request<{ success: boolean }>(`/admin/areas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteArea: (id: number) =>
    request<{ success: boolean }>(`/admin/areas/${id}`, { method: 'DELETE' }),

  getHazardTypes: (parentId?: number | null, page = 1, pageSize = 50, keyword = '') =>
    request<PageResult<HazardType>>(`/admin/hazard-types?parentId=${parentId === null ? 'null' : parentId || ''}&page=${page}&pageSize=${pageSize}&keyword=${encodeURIComponent(keyword)}`),
  createHazardType: (data: Partial<HazardType>) =>
    request<HazardType>('/admin/hazard-types', { method: 'POST', body: JSON.stringify(data) }),
  updateHazardType: (id: number, data: Partial<HazardType>) =>
    request<{ success: boolean }>(`/admin/hazard-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHazardType: (id: number) =>
    request<{ success: boolean }>(`/admin/hazard-types/${id}`, { method: 'DELETE' }),

  getGroups: (page = 1, pageSize = 20, keyword = '') =>
    request<PageResult<ResponsibilityGroup>>(`/admin/groups?page=${page}&pageSize=${pageSize}&keyword=${encodeURIComponent(keyword)}`),
  createGroup: (data: Partial<ResponsibilityGroup>) =>
    request<ResponsibilityGroup>('/admin/groups', { method: 'POST', body: JSON.stringify(data) }),
  updateGroup: (id: number, data: Partial<ResponsibilityGroup>) =>
    request<{ success: boolean }>(`/admin/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGroup: (id: number) =>
    request<{ success: boolean }>(`/admin/groups/${id}`, { method: 'DELETE' }),
};

export const executorApi = {
  getHazards: (params: FilterParams & { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, String(v));
    });
    return request<PageResult<HazardRecord>>(`/executor/hazards?${query.toString()}`);
  },
  createHazard: (data: Partial<HazardRecord>) =>
    request<{ id: number }>('/executor/hazards', { method: 'POST', body: JSON.stringify(data) }),
  rectifyHazard: (id: number, data: { rectification_desc: string; rectification_photos?: string }) =>
    request<{ success: boolean }>(`/executor/hazards/${id}/rectify`, { method: 'PUT', body: JSON.stringify(data) }),
  exportHazards: (params: FilterParams) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, String(v));
    });
    return request<Blob>(`/executor/hazards/export?${query.toString()}`);
  },
};

export const supervisorApi = {
  getHazards: (params: FilterParams & { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, String(v));
    });
    return request<PageResult<HazardRecord>>(`/supervisor/hazards?${query.toString()}`);
  },
  reviewHazard: (id: number, data: { review_comment?: string; pass: boolean }) =>
    request<{ success: boolean }>(`/supervisor/hazards/${id}/review`, { method: 'PUT', body: JSON.stringify(data) }),
};

export const commonApi = {
  getAllProjects: (keyword = '') =>
    request<Project[]>(`/common/projects/all?keyword=${encodeURIComponent(keyword)}`),
  getAllFloors: (projectId: number, keyword = '') =>
    request<Floor[]>(`/common/floors/all?projectId=${projectId}&keyword=${encodeURIComponent(keyword)}`),
  getAllAreas: (floorId: number, keyword = '') =>
    request<Area[]>(`/common/areas/all?floorId=${floorId}&keyword=${encodeURIComponent(keyword)}`),
  getAllHazardTypes: (parentId?: number | null, keyword = '') =>
    request<HazardType[]>(`/common/hazard-types/all?parentId=${parentId === null || parentId === undefined ? 'null' : parentId}&keyword=${encodeURIComponent(keyword)}`),
  getAllGroups: (keyword = '') =>
    request<ResponsibilityGroup[]>(`/common/groups/all?keyword=${encodeURIComponent(keyword)}`),
  
  getVirtualHazards: (params: FilterParams & { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, String(v));
    });
    return request<PageResult<HazardRecord>>(`/common/hazards/virtual?${query.toString()}`);
  },
  
  exportHazards: (params: FilterParams) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, String(v));
    });
    return request<Blob>(`/common/hazards/export?${query.toString()}`);
  },
};
