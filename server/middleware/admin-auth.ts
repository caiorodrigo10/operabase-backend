import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if user has admin privileges
 */
export const requireAdminRole = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if user has admin or super_admin role
  const hasAdminAccess = user.role === 'super_admin' || user.role === 'admin';
  
  if (!hasAdminAccess) {
    return res.status(403).json({ 
      error: 'Access denied. Admin privileges required.',
      userRole: user.role 
    });
  }
  
  next();
};