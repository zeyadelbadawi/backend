import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.WS_CORS_ORIGIN, // Retrieve from environment variable
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
})  
export class FileGateway {
  @WebSocketServer() server: Server;  
  private readonly logger = new Logger(FileGateway.name);

  handleConnection(client: any) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitFileProcessingStatus(fileId: number, status: string) {
    this.server.emit('fileStatusUpdate', { fileId, status });  
  }
}
