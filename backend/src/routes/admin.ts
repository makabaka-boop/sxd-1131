import { Router } from 'express';
import db from '../db';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware, roleMiddleware(['admin']));

router.get('/projects', (req, res) => {
  const { page = 1, pageSize = 20, keyword = '' } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);
  const where = keyword ? `WHERE name LIKE '%${keyword}%' OR code LIKE '%${keyword}%'` : '';
  
  const total = db.prepare(`SELECT COUNT(*) as count FROM projects ${where}`).get() as { count: number };
  const list = db.prepare(`SELECT * FROM projects ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(Number(pageSize), offset);
  
  res.json({ list, total: total.count, page: Number(page), pageSize: Number(pageSize) });
});

router.post('/projects', (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: '项目名称和编码不能为空' });
  }
  try {
    const result = db.prepare('INSERT INTO projects (name, code) VALUES (?, ?)').run(name, code);
    res.json({ id: result.lastInsertRowid, name, code });
  } catch (err: any) {
    res.status(400).json({ error: '项目编码已存在' });
  }
});

router.put('/projects/:id', (req, res) => {
  const { name, code } = req.body;
  const { id } = req.params;
  try {
    db.prepare('UPDATE projects SET name = ?, code = ? WHERE id = ?').run(name, code, id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: '更新失败' });
  }
});

router.delete('/projects/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/floors', (req, res) => {
  const { projectId, page = 1, pageSize = 20, keyword = '' } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);
  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (projectId) {
    where += ' AND project_id = ?';
    params.push(projectId);
  }
  if (keyword) {
    where += ' AND (name LIKE ? OR code LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  const total = db.prepare(`SELECT COUNT(*) as count FROM floors ${where}`).get(...params) as { count: number };
  const list = db.prepare(`
    SELECT f.*, p.name as project_name 
    FROM floors f 
    LEFT JOIN projects p ON f.project_id = p.id 
    ${where} 
    ORDER BY f.id DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);
  
  res.json({ list, total: total.count, page: Number(page), pageSize: Number(pageSize) });
});

router.post('/floors', (req, res) => {
  const { project_id, name, code } = req.body;
  try {
    const result = db.prepare('INSERT INTO floors (project_id, name, code) VALUES (?, ?, ?)')
      .run(project_id, name, code);
    res.json({ id: result.lastInsertRowid, project_id, name, code });
  } catch (err: any) {
    res.status(400).json({ error: '楼层编码已存在' });
  }
});

router.put('/floors/:id', (req, res) => {
  const { project_id, name, code } = req.body;
  db.prepare('UPDATE floors SET project_id = ?, name = ?, code = ? WHERE id = ?')
    .run(project_id, name, code, req.params.id);
  res.json({ success: true });
});

router.delete('/floors/:id', (req, res) => {
  db.prepare('DELETE FROM floors WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/areas', (req, res) => {
  const { floorId, page = 1, pageSize = 20, keyword = '' } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);
  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (floorId) {
    where += ' AND floor_id = ?';
    params.push(floorId);
  }
  if (keyword) {
    where += ' AND (name LIKE ? OR code LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  const total = db.prepare(`SELECT COUNT(*) as count FROM areas ${where}`).get(...params) as { count: number };
  const list = db.prepare(`
    SELECT a.*, f.name as floor_name, p.name as project_name 
    FROM areas a 
    LEFT JOIN floors f ON a.floor_id = f.id 
    LEFT JOIN projects p ON f.project_id = p.id 
    ${where} 
    ORDER BY a.id DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);
  
  res.json({ list, total: total.count, page: Number(page), pageSize: Number(pageSize) });
});

router.post('/areas', (req, res) => {
  const { floor_id, name, code } = req.body;
  try {
    const result = db.prepare('INSERT INTO areas (floor_id, name, code) VALUES (?, ?, ?)')
      .run(floor_id, name, code);
    res.json({ id: result.lastInsertRowid, floor_id, name, code });
  } catch (err: any) {
    res.status(400).json({ error: '区域编码已存在' });
  }
});

router.put('/areas/:id', (req, res) => {
  const { floor_id, name, code } = req.body;
  db.prepare('UPDATE areas SET floor_id = ?, name = ?, code = ? WHERE id = ?')
    .run(floor_id, name, code, req.params.id);
  res.json({ success: true });
});

router.delete('/areas/:id', (req, res) => {
  db.prepare('DELETE FROM areas WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/hazard-types', (req, res) => {
  const { parentId, page = 1, pageSize = 50, keyword = '' } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);
  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (parentId !== undefined && parentId !== '') {
    where += ' AND parent_id = ?';
    params.push(parentId === 'null' ? null : parentId);
  }
  if (keyword) {
    where += ' AND (name LIKE ? OR code LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  const total = db.prepare(`SELECT COUNT(*) as count FROM hazard_types ${where}`).get(...params) as { count: number };
  const list = db.prepare(`SELECT * FROM hazard_types ${where} ORDER BY id LIMIT ? OFFSET ?`)
    .all(...params, Number(pageSize), offset);
  
  res.json({ list, total: total.count, page: Number(page), pageSize: Number(pageSize) });
});

router.post('/hazard-types', (req, res) => {
  const { parent_id, name, code } = req.body;
  const result = db.prepare('INSERT INTO hazard_types (parent_id, name, code) VALUES (?, ?, ?)')
    .run(parent_id || null, name, code);
  res.json({ id: result.lastInsertRowid, parent_id: parent_id || null, name, code });
});

router.put('/hazard-types/:id', (req, res) => {
  const { parent_id, name, code } = req.body;
  db.prepare('UPDATE hazard_types SET parent_id = ?, name = ?, code = ? WHERE id = ?')
    .run(parent_id || null, name, code, req.params.id);
  res.json({ success: true });
});

router.delete('/hazard-types/:id', (req, res) => {
  db.prepare('DELETE FROM hazard_types WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/groups', (req, res) => {
  const { page = 1, pageSize = 20, keyword = '' } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);
  const where = keyword ? `WHERE name LIKE '%${keyword}%' OR leader LIKE '%${keyword}%'` : '';
  
  const total = db.prepare(`SELECT COUNT(*) as count FROM responsibility_groups ${where}`).get() as { count: number };
  const list = db.prepare(`SELECT * FROM responsibility_groups ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(Number(pageSize), offset);
  
  res.json({ list, total: total.count, page: Number(page), pageSize: Number(pageSize) });
});

router.post('/groups', (req, res) => {
  const { name, leader, phone } = req.body;
  const result = db.prepare('INSERT INTO responsibility_groups (name, leader, phone) VALUES (?, ?, ?)')
    .run(name, leader, phone);
  res.json({ id: result.lastInsertRowid, name, leader, phone });
});

router.put('/groups/:id', (req, res) => {
  const { name, leader, phone } = req.body;
  db.prepare('UPDATE responsibility_groups SET name = ?, leader = ?, phone = ? WHERE id = ?')
    .run(name, leader, phone, req.params.id);
  res.json({ success: true });
});

router.delete('/groups/:id', (req, res) => {
  db.prepare('DELETE FROM responsibility_groups WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
