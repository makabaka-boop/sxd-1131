export function showToast(message: string, type: 'success' | 'error' = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return dateStr.replace('T', ' ').substring(0, 19);
}

export function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待整改',
    rectifying: '整改中',
    closed: '已关闭',
  };
  return map[status] || status;
}

export function getStatusClass(status: string): string {
  return `status-tag status-${status}`;
}

export function getWarningStatusText(status?: string): string {
  const map: Record<string, string> = {
    normal: '正常',
    expiring_soon: '即将到期',
    overdue: '已超期',
    closed: '已结束',
  };
  return map[status || ''] || '-';
}

export function getWarningStatusClass(status?: string): string {
  return `warning-tag warning-${status || 'normal'}`;
}

export function getWarningDisplayText(item: any): string {
  if (!item.deadline_date) return '未设置截止时间';
  if (item.status === 'closed') return '已关闭';
  
  if (item.is_overdue) {
    return `已超期 ${item.overdue_days} 天`;
  } else if (item.remaining_days !== null && item.remaining_days !== undefined) {
    return `剩余 ${item.remaining_days} 天`;
  }
  return '-';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  } as T;
}
