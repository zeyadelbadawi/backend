import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001'],  // Your frontend URL (e.g., http://localhost:3001)
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
})  // CORS configuration for WebSocket connections
export class FileGateway {
  @WebSocketServer() server: Server;  // WebSocket server instance
  private readonly logger = new Logger(FileGateway.name);

  handleConnection(client: any) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Emit real-time updates
  emitFileProcessingStatus(fileId: number, status: string) {
    this.server.emit('fileStatusUpdate', { fileId, status });  // Emit real-time updates
  }
}