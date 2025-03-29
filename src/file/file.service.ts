import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';  // Import Logger
import { FileMetadata } from './file.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as pdf from 'pdf-parse';
import * as Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import { FileGateway } from './file.gateway';  // Import the WebSocket Gateway
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';  // Import Queue from Bull

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);  // Create logger instance

  constructor(
    @InjectRepository(FileMetadata)
    private fileMetadataRepository: Repository<FileMetadata>,
    private fileGateway: FileGateway,  // Inject the WebSocket Gateway
    @InjectQueue('file-processing') private fileQueue: Queue,  // Inject Bull queue
  ) {}

  async processFile(file: Express.Multer.File, userId: number) {
    // Ensure user ID is provided
    if (!userId) {
      this.logger.error('User ID is required for file upload');
      throw new Error('User ID is required');
    }
  
    this.logger.log(`User ${userId} is uploading file: ${file.originalname}`);
  
    // Validate file type (only allowed types: PDF, image, CSV, Excel)
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/csv', 'application/vnd.ms-excel'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      this.logger.error(`Invalid file type: ${file.mimetype}`);
      throw new Error('Invalid file format. Only PDF, image, CSV, and Excel files are allowed.');
    }

    // Validate file size (Max size: 50MB)
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
    fileMetadata.userId = userId;  // Ensure userId is assigned
  
    // Log the file metadata being saved
    this.logger.log(`Saving file metadata for: ${fileMetadata.originalName}`);
  
    // Save to database
    await this.fileMetadataRepository.save(fileMetadata);
  
    // Emit real-time file upload status
    this.fileGateway.emitFileProcessingStatus(fileMetadata.id, 'File uploaded');
    this.logger.log(`File metadata saved for: ${fileMetadata.originalName}`);
  
    // Add job to the queue
    try {
      this.logger.log(`Adding job to queue: ${fileMetadata.id}`);
      await this.fileQueue.add(fileMetadata);  // Add job to the Bull queue
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
      const data = await pdf(fileBuffer);  // Extract text using pdf-parse
      const textContent = data.text;

      // Clean up extracted text
      const cleanedText = textContent
        .replace(/\n+/g, ' ')          // Replace multiple newlines with a space
        .replace(/\s{2,}/g, ' ')       // Replace multiple spaces with a single space
        .trim();                      // Trim any leading or trailing whitespace

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
      // Recognize text from the image (supporting multiple languages: English, Spanish, and German)
      const { data: { text } } = await Tesseract.recognize(filePath, 'eng+spa+deu'); // Multilingual support (English + Spanish + German)
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
            fileMetadata.extractedData = JSON.stringify(result.data); // Save parsed CSV data
            this.logger.log('Parsed CSV data:', result.data);
          },
        });
      } else if (fileMetadata.mimeType === 'application/vnd.ms-excel') {
        const excelFile = fs.readFileSync(filePath);
        const workbook = XLSX.read(excelFile, { type: 'buffer' });
        const sheetNames = workbook.SheetNames;
        const sheet = workbook.Sheets[sheetNames[0]]; // Read the first sheet
        const sheetData = XLSX.utils.sheet_to_json(sheet);
        fileMetadata.extractedData = JSON.stringify(sheetData); // Save parsed Excel data
        this.logger.log('Parsed Excel data:', sheetData);
      }
    } catch (error) {
      this.logger.error('Error processing CSV/Excel file:', error);
      fileMetadata.status = 'failed';
      await this.fileMetadataRepository.save(fileMetadata);
    }
  }
}
