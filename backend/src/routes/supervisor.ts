import { Router } from 'express';
import db from '../db';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware, roleMiddleware(['supervisor', 'admin']));

router.get('/hazards', (req, res) => {
  const { page = 1, pageSize = 20, status, projectId, floorId, areaId, hazardTypeId, groupId, keyword = '' } = req.query;
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
    where += ' AND h.description LIKE ?';
    params.push(`%${keyword}%`);
  }
  
  const total = db.prepare(`SELECT COUNT(*) as count FROM hazard_records h ${where}`).get(...params) as { count: number };
  const list = db.prepare(`
    SELECT h.*, 
           p.name as project_name, 
           f.name as floor_name, 
           a.name as area_name, 
           ht.name as hazard_type_name,
           rg.name as group_name,
           u.name as executor_name,
           s.name as supervisor_name
    FROM hazard_records h
    LEFT JOIN projects p ON h.project_id = p.id
    LEFT JOIN floors f ON h.floor_id = f.id
    LEFT JOIN areas a ON h.area_id = a.id
    LEFT JOIN hazard_types ht ON h.hazard_type_id = ht.id
    LEFT JOIN responsibility_groups rg ON h.group_id = rg.id
    LEFT JOIN users u ON h.executor_id = u.id
    LEFT JOIN users s ON h.supervisor_id = s.id
    ${where}
    ORDER BY h.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);
  
  res.json({ list, total: total.count, page: Number(page), pageSize: Number(pageSize) });
});

router.put('/hazards/:id/review', (req, res) => {
  const user = (req as any).user;
  const { review_comment, pass } = req.body;
  
  const hazard = db.prepare('SELECT * FROM hazard_records WHERE id = ?').get(req.params.id);
  if (!hazard) {
    return res.status(404).json({ error: '隐患记录不存在' });
  }
  
  if (pass) {
    db.prepare(`
      UPDATE hazard_records 
      SET review_comment = ?, supervisor_id = ?, status = 'closed', closed_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(review_comment || '', user.userId, req.params.id);
  } else {
    db.prepare(`
      UPDATE hazard_records 
      SET review_comment = ?, supervisor_id = ?, status = 'pending'
      WHERE id = ?
    `).run(review_comment || '', user.userId, req.params.id);
  }
  
  res.json({ success: true });
});

export default router;
