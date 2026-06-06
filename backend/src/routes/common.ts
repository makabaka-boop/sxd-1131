import { Router } from 'express';
import db from '../db';
import { authMiddleware } from '../middleware/auth';
import ExcelJS from 'exceljs';

const router = Router();

router.use(authMiddleware);

router.get('/projects/all', (req, res) => {
  const { keyword = '' } = req.query;
  let sql = 'SELECT * FROM projects';
  const params: any[] = [];
  if (keyword) {
    sql += ' WHERE name LIKE ? OR code LIKE ?';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  sql += ' ORDER BY id';
  const list = db.prepare(sql).all(...params);
  res.json(list);
});

router.get('/floors/all', (req, res) => {
  const { projectId, keyword = '' } = req.query;
  let sql = 'SELECT * FROM floors WHERE project_id = ?';
  const params: any[] = [projectId];
  if (keyword) {
    sql += ' AND (name LIKE ? OR code LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  sql += ' ORDER BY id';
  const list = db.prepare(sql).all(...params);
  res.json(list);
});

router.get('/areas/all', (req, res) => {
  const { floorId, keyword = '' } = req.query;
  let sql = 'SELECT * FROM areas WHERE floor_id = ?';
  const params: any[] = [floorId];
  if (keyword) {
    sql += ' AND (name LIKE ? OR code LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  sql += ' ORDER BY id';
  const list = db.prepare(sql).all(...params);
  res.json(list);
});

router.get('/hazard-types/all', (req, res) => {
  const { parentId, keyword = '' } = req.query;
  let sql = 'SELECT * FROM hazard_types WHERE parent_id';
  const params: any[] = [];
  if (parentId === 'null' || parentId === undefined || parentId === '') {
    sql += ' IS NULL';
  } else {
    sql += ' = ?';
    params.push(parentId);
  }
  if (keyword) {
    sql += ' AND (name LIKE ? OR code LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  sql += ' ORDER BY id';
  const list = db.prepare(sql).all(...params);
  res.json(list);
});

router.get('/groups/all', (req, res) => {
  const { keyword = '' } = req.query;
  let sql = 'SELECT * FROM responsibility_groups';
  const params: any[] = [];
  if (keyword) {
    sql += ' WHERE name LIKE ? OR leader LIKE ?';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  sql += ' ORDER BY id';
  const list = db.prepare(sql).all(...params);
  res.json(list);
});

router.get('/hazards/virtual', (req, res) => {
  const { 
    page = 1, 
    pageSize = 50, 
    status, 
    projectId, 
    floorId, 
    areaId, 
    hazardTypeId, 
    groupId, 
    keyword = '' 
  } = req.query;
  
  const offset = (Number(page) - 1) * Number(pageSize);
  
  let where = 'WHERE 1=1';
  const params: any[] = [];
  
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
  
  const total = db.prepare(`SELECT COUNT(*) as count FROM hazard_records h LEFT JOIN hazard_types ht ON h.hazard_type_id = ht.id ${where}`).get(...params) as { count: number };
  const list = db.prepare(`
    SELECT h.*, 
           p.name as project_name, 
           f.name as floor_name, 
           a.name as area_name, 
           ht.name as hazard_type_name,
           ht.parent_id as hazard_type_parent_id,
           ht_p.name as hazard_type_parent_name,
           rg.name as group_name,
           u.name as executor_name
    FROM hazard_records h
    LEFT JOIN projects p ON h.project_id = p.id
    LEFT JOIN floors f ON h.floor_id = f.id
    LEFT JOIN areas a ON h.area_id = a.id
    LEFT JOIN hazard_types ht ON h.hazard_type_id = ht.id
    LEFT JOIN hazard_types ht_p ON ht.parent_id = ht_p.id
    LEFT JOIN responsibility_groups rg ON h.group_id = rg.id
    LEFT JOIN users u ON h.executor_id = u.id
    ${where}
    ORDER BY h.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);
  
  res.json({ list, total: total.count, page: Number(page), pageSize: Number(pageSize) });
});

router.get('/hazards/export', async (req, res) => {
  const { 
    status, 
    projectId, 
    floorId, 
    areaId, 
    hazardTypeId, 
    groupId, 
    keyword = '' 
  } = req.query;
  
  let where = 'WHERE 1=1';
  const params: any[] = [];
  
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
  
  const list = db.prepare(`
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
  
  list.forEach((item: any) => {
    worksheet.addRow({
      ...item,
      status: statusMap[item.status] || item.status,
    });
  });
  
  worksheet.getRow(1).font = { bold: true };
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=hazard_records.xlsx');
  
  await workbook.xlsx.write(res);
  res.end();
});

export default router;
