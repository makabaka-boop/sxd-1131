import { adminApi, commonApi } from '../services/api';
import { Project, Floor, Area, HazardType, ResponsibilityGroup, User } from '../types';
import { showToast, formatDate } from '../utils';

export class AdminPage {
  private container: HTMLElement;
  private user: User;
  private activeTab = 'projects';
  private currentPage = 1;
  private pageSize = 20;

  constructor(container: HTMLElement) {
    this.container = container;
    this.user = JSON.parse(localStorage.getItem('user') || '{}');
    this.render();
    this.loadData();
  }

  private render() {
    this.container.innerHTML = `
      <div class="header">
        <h1>施工隐患管理系统 - 管理后台</h1>
        <div class="user-info">
          <span>欢迎，${this.user.name} (管理员)</span>
          <button class="btn btn-default btn-sm" id="logoutBtn">退出登录</button>
        </div>
      </div>
      <div class="page">
        <div class="tabs" id="tabs">
          <div class="tab-item active" data-tab="projects">项目管理</div>
          <div class="tab-item" data-tab="floors">楼层管理</div>
          <div class="tab-item" data-tab="areas">区域管理</div>
          <div class="tab-item" data-tab="hazardTypes">隐患字典</div>
          <div class="tab-item" data-tab="groups">责任小组</div>
        </div>
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="display: flex; gap: 12px; align-items: center;">
              <input type="text" id="searchInput" placeholder="搜索..." style="padding: 6px 12px; border: 1px solid #d9d9d9; border-radius: 4px;" />
              <button class="btn btn-default btn-sm" id="searchBtn">搜索</button>
              <button class="btn btn-default btn-sm" id="resetBtn">重置</button>
            </div>
            <button class="btn btn-primary btn-sm" id="addBtn">新增</button>
          </div>
          <div id="tableContainer"></div>
          <div id="pagination"></div>
        </div>
      </div>
      <div id="modalContainer"></div>
    `;

    this.bindEvents();
  }

  private bindEvents() {
    const tabs = this.container.querySelectorAll('.tab-item');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeTab = (tab as HTMLElement).dataset.tab!;
        this.currentPage = 1;
        (this.container.querySelector('#searchInput') as HTMLInputElement).value = '';
        this.loadData();
      });
    });

    this.container.querySelector('#logoutBtn')!.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.hash = '#/login';
    });

    this.container.querySelector('#searchBtn')!.addEventListener('click', () => {
      this.currentPage = 1;
      this.loadData();
    });

    this.container.querySelector('#resetBtn')!.addEventListener('click', () => {
      (this.container.querySelector('#searchInput') as HTMLInputElement).value = '';
      this.currentPage = 1;
      this.loadData();
    });

    this.container.querySelector('#addBtn')!.addEventListener('click', () => {
      this.showModal();
    });
  }

  private async loadData() {
    const keyword = (this.container.querySelector('#searchInput') as HTMLInputElement).value;
    
    try {
      let result: any;
      switch (this.activeTab) {
        case 'projects':
          result = await adminApi.getProjects(this.currentPage, this.pageSize, keyword);
          break;
        case 'floors':
          result = await adminApi.getFloors(undefined, this.currentPage, this.pageSize, keyword);
          break;
        case 'areas':
          result = await adminApi.getAreas(undefined, this.currentPage, this.pageSize, keyword);
          break;
        case 'hazardTypes':
          result = await adminApi.getHazardTypes(null, this.currentPage, this.pageSize, keyword);
          break;
        case 'groups':
          result = await adminApi.getGroups(this.currentPage, this.pageSize, keyword);
          break;
      }
      this.renderTable(result.list);
      this.renderPagination(result.total, result.page, result.pageSize);
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error');
    }
  }

  private renderTable(list: any[]) {
    const container = this.container.querySelector('#tableContainer')!;
    
    if (list.length === 0) {
      container.innerHTML = '<div class="empty">暂无数据</div>';
      return;
    }

    const headers: Record<string, string[]> = {
      projects: ['ID', '项目名称', '项目编码', '创建时间', '操作'],
      floors: ['ID', '项目', '楼层名称', '楼层编码', '创建时间', '操作'],
      areas: ['ID', '项目', '楼层', '区域名称', '区域编码', '创建时间', '操作'],
      hazardTypes: ['ID', '上级分类', '名称', '编码', '创建时间', '操作'],
      groups: ['ID', '小组名称', '组长', '联系电话', '创建时间', '操作'],
    };

    const headerRow = headers[this.activeTab];
    const isHazardTypes = this.activeTab === 'hazardTypes';
    
    let html = `<table class="table"><thead><tr>`;
    headerRow.forEach(h => html += `<th>${h}</th>`);
    html += `</tr></thead><tbody>`;

    list.forEach((item: any) => {
      html += `<tr>`;
      switch (this.activeTab) {
        case 'projects':
          html += `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.code}</td>
            <td>${formatDate(item.created_at)}</td>
          `;
          break;
        case 'floors':
          html += `
            <td>${item.id}</td>
            <td>${item.project_name || '-'}</td>
            <td>${item.name}</td>
            <td>${item.code}</td>
            <td>${formatDate(item.created_at)}</td>
          `;
          break;
        case 'areas':
          html += `
            <td>${item.id}</td>
            <td>${item.project_name || '-'}</td>
            <td>${item.floor_name || '-'}</td>
            <td>${item.name}</td>
            <td>${item.code}</td>
            <td>${formatDate(item.created_at)}</td>
          `;
          break;
        case 'hazardTypes':
          html += `
            <td>${item.id}</td>
            <td>${item.parent_id ? '二级分类' : '一级分类'}</td>
            <td>${item.name}</td>
            <td>${item.code}</td>
            <td>${formatDate(item.created_at)}</td>
          `;
          break;
        case 'groups':
          html += `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.leader}</td>
            <td>${item.phone}</td>
            <td>${formatDate(item.created_at)}</td>
          `;
          break;
      }
      html += `
        <td>
          <button class="btn btn-default btn-sm" data-edit="${item.id}">编辑</button>
          <button class="btn btn-danger btn-sm" data-delete="${item.id}" style="margin-left: 8px;">删除</button>
        </td>
      </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number((btn as HTMLElement).dataset.edit);
        const item = list.find((x: any) => x.id === id);
        this.showModal(item);
      });
    });

    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number((btn as HTMLElement).dataset.delete);
        if (confirm('确定要删除吗？')) {
          try {
            switch (this.activeTab) {
              case 'projects':
                await adminApi.deleteProject(id);
                break;
              case 'floors':
                await adminApi.deleteFloor(id);
                break;
              case 'areas':
                await adminApi.deleteArea(id);
                break;
              case 'hazardTypes':
                await adminApi.deleteHazardType(id);
                break;
              case 'groups':
                await adminApi.deleteGroup(id);
                break;
            }
            showToast('删除成功');
            this.loadData();
          } catch (err: any) {
            showToast(err.message || '删除失败', 'error');
          }
        }
      });
    });
  }

  private renderPagination(total: number, page: number, pageSize: number) {
    const container = this.container.querySelector('#pagination')!;
    const totalPages = Math.ceil(total / pageSize);
    
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = '<div class="pagination">';
    html += `<button ${page <= 1 ? 'disabled' : ''} data-page="prev">上一页</button>`;
    
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    
    for (let i = start; i <= end; i++) {
      html += `<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    
    html += `<button ${page >= totalPages ? 'disabled' : ''} data-page="next">下一页</button>`;
    html += '</div>';
    
    container.innerHTML = html;

    container.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.page;
        if (action === 'prev') {
          this.currentPage = Math.max(1, page - 1);
        } else if (action === 'next') {
          this.currentPage = Math.min(totalPages, page + 1);
        } else {
          this.currentPage = Number(action);
        }
        this.loadData();
      });
    });
  }

  private async showModal(item?: any) {
    const container = this.container.querySelector('#modalContainer')!;
    const isEdit = !!item;
    const titleMap: Record<string, string> = {
      projects: isEdit ? '编辑项目' : '新增项目',
      floors: isEdit ? '编辑楼层' : '新增楼层',
      areas: isEdit ? '编辑区域' : '新增区域',
      hazardTypes: isEdit ? '编辑隐患类型' : '新增隐患类型',
      groups: isEdit ? '编辑责任小组' : '新增责任小组',
    };

    let formHtml = '';
    switch (this.activeTab) {
      case 'projects':
        formHtml = `
          <div class="form-item">
            <label>项目名称</label>
            <input type="text" id="name" value="${item?.name || ''}" />
          </div>
          <div class="form-item">
            <label>项目编码</label>
            <input type="text" id="code" value="${item?.code || ''}" />
          </div>
        `;
        break;
      case 'floors':
        const projects = await commonApi.getAllProjects();
        formHtml = `
          <div class="form-item">
            <label>所属项目</label>
            <select id="project_id">
              <option value="">请选择</option>
              ${projects.map(p => `<option value="${p.id}" ${item?.project_id === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-item">
            <label>楼层名称</label>
            <input type="text" id="name" value="${item?.name || ''}" />
          </div>
          <div class="form-item">
            <label>楼层编码</label>
            <input type="text" id="code" value="${item?.code || ''}" />
          </div>
        `;
        break;
      case 'areas':
        const projects2 = await commonApi.getAllProjects();
        const floors = item?.project_id ? await commonApi.getAllFloors(item.project_id) : [];
        formHtml = `
          <div class="form-item">
            <label>所属项目</label>
            <select id="project_id">
              <option value="">请选择</option>
              ${projects2.map(p => `<option value="${p.id}" ${item?.project_id === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-item">
            <label>所属楼层</label>
            <select id="floor_id">
              <option value="">请选择</option>
              ${floors.map(f => `<option value="${f.id}" ${item?.floor_id === f.id ? 'selected' : ''}>${f.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-item">
            <label>区域名称</label>
            <input type="text" id="name" value="${item?.name || ''}" />
          </div>
          <div class="form-item">
            <label>区域编码</label>
            <input type="text" id="code" value="${item?.code || ''}" />
          </div>
        `;
        break;
      case 'hazardTypes':
        const parentTypes = await commonApi.getAllHazardTypes(null);
        formHtml = `
          <div class="form-item">
            <label>上级分类</label>
            <select id="parent_id">
              <option value="">无（一级分类）</option>
              ${parentTypes.map(p => `<option value="${p.id}" ${item?.parent_id === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-item">
            <label>分类名称</label>
            <input type="text" id="name" value="${item?.name || ''}" />
          </div>
          <div class="form-item">
            <label>分类编码</label>
            <input type="text" id="code" value="${item?.code || ''}" />
          </div>
        `;
        break;
      case 'groups':
        formHtml = `
          <div class="form-item">
            <label>小组名称</label>
            <input type="text" id="name" value="${item?.name || ''}" />
          </div>
          <div class="form-item">
            <label>组长</label>
            <input type="text" id="leader" value="${item?.leader || ''}" />
          </div>
          <div class="form-item">
            <label>联系电话</label>
            <input type="text" id="phone" value="${item?.phone || ''}" />
          </div>
        `;
        break;
    }

    container.innerHTML = `
      <div class="modal-mask">
        <div class="modal">
          <div class="modal-header">${titleMap[this.activeTab]}</div>
          <div class="modal-body">${formHtml}</div>
          <div class="modal-footer">
            <button class="btn btn-default" id="cancelBtn">取消</button>
            <button class="btn btn-primary" id="saveBtn">保存</button>
          </div>
        </div>
      </div>
    `;

    if (this.activeTab === 'areas') {
      const projectSelect = container.querySelector('#project_id') as HTMLSelectElement;
      const floorSelect = container.querySelector('#floor_id') as HTMLSelectElement;
      projectSelect.addEventListener('change', async () => {
        const projectId = projectSelect.value ? Number(projectSelect.value) : null;
        floorSelect.innerHTML = '<option value="">请选择</option>';
        if (projectId) {
          const floors = await commonApi.getAllFloors(projectId);
          floors.forEach(f => {
            const opt = document.createElement('option');
            opt.value = String(f.id);
            opt.textContent = f.name;
            floorSelect.appendChild(opt);
          });
        }
      });
    }

    container.querySelector('#cancelBtn')!.addEventListener('click', () => {
      container.innerHTML = '';
    });

    container.querySelector('#saveBtn')!.addEventListener('click', async () => {
      const getData = (): any => {
        const data: any = {};
        container.querySelectorAll('input, select').forEach((el: any) => {
          if (el.id) {
            data[el.id] = el.value === '' ? (el.id === 'parent_id' ? null : undefined) : el.id === 'project_id' || el.id === 'floor_id' || el.id === 'parent_id' ? Number(el.value) : el.value;
          }
        });
        return data;
      };

      try {
        const data = getData();
        if (isEdit) {
          switch (this.activeTab) {
            case 'projects':
              await adminApi.updateProject(item.id, data);
              break;
            case 'floors':
              await adminApi.updateFloor(item.id, data);
              break;
            case 'areas':
              await adminApi.updateArea(item.id, data);
              break;
            case 'hazardTypes':
              await adminApi.updateHazardType(item.id, data);
              break;
            case 'groups':
              await adminApi.updateGroup(item.id, data);
              break;
          }
          showToast('更新成功');
        } else {
          switch (this.activeTab) {
            case 'projects':
              await adminApi.createProject(data);
              break;
            case 'floors':
              await adminApi.createFloor(data);
              break;
            case 'areas':
              await adminApi.createArea(data);
              break;
            case 'hazardTypes':
              await adminApi.createHazardType(data);
              break;
            case 'groups':
              await adminApi.createGroup(data);
              break;
          }
          showToast('创建成功');
        }
        container.innerHTML = '';
        this.loadData();
      } catch (err: any) {
        showToast(err.message || '保存失败', 'error');
      }
    });
  }
}
