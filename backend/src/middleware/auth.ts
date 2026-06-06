import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

const JWT_SECRET = 'construction-hazard-secret-key-2024';

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: '认证令牌无效或已过期' });
  }
}

export function roleMiddleware(roles: Array<'admin' | 'executor' | 'supervisor'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as JwtPayload;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}
