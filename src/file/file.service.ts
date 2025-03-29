import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common'; 
import { FileMetadata } from './file.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as pdf from 'pdf-parse';
import * as Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import { FileGateway } from './file.gateway'; 
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull'; 

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name); 

  constructor(
    @InjectRepository(FileMetadata)
    private fileMetadataRepository: Repository<FileMetadata>,
    private fileGateway: FileGateway,
    @InjectQueue('file-processing') private fileQueue: Queue,  
  ) {}

  async processFile(file: Express.Multer.File, userId: number) {
    if (!userId) {
      this.logger.error('User ID is required for file upload');
      throw new Error('User ID is required');
    }
  
    this.logger.log(`User ${userId} is uploading file: ${file.originalname}`);
  
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/csv', 'application/vnd.ms-excel'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      this.logger.error(`Invalid file type: ${file.mimetype}`);
      throw new Error('Invalid file format. Only PDF, image, CSV, and Excel files are allowed.');
    }

    const maxSize = 50 * 1024 * 1024;  // 50MB
    if (file.size > maxSize) {
      this.logger.error(`File is too large: ${file.size} bytes`);
      throw new Error('File exceeds maximum size of 50MB.');
    }
  
    const fileMetadata = new FileMetadata();
    fileMetadata.originalName = file.originalname;
    fileMetadata.fileName = file.filename;
    fileMetadata.mimeType = file.mimetype;
    fileMetadata.size = file.size;
    fileMetadata.path = path.join(__dirname, '../../uploads', file.filename);
    fileMetadata.userId = userId;
  
    this.logger.log(`Saving file metadata for: ${fileMetadata.originalName}`);
  
    await this.fileMetadataRepository.save(fileMetadata);
  
    this.fileGateway.emitFileProcessingStatus(fileMetadata.id, 'File uploaded');
    this.logger.log(`File metadata saved for: ${fileMetadata.originalName}`);
  
    try {
      this.logger.log(`Adding job to queue: ${fileMetadata.id}`);
      await this.fileQueue.add(fileMetadata);
    } catch (error) {
      this.logger.error('Error adding job to queue:', error);
    }
  
    return {
      message: 'File uploaded and processing started',
      fileMetadata,
    };
  }

  async processPDF(fileMetadata: FileMetadata, filePath: string) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const data = await pdf(fileBuffer);  
      const textContent = data.text;

      const cleanedText = textContent
        .replace(/\n+/g, ' ')          
        .replace(/\s{2,}/g, ' ')       
        .trim();                     
      fileMetadata.extractedData = cleanedText;
      this.logger.log(`Extracted text from PDF: ${cleanedText}`);
    } catch (error) {
      this.logger.error('Error processing PDF:', error);
      fileMetadata.status = 'failed';
      await this.fileMetadataRepository.save(fileMetadata);
    }
  }

  async processImage(fileMetadata: FileMetadata, filePath: string) {
    try {
      const { data: { text } } = await Tesseract.recognize(filePath, 'eng+spa+deu'); //(English + Spanish + German)
      fileMetadata.extractedData = text;
      this.logger.log(`Extracted text from image: ${text}`);
    } catch (error) {
      this.logger.error('Error processing image with OCR:', error);
      fileMetadata.status = 'failed';
      await this.fileMetadataRepository.save(fileMetadata);
    }
  }

  async processCSVExcel(fileMetadata: FileMetadata, filePath: string) {
    try {
      if (fileMetadata.mimeType === 'text/csv') {
        const csvFile = fs.readFileSync(filePath, 'utf-8');
        Papa.parse(csvFile, {
          complete: (result) => {
            fileMetadata.extractedData = JSON.stringify(result.data); 
            this.logger.log('Parsed CSV data:', result.data);
          },
        });
      } else if (fileMetadata.mimeType === 'application/vnd.ms-excel') {
        const excelFile = fs.readFileSync(filePath);
        const workbook = XLSX.read(excelFile, { type: 'buffer' });
        const sheetNames = workbook.SheetNames;
        const sheet = workbook.Sheets[sheetNames[0]]; 
        const sheetData = XLSX.utils.sheet_to_json(sheet);
        fileMetadata.extractedData = JSON.stringify(sheetData); 
        this.logger.log('Parsed Excel data:', sheetData);
      }
    } catch (error) {
      this.logger.error('Error processing CSV/Excel file:', error);
      fileMetadata.status = 'failed';
      await this.fileMetadataRepository.save(fileMetadata);
    }
  }
}
