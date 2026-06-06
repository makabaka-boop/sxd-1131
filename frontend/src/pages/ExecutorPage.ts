import { executorApi, commonApi } from '../services/api';
import { User, HazardRecord, FilterParams, RectificationDeadlineRule } from '../types';
import { showToast, getStatusText, getStatusClass, formatDate, downloadBlob, getWarningDisplayText, getWarningStatusText, getWarningStatusClass } from '../utils';
import { VirtualList } from '../components/VirtualList';
import { createHazardCascade, createHazardTypeCascade, CascadeDropdown } from '../components/CascadeDropdown';

export class ExecutorPage {
  private container: HTMLElement;
  private user: User;
  private virtualList!: VirtualList;
  private locationCascade!: CascadeDropdown;
  private hazardTypeCascade!: CascadeDropdown;
  private filterParams: FilterParams = {};
  private deadlineRules: RectificationDeadlineRule[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.user = JSON.parse(localStorage.getItem('user') || '{}');
    this.render();
    this.initComponents();
  }

  private render() {
    this.container.innerHTML = `
      <div class="header">
        <h1>施工隐患管理系统 - 执行人</h1>
        <div class="user-info">
          <span>欢迎，${this.user.name}</span>
          <button class="btn btn-default btn-sm" id="logoutBtn">退出登录</button>
        </div>
      </div>
      <div class="page">
        <div class="card">
          <div class="card-title">筛选条件</div>
          <div class="filter-bar">
            <div class="filter-item">
              <label>位置筛选</label>
              <div id="locationCascade"></div>
            </div>
            <div class="filter-item">
              <label>隐患类型</label>
              <div id="hazardTypeCascade"></div>
            </div>
            <div class="filter-item">
              <label>责任小组</label>
              <select id="groupId">
                <option value="">全部</option>
              </select>
            </div>
            <div class="filter-item">
              <label>状态</label>
              <select id="status">
                <option value="">全部</option>
                <option value="pending">待整改</option>
                <option value="rectifying">整改中</option>
                <option value="closed">已关闭</option>
              </select>
            </div>
            <div class="filter-item">
              <label>关键词</label>
              <input type="text" id="keyword" placeholder="搜索描述..." />
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-primary btn-sm" id="searchBtn">查询</button>
              <button class="btn btn-default btn-sm" id="resetBtn">重置</button>
            </div>
          </div>
        </div>
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div class="card-title" style="margin: 0;">隐患记录列表</div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-success btn-sm" id="addBtn">填报隐患</button>
              <button class="btn btn-primary btn-sm" id="exportBtn">导出Excel</button>
            </div>
          </div>
          <div id="virtualListContainer"></div>
        </div>
      </div>
      <div id="modalContainer"></div>
    `;

    this.bindEvents();
  }

  private async initComponents() {
    this.locationCascade = createHazardCascade(this.container.querySelector('#locationCascade')!, (values, labels) => {
      this.filterParams.projectId = values.projectId;
      this.filterParams.floorId = values.floorId;
      this.filterParams.areaId = values.areaId;
    });

    this.hazardTypeCascade = createHazardTypeCascade(this.container.querySelector('#hazardTypeCascade')!, (values, labels) => {
      this.filterParams.hazardTypeId = values.hazardTypeId;
    });

    const groups = await commonApi.getAllGroups();
    const groupSelect = this.container.querySelector('#groupId') as HTMLSelectElement;
    groups.forEach(g => {
      const opt = document.createElement('option');
      opt.value = String(g.id);
      opt.textContent = g.name;
      groupSelect.appendChild(opt);
    });

    try {
      this.deadlineRules = await commonApi.getAllDeadlineRules();
    } catch (e) {
      console.error('加载整改时限规则失败', e);
    }

    this.virtualList = new VirtualList(
      this.container.querySelector('#virtualListContainer')!,
      {
        itemHeight: 80,
        containerHeight: 500,
        loadData: async (page, pageSize) => {
          const result = await executorApi.getHazards({
            ...this.filterParams,
            page,
            pageSize,
          });
          return result;
        },
        onItemClick: (item) => {
          this.showDetailModal(item);
        },
      }
    );
  }

  private bindEvents() {
    this.container.querySelector('#logoutBtn')!.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.hash = '#/login';
    });

    this.container.querySelector('#searchBtn')!.addEventListener('click', () => {
      const status = (this.container.querySelector('#status') as HTMLSelectElement).value;
      const groupId = (this.container.querySelector('#groupId') as HTMLSelectElement).value;
      const keyword = (this.container.querySelector('#keyword') as HTMLInputElement).value;
      
      this.filterParams.status = status || undefined;
      this.filterParams.groupId = groupId ? Number(groupId) : undefined;
      this.filterParams.keyword = keyword || undefined;
      
      this.virtualList.refresh();
    });

    this.container.querySelector('#resetBtn')!.addEventListener('click', () => {
      this.filterParams = {};
      (this.container.querySelector('#status') as HTMLSelectElement).value = '';
      (this.container.querySelector('#groupId') as HTMLSelectElement).value = '';
      (this.container.querySelector('#keyword') as HTMLInputElement).value = '';
      this.locationCascade.clear();
      this.hazardTypeCascade.clear();
      this.virtualList.refresh();
    });

    this.container.querySelector('#addBtn')!.addEventListener('click', () => {
      this.showAddModal();
    });

    this.container.querySelector('#exportBtn')!.addEventListener('click', async () => {
      try {
        const blob = await executorApi.exportHazards(this.filterParams);
        downloadBlob(blob, `我的隐患记录_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast('导出成功');
      } catch (err: any) {
        showToast(err.message || '导出失败', 'error');
      }
    });
  }

  private showDetailModal(item: HazardRecord) {
    const container = this.container.querySelector('#modalContainer')!;
    container.innerHTML = `
      <div class="modal-mask">
        <div class="modal" style="width: 600px;">
          <div class="modal-header">隐患详情</div>
          <div class="modal-body">
            <div class="hazard-detail">
              <div class="row"><span class="label">ID：</span><span class="value">${item.id}</span></div>
              <div class="row"><span class="label">项目：</span><span class="value">${item.project_name || '-'}</span></div>
              <div class="row"><span class="label">楼层：</span><span class="value">${item.floor_name || '-'}</span></div>
              <div class="row"><span class="label">区域：</span><span class="value">${item.area_name || '-'}</span></div>
              <div class="row"><span class="label">隐患类型：</span><span class="value">${item.hazard_type_name || '-'}</span></div>
              <div class="row"><span class="label">责任小组：</span><span class="value">${item.group_name || '-'}</span></div>
              <div class="row"><span class="label">状态：</span><span class="value"><span class="${getStatusClass(item.status)}">${getStatusText(item.status)}</span></span></div>
              <div class="row"><span class="label">整改截止时间：</span><span class="value">${item.deadline_date || '-'}</span></div>
              <div class="row"><span class="label">预警状态：</span><span class="value"><span class="${getWarningStatusClass(item.warning_status)}">${getWarningStatusText(item.warning_status)}</span></span></div>
              ${item.status !== 'closed' && item.deadline_date ? `
                <div class="row"><span class="label">时限信息：</span><span class="value">${getWarningDisplayText(item)}</span></div>
              ` : ''}
              <div class="row"><span class="label">创建时间：</span><span class="value">${formatDate(item.created_at)}</span></div>
              <div class="row"><span class="label">执行人：</span><span class="value">${item.executor_name || '-'}</span></div>
              <div class="row" style="margin-top: 12px;"><span class="label">隐患描述：</span></div>
              <div style="padding: 12px; background: #f5f5f5; border-radius: 4px; margin-bottom: 12px;">${item.description || '-'}</div>
              ${item.rectification_desc ? `
                <div class="row"><span class="label">整改说明：</span></div>
                <div style="padding: 12px; background: #e6f7ff; border-radius: 4px; margin-bottom: 12px;">${item.rectification_desc}</div>
                <div class="row"><span class="label">整改时间：</span><span class="value">${formatDate(item.rectified_at || '')}</span></div>
              ` : ''}
              ${item.review_comment ? `
                <div class="row"><span class="label">复核意见：</span></div>
                <div style="padding: 12px; background: #f6ffed; border-radius: 4px;">${item.review_comment}</div>
                <div class="row"><span class="label">关闭时间：</span><span class="value">${formatDate(item.closed_at || '')}</span></div>
              ` : ''}
            </div>
          </div>
          <div class="modal-footer">
            ${item.status === 'pending' ? `<button class="btn btn-primary" id="rectifyBtn">提交整改</button>` : ''}
            <button class="btn btn-default" id="closeBtn">关闭</button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#closeBtn')!.addEventListener('click', () => {
      container.innerHTML = '';
    });

    const rectifyBtn = container.querySelector('#rectifyBtn');
    if (rectifyBtn) {
      rectifyBtn.addEventListener('click', () => {
        container.innerHTML = '';
        this.showRectifyModal(item);
      });
    }
  }

  private showRectifyModal(item: HazardRecord) {
    const container = this.container.querySelector('#modalContainer')!;
    container.innerHTML = `
      <div class="modal-mask">
        <div class="modal">
          <div class="modal-header">提交整改</div>
          <div class="modal-body">
            <div class="form-item">
              <label>整改说明 *</label>
              <textarea id="rectification_desc" placeholder="请输入整改说明..."></textarea>
            </div>
            <div class="form-item">
              <label>整改照片（可选）</label>
              <input type="text" id="rectification_photos" placeholder="多张照片用逗号分隔" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-default" id="cancelBtn">取消</button>
            <button class="btn btn-primary" id="submitBtn">提交</button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#cancelBtn')!.addEventListener('click', () => {
      container.innerHTML = '';
    });

    container.querySelector('#submitBtn')!.addEventListener('click', async () => {
      const rectification_desc = (container.querySelector('#rectification_desc') as HTMLTextAreaElement).value;
      const rectification_photos = (container.querySelector('#rectification_photos') as HTMLInputElement).value;

      if (!rectification_desc.trim()) {
        showToast('请输入整改说明', 'error');
        return;
      }

      try {
        await executorApi.rectifyHazard(item.id, {
          rectification_desc: rectification_desc.trim(),
          rectification_photos: rectification_photos.trim() || undefined,
        });
        showToast('提交成功');
        container.innerHTML = '';
        this.virtualList.refresh();
      } catch (err: any) {
        showToast(err.message || '提交失败', 'error');
      }
    });
  }

  private async showAddModal() {
    const container = this.container.querySelector('#modalContainer')!;
    const projects = await commonApi.getAllProjects();
    const groups = await commonApi.getAllGroups();
    const hazardTypes = await commonApi.getAllHazardTypes(null);
    
    const today = new Date();
    const defaultDeadline = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const defaultDeadlineStr = defaultDeadline.toISOString().slice(0, 10);

    container.innerHTML = `
      <div class="modal-mask">
        <div class="modal" style="width: 600px;">
          <div class="modal-header">填报隐患</div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-item">
                <label>项目 *</label>
                <select id="project_id">
                  <option value="">请选择</option>
                  ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-item">
                <label>楼层 *</label>
                <select id="floor_id">
                  <option value="">请先选择项目</option>
                </select>
              </div>
              <div class="form-item">
                <label>区域 *</label>
                <select id="area_id">
                  <option value="">请先选择楼层</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-item">
                <label>隐患大类 *</label>
                <select id="hazardTypeParentId">
                  <option value="">请选择</option>
                  ${hazardTypes.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-item">
                <label>隐患子类 *</label>
                <select id="hazard_type_id">
                  <option value="">请先选择大类</option>
                </select>
              </div>
              <div class="form-item">
                <label>责任小组 *</label>
                <select id="group_id">
                  <option value="">请选择</option>
                  ${groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-item">
                <label>整改截止时间 *</label>
                <input type="date" id="deadline_date" value="${defaultDeadlineStr}" />
              </div>
              <div class="form-item" style="display: flex; align-items: flex-end;">
                <span style="font-size: 12px; color: #666; line-height: 32px;" id="defaultDaysHint">默认整改时限：7天</span>
              </div>
            </div>
            <div class="form-item">
              <label>隐患描述 *</label>
              <textarea id="description" placeholder="请详细描述隐患情况..."></textarea>
            </div>
            <div class="form-item">
              <label>照片（可选）</label>
              <input type="text" id="photos" placeholder="多张照片用逗号分隔" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-default" id="cancelBtn">取消</button>
            <button class="btn btn-primary" id="submitBtn">提交</button>
          </div>
        </div>
      </div>
    `;

    const projectSelect = container.querySelector('#project_id') as HTMLSelectElement;
    const floorSelect = container.querySelector('#floor_id') as HTMLSelectElement;
    const areaSelect = container.querySelector('#area_id') as HTMLSelectElement;
    const hazardTypeParentSelect = container.querySelector('#hazardTypeParentId') as HTMLSelectElement;
    const hazardTypeSelect = container.querySelector('#hazard_type_id') as HTMLSelectElement;

    projectSelect.addEventListener('change', async () => {
      const projectId = projectSelect.value ? Number(projectSelect.value) : null;
      floorSelect.innerHTML = '<option value="">请选择</option>';
      areaSelect.innerHTML = '<option value="">请先选择楼层</option>';
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

    floorSelect.addEventListener('change', async () => {
      const floorId = floorSelect.value ? Number(floorSelect.value) : null;
      areaSelect.innerHTML = '<option value="">请选择</option>';
      if (floorId) {
        const areas = await commonApi.getAllAreas(floorId);
        areas.forEach(a => {
          const opt = document.createElement('option');
          opt.value = String(a.id);
          opt.textContent = a.name;
          areaSelect.appendChild(opt);
        });
      }
    });

    hazardTypeParentSelect.addEventListener('change', async () => {
      const parentId = hazardTypeParentSelect.value ? Number(hazardTypeParentSelect.value) : null;
      hazardTypeSelect.innerHTML = '<option value="">请选择</option>';
      if (parentId) {
        const types = await commonApi.getAllHazardTypes(parentId);
        types.forEach(t => {
          const opt = document.createElement('option');
          opt.value = String(t.id);
          opt.textContent = t.name;
          hazardTypeSelect.appendChild(opt);
        });
        
        const rule = this.deadlineRules.find(r => r.hazard_type_parent_id === parentId);
        const defaultDays = rule ? rule.default_days : 7;
        const hintEl = container.querySelector('#defaultDaysHint');
        if (hintEl) {
          hintEl.textContent = `默认整改时限：${defaultDays}天`;
        }
        
        const deadlineInput = container.querySelector('#deadline_date') as HTMLInputElement;
        if (deadlineInput) {
          const newDeadline = new Date();
          newDeadline.setDate(newDeadline.getDate() + defaultDays);
          deadlineInput.value = newDeadline.toISOString().slice(0, 10);
        }
      }
    });

    container.querySelector('#cancelBtn')!.addEventListener('click', () => {
      container.innerHTML = '';
    });

    container.querySelector('#submitBtn')!.addEventListener('click', async () => {
      const project_id = Number((container.querySelector('#project_id') as HTMLSelectElement).value);
      const floor_id = Number((container.querySelector('#floor_id') as HTMLSelectElement).value);
      const area_id = Number((container.querySelector('#area_id') as HTMLSelectElement).value);
      const hazard_type_id = Number((container.querySelector('#hazard_type_id') as HTMLSelectElement).value);
      const group_id = Number((container.querySelector('#group_id') as HTMLSelectElement).value);
      const description = (container.querySelector('#description') as HTMLTextAreaElement).value;
      const photos = (container.querySelector('#photos') as HTMLInputElement).value;
      const deadline_date = (container.querySelector('#deadline_date') as HTMLInputElement).value;

      if (!project_id || !floor_id || !area_id || !hazard_type_id || !group_id || !description.trim() || !deadline_date) {
        showToast('请填写所有必填项', 'error');
        return;
      }

      try {
        await executorApi.createHazard({
          project_id,
          floor_id,
          area_id,
          hazard_type_id,
          group_id,
          description: description.trim(),
          photos: photos.trim() || undefined,
          deadline_date,
        });
        showToast('提交成功');
        container.innerHTML = '';
        this.virtualList.refresh();
      } catch (err: any) {
        showToast(err.message || '提交失败', 'error');
      }
    });
  }
}
