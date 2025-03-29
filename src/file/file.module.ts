import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { FileMetadata } from './file.entity';
import { BullModule } from '@nestjs/bull';
import { FileProcessor } from './file.processor';
import { FileGateway } from './file.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileMetadata]), 
    BullModule.forRoot({
      redis: {
        host: 'localhost', 
        port: 6379,         
      },
    }),
    BullModule.registerQueue({
      name: 'file-processing', 
    }),
  ],
  controllers: [FileController],
  providers: [FileService, FileProcessor, FileGateway],
})
export class FileModule {}
