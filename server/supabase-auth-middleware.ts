import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const supabaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const supabaseClinicAccess = (requiredRole?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(req as any).user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Check clinic access logic here
      // This is a simplified version - implement your clinic access logic
      
      next();
    } catch (error) {
      console.error('Clinic access middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}; 