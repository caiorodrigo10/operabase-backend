
import { Response } from 'express';

export class ResponseHelper {
  static success(res: Response, data: any, message?: string, statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      ...(message && { message }),
      data
    });
  }

  static created(res: Response, data: any, message?: string) {
    return ResponseHelper.success(res, data, message, 201);
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }

  static error(res: Response, message: string, statusCode: number = 500, code?: string) {
    return res.status(statusCode).json({
      success: false,
      error: message,
      ...(code && { code })
    });
  }

  static paginated(
    res: Response, 
    data: any[], 
    total: number, 
    page: number, 
    limit: number,
    message?: string
  ) {
    const totalPages = Math.ceil(total / limit);
    
    return res.json({
      success: true,
      ...(message && { message }),
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  }
}
