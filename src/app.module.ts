import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { User } from './user/user.entity';
import { FileModule } from './file/file.module';
import { FileMetadata } from './file/file.entity';  // Import FileMetadata

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite', // Database type
      database: 'data.db', // Correct path for SQLite database file
      synchronize: true, // Auto-create database schema on app startup
      entities: [User, FileMetadata], // Add FileMetadata to entities array
    }),
    JwtModule.register({
      secret: 'secretKey', // Use environment variables in production
      signOptions: { expiresIn: '60m' }, // Set expiration time for JWT token
    }),
    UserModule,
    AuthModule,
    FileModule,
  ],
})
export class AppModule {}
