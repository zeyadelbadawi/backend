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
    TypeOrmModule.forFeature([FileMetadata]),  // For accessing file metadata in DB
    BullModule.forRoot({
      redis: {
        host: 'localhost',  // Redis server address
        port: 6379,         // Redis server port
      },
    }),
    BullModule.registerQueue({
      name: 'file-processing',  // Name of the queue
    }),
  ],
  controllers: [FileController],
  providers: [FileService, FileProcessor, FileGateway],
})
export class FileModule {}
