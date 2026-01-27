import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Allowed MIME types for image uploads
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

const storage = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

export const uploadSingle = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const uploadHandler = upload.single(fieldName);
    
    uploadHandler(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          logger.warn(`File size limit exceeded: ${err.message}`);
          res.status(400).json({
            success: false,
            error: 'File size exceeds the maximum allowed size of 5MB',
          });
          return;
        }
        
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          logger.warn(`Unexpected file field: ${err.message}`);
          res.status(400).json({
            success: false,
            error: `Unexpected file field. Expected field name: ${fieldName}`,
          });
          return;
        }
        
        logger.error(`Multer error: ${err.message}`);
        res.status(400).json({
          success: false,
          error: `File upload error: ${err.message}`,
        });
        return;
      }
      
      if (err) {
        logger.error(`Upload error: ${err.message}`);
        res.status(400).json({
          success: false,
          error: err.message,
        });
        return;
      }
      
      if (!req.file) {
        logger.warn('No file uploaded');
        res.status(400).json({
          success: false,
          error: 'No file uploaded. Please provide a file.',
        });
        return;
      }
      
      logger.debug(`File uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
      
      next();
    });
  };
};

// Middleware for multiple file uploads (optional, for future use)
export const uploadMultiple = (fieldName: string, maxCount: number = 10) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const uploadHandler = upload.array(fieldName, maxCount);
    
    uploadHandler(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          logger.warn(`File size limit exceeded: ${err.message}`);
          res.status(400).json({
            success: false,
            error: 'One or more files exceed the maximum allowed size of 5MB',
          });
          return;
        }
        
        if (err.code === 'LIMIT_FILE_COUNT') {
          logger.warn(`File count limit exceeded: ${err.message}`);
          res.status(400).json({
            success: false,
            error: `Maximum ${maxCount} files allowed`,
          });
          return;
        }
        
        logger.error(`Multer error: ${err.message}`);
        res.status(400).json({
          success: false,
          error: `File upload error: ${err.message}`,
        });
        return;
      }
      
      if (err) {
        logger.error(`Upload error: ${err.message}`);
        res.status(400).json({
          success: false,
          error: err.message,
        });
        return;
      }
      
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        logger.warn('No files uploaded');
        res.status(400).json({
          success: false,
          error: 'No files uploaded. Please provide at least one file.',
        });
        return;
      }
      
      logger.debug(`${Array.isArray(req.files) ? req.files.length : 0} files uploaded`);
      next();
    });
  };
};

export default upload;