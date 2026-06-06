import { commonApi } from '../services/api';
import { Project, Floor, Area, HazardType, ResponsibilityGroup } from '../types';
import { debounce } from '../utils';

interface CascadeLevel {
  key: string;
  label: string;
  loadOptions: (parentId?: number) => Promise<any[]>;
  hasChildren?: boolean;
}

interface CascadeDropdownOptions {
  levels: CascadeLevel[];
  placeholder?: string;
  onChange?: (values: Record<string, number | undefined>, labels: Record<string, string>) => void;
}

export class CascadeDropdown {
  private container: HTMLElement;
  private options: CascadeDropdownOptions;
  private values: Record<string, number | undefined> = {};
  private labels: Record<string, string> = {};
  private levelData: Record<string, any[]> = {};
  private searchKeywords: Record<string, string> = {};
  private isOpen = false;

  constructor(container: HTMLElement, options: CascadeDropdownOptions) {
    this.container = container;
    this.options = options;
    this.render();
    this.bindEvents();
  }

  private render() {
    this.container.innerHTML = `
      <div class="cascade-dropdown">
        <div class="cascade-trigger">${this.options.placeholder || '请选择'}</div>
        <div class="cascade-panel" style="display: none;">
          <div class="cascade-columns"></div>
        </div>
      </div>
    `;
  }

  private bindEvents() {
    const trigger = this.container.querySelector('.cascade-trigger')!;
    const dropdown = this.container.querySelector('.cascade-dropdown')!;
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target as Node)) {
        this.close();
      }
    });
  }

  private async toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      await this.open();
    }
  }

  private async open() {
    this.isOpen = true;
    this.container.querySelector('.cascade-dropdown')!.classList.add('open');
    this.container.querySelector('.cascade-panel')!.setAttribute('style', '');
    await this.loadLevel(0);
    this.renderColumns();
  }

  private close() {
    this.isOpen = false;
    this.container.querySelector('.cascade-dropdown')!.classList.remove('open');
    this.container.querySelector('.cascade-panel')!.setAttribute('style', 'display: none;');
  }

  private async loadLevel(levelIndex: number, parentId?: number) {
    const level = this.options.levels[levelIndex];
    if (!level) return;

    try {
      const data = await level.loadOptions(parentId);
      this.levelData[level.key] = data;
    } catch (err) {
      this.levelData[level.key] = [];
    }
  }

  private renderColumns() {
    const columnsContainer = this.container.querySelector('.cascade-columns')!;
    columnsContainer.innerHTML = '';

    this.options.levels.forEach((level, index) => {
      const column = document.createElement('div');
      column.className = 'cascade-column';
      
      const searchBox = document.createElement('div');
      searchBox.className = 'cascade-search';
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = `搜索${level.label}`;
      searchInput.value = this.searchKeywords[level.key] || '';
      
      searchInput.addEventListener('input', debounce(async (e: Event) => {
        const keyword = (e.target as HTMLInputElement).value;
        this.searchKeywords[level.key] = keyword;
        
        const parentVal = index > 0 ? this.values[this.options.levels[index - 1].key] : undefined;
        const levelData = await level.loadOptions(parentVal);
        const filtered = keyword 
          ? levelData.filter(item => item.name.includes(keyword) || item.code?.includes(keyword))
          : levelData;
        this.levelData[level.key] = filtered;
        this.renderColumnOptions(column, level, index, filtered);
      }, 300));
      
      searchBox.appendChild(searchInput);
      column.appendChild(searchBox);

      const optionsList = document.createElement('div');
      optionsList.className = 'cascade-options';
      column.appendChild(optionsList);

      const data = this.levelData[level.key] || [];
      this.renderColumnOptions(column, level, index, data);
      
      columnsContainer.appendChild(column);
    });
  }

  private renderColumnOptions(column: HTMLElement, level: CascadeLevel, levelIndex: number, data: any[]) {
    const optionsList = column.querySelector('.cascade-options')!;
    optionsList.innerHTML = '';

    if (data.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.style.padding = '20px';
      empty.textContent = '暂无数据';
      optionsList.appendChild(empty);
      return;
    }

    data.forEach((item) => {
      const option = document.createElement('div');
      option.className = 'cascade-option';
      if (this.values[level.key] === item.id) {
        option.classList.add('active');
      }
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.name;
      option.appendChild(nameSpan);

      if (level.hasChildren) {
        const arrow = document.createElement('span');
        arrow.className = 'has-children';
        arrow.textContent = '>';
        option.appendChild(arrow);
      }

      option.addEventListener('click', async () => {
        this.values[level.key] = item.id;
        this.labels[level.key] = item.name;
        
        for (let i = levelIndex + 1; i < this.options.levels.length; i++) {
          const nextLevel = this.options.levels[i];
          this.values[nextLevel.key] = undefined;
          this.labels[nextLevel.key] = '';
          this.levelData[nextLevel.key] = [];
          this.searchKeywords[nextLevel.key] = '';
        }

        if (level.hasChildren && levelIndex + 1 < this.options.levels.length) {
          await this.loadLevel(levelIndex + 1, item.id);
        }

        this.updateTriggerText();
        this.renderColumns();
        
        if (this.options.onChange) {
          this.options.onChange({ ...this.values }, { ...this.labels });
        }
      });

      optionsList.appendChild(option);
    });
  }

  private updateTriggerText() {
    const trigger = this.container.querySelector('.cascade-trigger')!;
    const selectedTexts = this.options.levels
      .map(level => this.labels[level.key])
      .filter(Boolean);
    
    trigger.textContent = selectedTexts.length > 0 
      ? selectedTexts.join(' / ') 
      : this.options.placeholder || '请选择';
  }

  public getValue(): Record<string, number | undefined> {
    return { ...this.values };
  }

  public getLabels(): Record<string, string> {
    return { ...this.labels };
  }

  public clear() {
    this.values = {};
    this.labels = {};
    this.levelData = {};
    this.searchKeywords = {};
    this.updateTriggerText();
    this.close();
  }
}

export function createHazardCascade(container: HTMLElement, onChange?: (values: any, labels: any) => void) {
  return new CascadeDropdown(container, {
    placeholder: '选择筛选条件',
    levels: [
      {
        key: 'projectId',
        label: '项目',
        loadOptions: () => commonApi.getAllProjects(),
        hasChildren: true,
      },
      {
        key: 'floorId',
        label: '楼层',
        loadOptions: (parentId?: number) => parentId ? commonApi.getAllFloors(parentId) : Promise.resolve([]),
        hasChildren: true,
      },
      {
        key: 'areaId',
        label: '区域',
        loadOptions: (parentId?: number) => parentId ? commonApi.getAllAreas(parentId) : Promise.resolve([]),
        hasChildren: false,
      },
    ],
    onChange,
  });
}

export function createHazardTypeCascade(container: HTMLElement, onChange?: (values: any, labels: any) => void) {
  return new CascadeDropdown(container, {
    placeholder: '选择隐患类型',
    levels: [
      {
        key: 'hazardTypeParentId',
        label: '隐患大类',
        loadOptions: () => commonApi.getAllHazardTypes(null),
        hasChildren: true,
      },
      {
        key: 'hazardTypeId',
        label: '隐患子类',
        loadOptions: (parentId?: number) => parentId ? commonApi.getAllHazardTypes(parentId) : Promise.resolve([]),
        hasChildren: false,
      },
    ],
    onChange,
  });
}
