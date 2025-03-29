import { Controller, Get, Post, Query, Param, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileService } from './file.service';
import { FileMetadata } from './file.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';

@Controller('file')
export class FileController {
  constructor(
    private readonly fileService: FileService,
    @InjectRepository(FileMetadata)
    private fileMetadataRepository: Repository<FileMetadata>,
  ) {}

  // POST /upload - Upload single or multiple files
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = './uploads';
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);  // Directory for file storage
      },
      filename: (req, file, cb) => {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);  // Generate unique filename
      }
    }),
    limits: {
      fileSize: 50 * 1024 * 1024,  // Limit file size to 50 MB
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpg|jpeg|png|pdf|csv|xlsx/;
      const extname = allowedTypes.test(file.mimetype);
      const mimetype = allowedTypes.test(file.mimetype);
  
      if (extname && mimetype) {
        return cb(null, true);  // Accept file
      } else {
        return cb(new Error('Invalid file type. Only PDF, image, CSV, or Excel files are allowed.'), false);  // Reject file
      }
    }
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body('userId') userId: number) {
    console.log(file); // Add this to check if the file is passed correctly
    return this.fileService.processFile(file, userId);  // Make sure userId is passed here
  }
  
  
  // GET /files - Fetch paginated, filterable file data
  @Get('files')
  async getFiles(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status: string,
    @Query('type') type: string,
    @Query('sortBy') sortBy: string = 'uploadDate',  // Default sorting field
    @Query('sortOrder') sortOrder: string = 'ASC',   // Default sorting order
    @Query('userId') userId: number  // User ID to filter by user
  ) {
    const take = limit;
    const skip = (page - 1) * limit;

    const query = this.fileMetadataRepository.createQueryBuilder('fileMetadata')
      .where('fileMetadata.userId = :userId', { userId })  // Filter by user ID
      .orderBy(sortBy, sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC');  // Sorting logic

    if (status) query.andWhere('fileMetadata.status = :status', { status });
    if (type) query.andWhere('fileMetadata.mimeType LIKE :type', { type: `%${type}%` });

    const [files, total] = await query
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: files,
    };
  }

  @Get('files/:id')
  async getFile(@Param('id') id: number) {
    const file = await this.fileMetadataRepository.findOne({
      where: { id }, // Use 'where' for filtering by ID
    });

    if (!file) {
      throw new Error('File not found');
    }

    return file;
  }

  // GET /file-summary - Fetch summary insights
 // FileController.ts
 @Get('file/base64/:fileName')
 async getFileContentBase64(@Param('fileName') fileName: string) {
   const filePath = path.join(__dirname, '../../uploads', fileName);
   if (!fs.existsSync(filePath)) {
     throw new Error('File not found');
   }
   const fileBuffer = fs.readFileSync(filePath);
   const base64Data = fileBuffer.toString('base64'); // Convert file content to base64
   return { base64Content: base64Data }; // Send the base64 encoded content
 }


 



@Get('file-summary')
async getFileSummary(@Query('userId') userId: number) {
  // Total files uploaded
  const totalFiles = await this.fileMetadataRepository.count({ where: { userId } });

  // File type breakdown
  const fileTypeBreakdown = await this.fileMetadataRepository
    .createQueryBuilder('file')
    .select('file.mimeType')
    .addSelect('COUNT(file.mimeType)', 'count')
    .where('file.userId = :userId', { userId })
    .groupBy('file.mimeType')
    .getRawMany();

  // Return the file summary
  return {
    totalFiles,
    fileTypeBreakdown,
    errorFilesCount: await this.fileMetadataRepository.count({
      where: { userId, status: 'failed' },
    }),
  };
}
}
