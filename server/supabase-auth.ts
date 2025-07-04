import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from './supabase-client';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    clinic_id?: number;
  };
}

export const supabaseAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Get user profile from our database
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'Perfil de usuário não encontrado' });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email || '',
      name: profile.name || user.user_metadata?.name || '',
      role: profile.role || 'user',
      clinic_id: profile.clinic_id
    };

    next();
  } catch (error) {
    console.error('Supabase auth error:', error);
    res.status(401).json({ error: 'Erro de autenticação' });
  }
};

// Alternative middleware that works with session-based auth (for backward compatibility)
export const flexibleAuth = async (req: any, res: Response, next: NextFunction) => {
  // Check if we have a session-based user (passport)
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    // Convert session user to expected format for calendar integration
    if (req.user.id && req.user.email) {
      req.user = {
        id: req.user.id.toString(),
        email: req.user.email,
        name: req.user.name || req.user.email,
        role: req.user.role || 'user',
        clinic_id: req.user.clinic_id
      };
    }
    return next();
  }
  
  // Check for Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return supabaseAuth(req, res, next);
  }
  
  // No valid authentication found
  res.status(401).json({ error: 'Acesso negado' });
};