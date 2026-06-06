import { Router } from 'express';
import db from '../db';
import { generateToken } from '../middleware/auth';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!user || user.password !== password) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    },
  });
});

export default router;
