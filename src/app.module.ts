import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { User } from './user/user.entity';
import { FileModule } from './file/file.module';
import { FileMetadata } from './file/file.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite', 
      database: 'data.db',
      synchronize: true,
      entities: [User, FileMetadata], 
    }),
    JwtModule.register({
      secret: 'secretKey', 
      signOptions: { expiresIn: '60m' },
    }),
    UserModule,
    AuthModule,
    FileModule,
  ],
})
export class AppModule {}
