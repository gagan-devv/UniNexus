import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to only accept images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
  }
};

// Create multer upload instance
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});

// Middleware for single file upload
export const uploadSingle = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadHandler = upload.single(fieldName);
    
    uploadHandler(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds maximum limit of 5MB'
          });
        }
        
        logger.error('Multer error:', err.message);
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        // Other errors
        logger.error('Upload error:', err.message);
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed'
        });
      }
      
      // No error, proceed
      next();
    });
  };
};

// Middleware to check if file was uploaded
export const requireFile = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }
  next();
};
