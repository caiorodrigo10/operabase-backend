import { Request, Response, NextFunction } from 'express';

interface N8NRequest extends Request {
  n8nAuthenticated?: boolean;
}

/**
 * Middleware de autenticação para endpoints N8N
 * Valida API KEY para acesso seguro aos endpoints de integração
 */
export const validateN8NApiKey = (req: N8NRequest, res: Response, next: NextFunction) => {
  const n8nApiKey = process.env.N8N_API_KEY;
  
  if (!n8nApiKey) {
    console.error('🔐 N8N_API_KEY não configurada no ambiente');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error',
      message: 'N8N API key not configured'
    });
  }

  // Buscar API key nos headers (múltiplos formatos suportados)
  const providedKey = 
    req.headers['x-api-key'] ||
    req.headers['x-n8n-api-key'] ||
    req.headers['authorization']?.replace('Bearer ', '') ||
    req.headers['authorization']?.replace('ApiKey ', '');

  console.log('🔐 N8N Auth Check:', {
    endpoint: req.path,
    method: req.method,
    keyProvided: !!providedKey,
    keyLength: providedKey ? String(providedKey).length : 0,
    headers: {
      'x-api-key': req.headers['x-api-key'] ? 'Present' : 'Missing',
      'x-n8n-api-key': req.headers['x-n8n-api-key'] ? 'Present' : 'Missing',
      'authorization': req.headers['authorization'] ? 'Present' : 'Missing'
    }
  });

  if (!providedKey) {
    console.warn('🚫 N8N API key missing in request');
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'N8N API key required. Use X-API-Key, X-N8N-API-Key, or Authorization header',
      headers_expected: [
        'X-API-Key: your_n8n_api_key',
        'X-N8N-API-Key: your_n8n_api_key',
        'Authorization: Bearer your_n8n_api_key',
        'Authorization: ApiKey your_n8n_api_key'
      ]
    });
  }

  // Validar API key
  if (String(providedKey).trim() !== String(n8nApiKey).trim()) {
    console.warn('🚫 N8N API key invalid:', {
      providedLength: String(providedKey).length,
      expectedLength: String(n8nApiKey).length,
      providedPrefix: String(providedKey).substring(0, 8) + '...',
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Invalid N8N API key provided'
    });
  }

  console.log('✅ N8N API key validated successfully');
  req.n8nAuthenticated = true;
  next();
};

/**
 * Rate limiting para endpoints N8N (proteção contra spam)
 */
const n8nRateLimit: { [key: string]: { count: number; resetTime: number } } = {};

export const n8nRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minuto
  const maxRequests = 30; // 30 requests por minuto por IP
  
  if (!n8nRateLimit[clientId]) {
    n8nRateLimit[clientId] = { count: 0, resetTime: now + windowMs };
  }
  
  const clientData = n8nRateLimit[clientId];
  
  // Reset counter se window expirou
  if (now > clientData.resetTime) {
    clientData.count = 0;
    clientData.resetTime = now + windowMs;
  }
  
  clientData.count++;
  
  if (clientData.count > maxRequests) {
    console.warn('🚫 N8N Rate limit exceeded:', {
      ip: clientId,
      count: clientData.count,
      limit: maxRequests
    });
    
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: `Too many requests. Limit: ${maxRequests} requests per minute`,
      retry_after: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }
  
  console.log('✅ N8N Rate limit check passed:', {
    ip: clientId,
    count: clientData.count,
    limit: maxRequests,
    remaining: maxRequests - clientData.count
  });
  
  next();
};