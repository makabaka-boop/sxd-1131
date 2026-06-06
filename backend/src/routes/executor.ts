import { Router } from 'express';
import db from '../db';
import { authMiddleware, roleMiddleware } from '../middleware/auth';
import ExcelJS from 'exceljs';

const router = Router();

function calculateWarningInfo(deadlineDate: string | null, status: string): {
  remaining_days: number | null;
  is_overdue: boolean;
  overdue_days: number;
  warning_status: 'normal' | 'expiring_soon' | 'overdue' | 'closed';
} {
  if (!deadlineDate) {
    return { remaining_days: null, is_overdue: false, overdue_days: 0, warning_status: 'normal' };
  }
  
  if (status === 'closed') {
    return { remaining_days: null, is_overdue: false, overdue_days: 0, warning_status: 'closed' };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineDate);
  deadline.setHours(0, 0, 0, 0);
  
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { remaining_days: diffDays, is_overdue: true, overdue_days: Math.abs(diffDays), warning_status: 'overdue' };
  } else if (diffDays <= 3) {
    return { remaining_days: diffDays, is_overdue: false, overdue_days: 0, warning_status: 'expiring_soon' };
  } else {
    return { remaining_days: diffDays, is_overdue: false, overdue_days: 0, warning_status: 'normal' };
  }
}

router.use(authMiddleware, roleMiddleware(['executor', 'admin']));

router.get('/hazards', (req, res) => {
  const user = (req as any).user;
  const { page = 1, pageSize = 20, status, projectId, floorId, areaId, hazardTypeId, groupId, keyword = '', warningStatus } = req.query;
  
  let where = 'WHERE h.executor_id = ?';
  const params: any[] = [user.userId];
  
  if (status) {
    where += ' AND h.status = ?';
    params.push(status);
  }
  if (projectId) {
    where += ' AND h.project_id = ?';
    params.push(projectId);
  }
  if (floorId) {
    where += ' AND h.floor_id = ?';
    params.push(floorId);
  }
  if (areaId) {
    where += ' AND h.area_id = ?';
    params.push(areaId);
  }
  if (hazardTypeId) {
    where += ' AND h.hazard_type_id = ?';
    params.push(hazardTypeId);
  }
  if (groupId) {
    where += ' AND h.group_id = ?';
    params.push(groupId);
  }
  if (keyword) {
    where += ' AND h.description LIKE ?';
    params.push(`%${keyword}%`);
  }
  
  let allList: any[] = db.prepare(`
    SELECT h.*, 
           p.name as project_name, 
           f.name as floor_name, 
           a.name as area_name, 
           ht.name as hazard_type_name,
           rg.name as group_name,
           u.name as executor_name
    FROM hazard_records h
    LEFT JOIN projects p ON h.project_id = p.id
    LEFT JOIN floors f ON h.floor_id = f.id
    LEFT JOIN areas a ON h.area_id = a.id
    LEFT JOIN hazard_types ht ON h.hazard_type_id = ht.id
    LEFT JOIN responsibility_groups rg ON h.group_id = rg.id
    LEFT JOIN users u ON h.executor_id = u.id
    ${where}
    ORDER BY h.id DESC
  `).all(...params);
  
  allList = allList.map(item => {
    const warningInfo = calculateWarningInfo(item.deadline_date, item.status);
    return { ...item, ...warningInfo };
  });
  
  if (warningStatus) {
    allList = allList.filter(item => item.warning_status === warningStatus);
  }
  
  const total = allList.length;
  const offset = (Number(page) - 1) * Number(pageSize);
  const list = allList.slice(offset, offset + Number(pageSize));
  
  res.json({ list, total, page: Number(page), pageSize: Number(pageSize) });
});

router.post('/hazards', (req, res) => {
  const user = (req as any).user;
  const { project_id, floor_id, area_id, hazard_type_id, group_id, description, photos, deadline_date } = req.body;
  
  if (!project_id || !floor_id || !area_id || !hazard_type_id || !group_id || !description) {
    return res.status(400).json({ error: '必填项不能为空' });
  }
  
  const result = db.prepare(`
    INSERT INTO hazard_records 
    (project_id, floor_id, area_id, hazard_type_id, group_id, description, photos, executor_id, status, deadline_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(project_id, floor_id, area_id, hazard_type_id, group_id, description, photos || '', user.userId, deadline_date || null);
  
  res.json({ id: result.lastInsertRowid });
});

router.put('/hazards/:id/rectify', (req, res) => {
  const user = (req as any).user;
  const { rectification_desc, rectification_photos } = req.body;
  
  if (!rectification_desc) {
    return res.status(400).json({ error: '整改说明不能为空' });
  }
  
  const hazard = db.prepare('SELECT * FROM hazard_records WHERE id = ? AND executor_id = ?')
    .get(req.params.id, user.userId);
  
  if (!hazard) {
    return res.status(404).json({ error: '隐患记录不存在或无权限' });
  }
  
  db.prepare(`
    UPDATE hazard_records 
    SET rectification_desc = ?, rectification_photos = ?, status = 'rectifying', rectified_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(rectification_desc, rectification_photos || '', req.params.id);
  
  res.json({ success: true });
});

router.get('/hazards/export', async (req, res) => {
  const user = (req as any).user;
  const { 
    status, 
    projectId, 
    floorId, 
    areaId, 
    hazardTypeId, 
    groupId, 
    keyword = '',
    warningStatus
  } = req.query;
  
  let where = 'WHERE h.executor_id = ?';
  const params: any[] = [user.userId];
  
  if (status) {
    where += ' AND h.status = ?';
    params.push(status);
  }
  if (projectId) {
    where += ' AND h.project_id = ?';
    params.push(projectId);
  }
  if (floorId) {
    where += ' AND h.floor_id = ?';
    params.push(floorId);
  }
  if (areaId) {
    where += ' AND h.area_id = ?';
    params.push(areaId);
  }
  if (hazardTypeId) {
    where += ' AND h.hazard_type_id = ?';
    params.push(hazardTypeId);
  }
  if (groupId) {
    where += ' AND h.group_id = ?';
    params.push(groupId);
  }
  if (keyword) {
    where += ' AND (h.description LIKE ? OR ht.name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  let list: any[] = db.prepare(`
    SELECT h.*, 
           p.name as project_name, 
           f.name as floor_name, 
           a.name as area_name, 
           ht.name as hazard_type_name,
           rg.name as group_name,
           u.name as executor_name
    FROM hazard_records h
    LEFT JOIN projects p ON h.project_id = p.id
    LEFT JOIN floors f ON h.floor_id = f.id
    LEFT JOIN areas a ON h.area_id = a.id
    LEFT JOIN hazard_types ht ON h.hazard_type_id = ht.id
    LEFT JOIN responsibility_groups rg ON h.group_id = rg.id
    LEFT JOIN users u ON h.executor_id = u.id
    ${where}
    ORDER BY h.id DESC
  `).all(...params) as any[];
  
  list = list.map(item => {
    const warningInfo = calculateWarningInfo(item.deadline_date, item.status);
    return { ...item, ...warningInfo };
  });
  
  if (warningStatus) {
    list = list.filter(item => item.warning_status === warningStatus);
  }
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('隐患记录');
  
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: '项目', key: 'project_name', width: 20 },
    { header: '楼层', key: 'floor_name', width: 12 },
    { header: '区域', key: 'area_name', width: 12 },
    { header: '隐患类型', key: 'hazard_type_name', width: 18 },
    { header: '责任小组', key: 'group_name', width: 15 },
    { header: '隐患描述', key: 'description', width: 40 },
    { header: '状态', key: 'status', width: 12 },
    { header: '整改截止时间', key: 'deadline_date', width: 15 },
    { header: '预警状态', key: 'warning_status_text', width: 12 },
    { header: '剩余天数', key: 'remaining_days', width: 10 },
    { header: '超期天数', key: 'overdue_days', width: 10 },
    { header: '执行人', key: 'executor_name', width: 12 },
    { header: '整改说明', key: 'rectification_desc', width: 40 },
    { header: '创建时间', key: 'created_at', width: 20 },
    { header: '整改时间', key: 'rectified_at', width: 20 },
    { header: '关闭时间', key: 'closed_at', width: 20 },
  ];
  
  const statusMap: Record<string, string> = {
    pending: '待整改',
    rectifying: '整改中',
    closed: '已关闭',
  };
  
  const warningStatusMap: Record<string, string> = {
    normal: '正常',
    expiring_soon: '即将到期',
    overdue: '已超期',
    closed: '已结束',
  };
  
  list.forEach((item: any) => {
    worksheet.addRow({
      ...item,
      status: statusMap[item.status] || item.status,
      warning_status_text: warningStatusMap[item.warning_status] || '-',
      remaining_days: item.remaining_days ?? '-',
      overdue_days: item.overdue_days || '-',
    });
  });
  
  worksheet.getRow(1).font = { bold: true };
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=hazard_records.xlsx');
  
  await workbook.xlsx.write(res);
  res.end();
});

export default router;
