import { HazardRecord } from '../types';
import { getStatusText, getStatusClass, formatDate } from '../utils';

interface VirtualListOptions {
  itemHeight: number;
  containerHeight: number;
  loadData: (page: number, pageSize: number) => Promise<{ list: HazardRecord[]; total: number }>;
  onItemClick?: (item: HazardRecord) => void;
  renderItem?: (item: HazardRecord) => HTMLElement;
}

export class VirtualList {
  private container: HTMLElement;
  private options: VirtualListOptions;
  private scrollContainer!: HTMLElement;
  private phantom!: HTMLElement;
  private content!: HTMLElement;
  
  private data: HazardRecord[] = [];
  private total = 0;
  private visibleCount = 0;
  private startIndex = 0;
  private bufferSize = 5;
  private isLoading = false;
  private loadedPages = new Set<number>();
  private pageSize = 50;

  constructor(container: HTMLElement, options: VirtualListOptions) {
    this.container = container;
    this.options = options;
    this.visibleCount = Math.ceil(options.containerHeight / options.itemHeight) + this.bufferSize * 2;
    this.render();
    this.bindEvents();
    this.loadPage(1);
  }

  private render() {
    this.container.innerHTML = `
      <div class="virtual-list-container" style="height: ${this.options.containerHeight}px;">
        <div class="virtual-list-phantom"></div>
        <div class="virtual-list-content"></div>
      </div>
    `;
    this.scrollContainer = this.container.querySelector('.virtual-list-container')!;
    this.phantom = this.container.querySelector('.virtual-list-phantom')!;
    this.content = this.container.querySelector('.virtual-list-content')!;
  }

  private bindEvents() {
    this.scrollContainer.addEventListener('scroll', () => {
      this.onScroll();
    });
  }

  private async onScroll() {
    const scrollTop = this.scrollContainer.scrollTop;
    const totalHeight = this.total * this.options.itemHeight;
    const scrollHeight = this.scrollContainer.scrollHeight;
    const clientHeight = this.scrollContainer.clientHeight;

    const newStartIndex = Math.max(0, Math.floor(scrollTop / this.options.itemHeight) - this.bufferSize);
    if (newStartIndex !== this.startIndex) {
      this.startIndex = newStartIndex;
      this.renderItems();
    }

    const scrollBottom = scrollTop + clientHeight;
    if (scrollBottom >= scrollHeight - 100 && !this.isLoading) {
      const nextPage = Math.ceil(this.data.length / this.pageSize) + 1;
      const maxPage = Math.ceil(this.total / this.pageSize);
      if (nextPage <= maxPage && !this.loadedPages.has(nextPage)) {
        await this.loadPage(nextPage);
      }
    }
  }

  private async loadPage(page: number) {
    if (this.loadedPages.has(page) || this.isLoading) return;
    
    this.isLoading = true;
    this.loadedPages.add(page);
    
    try {
      const result = await this.options.loadData(page, this.pageSize);
      this.total = result.total;
      
      const startIdx = (page - 1) * this.pageSize;
      result.list.forEach((item, idx) => {
        this.data[startIdx + idx] = item;
      });
      
      this.phantom.style.height = `${this.total * this.options.itemHeight}px`;
      this.renderItems();
    } catch (err) {
      this.loadedPages.delete(page);
    } finally {
      this.isLoading = false;
    }
  }

  private renderItems() {
    const endIndex = Math.min(this.startIndex + this.visibleCount, this.total);
    const visibleData: HazardRecord[] = [];
    
    for (let i = this.startIndex; i < endIndex; i++) {
      if (this.data[i]) {
        visibleData.push(this.data[i]);
      }
    }

    this.content.style.transform = `translateY(${this.startIndex * this.options.itemHeight}px)`;
    this.content.innerHTML = '';

    visibleData.forEach((item, index) => {
      const itemEl = this.options.renderItem 
        ? this.options.renderItem(item)
        : this.createDefaultItem(item);
      
      itemEl.style.height = `${this.options.itemHeight}px`;
      itemEl.style.boxSizing = 'border-box';
      
      if (this.options.onItemClick) {
        itemEl.addEventListener('click', () => {
          this.options.onItemClick!(item);
        });
      }
      
      this.content.appendChild(itemEl);
    });

    if (visibleData.length === 0 && this.data.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = '暂无数据';
      this.content.appendChild(empty);
    }
  }

  private createDefaultItem(item: HazardRecord): HTMLElement {
    const el = document.createElement('div');
    el.className = 'virtual-list-item';
    
    const title = document.createElement('div');
    title.className = 'list-item-title';
    title.textContent = `#${item.id} ${item.hazard_type_parent_name || ''} ${item.hazard_type_name || ''}`;
    
    const meta = document.createElement('div');
    meta.className = 'list-item-meta';
    
    const project = document.createElement('span');
    project.textContent = item.project_name || '';
    
    const location = document.createElement('span');
    location.textContent = `${item.floor_name || ''} ${item.area_name || ''}`;
    
    const status = document.createElement('span');
    status.className = getStatusClass(item.status);
    status.textContent = getStatusText(item.status);
    
    const time = document.createElement('span');
    time.textContent = formatDate(item.created_at);
    
    meta.appendChild(project);
    meta.appendChild(location);
    meta.appendChild(status);
    meta.appendChild(time);
    
    const desc = document.createElement('div');
    desc.style.fontSize = '12px';
    desc.style.color = '#666';
    desc.style.marginTop = '4px';
    desc.style.overflow = 'hidden';
    desc.style.textOverflow = 'ellipsis';
    desc.style.whiteSpace = 'nowrap';
    desc.textContent = item.description;
    
    el.appendChild(title);
    el.appendChild(meta);
    el.appendChild(desc);
    
    return el;
  }

  public async refresh() {
    this.data = [];
    this.total = 0;
    this.startIndex = 0;
    this.loadedPages.clear();
    this.scrollContainer.scrollTop = 0;
    await this.loadPage(1);
  }

  public reset() {
    this.data = [];
    this.total = 0;
    this.startIndex = 0;
    this.loadedPages.clear();
    this.phantom.style.height = '0px';
    this.content.innerHTML = '<div class="empty">暂无数据</div>';
  }
}
