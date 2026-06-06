import { supervisorApi, commonApi } from '../services/api';
import { User, HazardRecord, FilterParams } from '../types';
import { showToast, getStatusText, getStatusClass, formatDate, downloadBlob } from '../utils';
import { VirtualList } from '../components/VirtualList';
import { createHazardCascade, createHazardTypeCascade, CascadeDropdown } from '../components/CascadeDropdown';

export class SupervisorPage {
  private container: HTMLElement;
  private user: User;
  private virtualList!: VirtualList;
  private locationCascade!: CascadeDropdown;
  private hazardTypeCascade!: CascadeDropdown;
  private filterParams: FilterParams = {};

  constructor(container: HTMLElement) {
    this.container = container;
    this.user = JSON.parse(localStorage.getItem('user') || '{}');
    this.render();
    this.initComponents();
  }

  private render() {
    this.container.innerHTML = `
      <div class="header">
        <h1>施工隐患管理系统 - 监督人</h1>
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
                <option value="rectifying">待复核</option>
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
            <button class="btn btn-primary btn-sm" id="exportBtn">导出Excel</button>
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

    this.virtualList = new VirtualList(
      this.container.querySelector('#virtualListContainer')!,
      {
        itemHeight: 80,
        containerHeight: 500,
        loadData: async (page, pageSize) => {
          const result = await supervisorApi.getHazards({
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

    this.container.querySelector('#exportBtn')!.addEventListener('click', async () => {
      try {
        const blob = await commonApi.exportHazards(this.filterParams);
        downloadBlob(blob, `隐患记录_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
            ${item.status === 'rectifying' ? `
              <button class="btn btn-danger" id="rejectBtn">退回整改</button>
              <button class="btn btn-success" id="passBtn">通过关闭</button>
            ` : ''}
            <button class="btn btn-default" id="closeBtn">关闭</button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#closeBtn')!.addEventListener('click', () => {
      container.innerHTML = '';
    });

    const passBtn = container.querySelector('#passBtn');
    const rejectBtn = container.querySelector('#rejectBtn');

    if (passBtn) {
      passBtn.addEventListener('click', () => {
        this.showReviewModal(item, true);
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => {
        this.showReviewModal(item, false);
      });
    }
  }

  private showReviewModal(item: HazardRecord, pass: boolean) {
    const container = this.container.querySelector('#modalContainer')!;
    container.innerHTML = `
      <div class="modal-mask">
        <div class="modal">
          <div class="modal-header">${pass ? '复核通过' : '退回整改'}</div>
          <div class="modal-body">
            <div class="form-item">
              <label>复核意见${pass ? '（可选）' : ' *'}</label>
              <textarea id="review_comment" placeholder="请输入复核意见..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-default" id="cancelBtn">取消</button>
            <button class="btn ${pass ? 'btn-success' : 'btn-danger'}" id="submitBtn">确认${pass ? '通过' : '退回'}</button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#cancelBtn')!.addEventListener('click', () => {
      container.innerHTML = '';
    });

    container.querySelector('#submitBtn')!.addEventListener('click', async () => {
      const review_comment = (container.querySelector('#review_comment') as HTMLTextAreaElement).value;

      if (!pass && !review_comment.trim()) {
        showToast('请输入退回原因', 'error');
        return;
      }

      try {
        await supervisorApi.reviewHazard(item.id, {
          review_comment: review_comment.trim() || undefined,
          pass,
        });
        showToast(pass ? '已通过并关闭' : '已退回整改');
        container.innerHTML = '';
        this.virtualList.refresh();
      } catch (err: any) {
        showToast(err.message || '操作失败', 'error');
      }
    });
  }
}
