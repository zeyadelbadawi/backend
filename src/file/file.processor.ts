import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';  // Import Logger
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

@Processor('file-processing')
@Injectable()
export class FileProcessor {
  private readonly logger = new Logger(FileProcessor.name);  // Create logger instance

  constructor(
    @InjectRepository(FileMetadata)
    private fileMetadataRepository: Repository<FileMetadata>,  // Inject repository
    private fileGateway: FileGateway,  // Inject WebSocket Gateway
  ) {}

  @Process()
  async handleFileProcessing(job: Job<FileMetadata>) {
    this.logger.log('Processing started for file:', job.data.originalName);

    const fileMetadata = job.data;

    // Emit real-time processing update
    this.fileGateway.emitFileProcessingStatus(fileMetadata.id, 'Processing started');

    const filePath = path.join(__dirname, '../../uploads', fileMetadata.fileName);

    try {
      if (fileMetadata.mimeType === 'application/pdf') {
        this.logger.log('Processing PDF file...');
        await this.processPDF(fileMetadata, filePath);
      } else if (fileMetadata.mimeType.startsWith('image/')) {
        this.logger.log('Processing image file...');
        await this.processImage(fileMetadata, filePath);
      } else if (fileMetadata.mimeType === 'text/csv' || fileMetadata.mimeType === 'application/vnd.ms-excel') {
        this.logger.log('Processing CSV/Excel file...');
        await this.processCSVExcel(fileMetadata, filePath);
      }
    } catch (error) {
      this.logger.error('Error during file processing:', error);
    }

    // Mark file as completed
    fileMetadata.status = 'completed';
    this.fileGateway.emitFileProcessingStatus(fileMetadata.id, 'Processing completed');

    // Save processed file metadata
    await this.fileMetadataRepository.save(fileMetadata);
  }

  async processPDF(fileMetadata: FileMetadata, filePath: string) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const data = await pdf(fileBuffer);

      // If the PDF has text in multiple languages (e.g., English and Spanish)
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
      this.fileGateway.emitFileProcessingStatus(fileMetadata.id, 'Processing failed');
      fileMetadata.status = 'failed';
    }
  }

  async processImage(fileMetadata: FileMetadata, filePath: string) {
    try {
      // Recognize text from the image (supporting multiple languages)
      const { data: { text } } = await Tesseract.recognize(filePath, 'eng+spa'); // Multilingual support (English + Spanish)
      fileMetadata.extractedData = text;
      this.logger.log(`Extracted text from image: ${text}`);
    } catch (error) {
      this.logger.error('Error processing image with OCR:', error);
      this.fileGateway.emitFileProcessingStatus(fileMetadata.id, 'Processing failed');
      fileMetadata.status = 'failed';
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
      this.fileGateway.emitFileProcessingStatus(fileMetadata.id, 'Processing failed');
      fileMetadata.status = 'failed';
    }
  }
}
