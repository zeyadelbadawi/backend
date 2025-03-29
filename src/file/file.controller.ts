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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = './uploads';
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath); 
      },
      filename: (req, file, cb) => {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName); 
      }
    }),
    limits: {
      fileSize: 50 * 1024 * 1024, 
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpg|jpeg|png|pdf|csv|xlsx/;
      const extname = allowedTypes.test(file.mimetype);
      const mimetype = allowedTypes.test(file.mimetype);
  
      if (extname && mimetype) {
        return cb(null, true); 
      } else {
        return cb(new Error('Invalid file type. Only PDF, image, CSV, or Excel files are allowed.'), false); 
      }
    }
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body('userId') userId: number) {
    console.log(file); 
    return this.fileService.processFile(file, userId); 
  }
  
  
  @Get('files')
  async getFiles(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status: string,
    @Query('type') type: string,
    @Query('sortBy') sortBy: string = 'uploadDate',  
    @Query('sortOrder') sortOrder: string = 'ASC',
    @Query('userId') userId: number 
  ) {
    const take = limit;
    const skip = (page - 1) * limit;

    const query = this.fileMetadataRepository.createQueryBuilder('fileMetadata')
      .where('fileMetadata.userId = :userId', { userId })  
      .orderBy(sortBy, sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'); 

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
      where: { id }, 
    });

    if (!file) {
      throw new Error('File not found');
    }

    return file;
  }


 @Get('file/base64/:fileName')
 async getFileContentBase64(@Param('fileName') fileName: string) {
   const filePath = path.join(__dirname, '../../uploads', fileName);
   if (!fs.existsSync(filePath)) {
     throw new Error('File not found');
   }
   const fileBuffer = fs.readFileSync(filePath);
   const base64Data = fileBuffer.toString('base64'); 
   return { base64Content: base64Data }; 
 }


 



@Get('file-summary')
async getFileSummary(@Query('userId') userId: number) {
  const totalFiles = await this.fileMetadataRepository.count({ where: { userId } });

  const fileTypeBreakdown = await this.fileMetadataRepository
    .createQueryBuilder('file')
    .select('file.mimeType')
    .addSelect('COUNT(file.mimeType)', 'count')
    .where('file.userId = :userId', { userId })
    .groupBy('file.mimeType')
    .getRawMany();

  return {
    totalFiles,
    fileTypeBreakdown,
    errorFilesCount: await this.fileMetadataRepository.count({
      where: { userId, status: 'failed' },
    }),
  };
}
}
