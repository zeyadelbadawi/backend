// src/multer.d.ts
import * as multer from 'multer';

declare global {
  namespace Express {
    export interface Request {
      file: multer.File;
      files: multer.File[];
    }
  }
}
