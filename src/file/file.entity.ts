import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';  

@Entity()
export class FileMetadata {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  originalName: string;

  @Column()
  fileName: string;

  @Column()
  mimeType: string;

  @Column()
  size: number;

  @Column()
  path: string;

  @Column({ default: 'pending' })
  status: string;

  @Column('text', { nullable: true })
  extractedData: string;

  @ManyToOne(() => User, user => user.files)
  user: User;

  @Column()
  userId: number; 
  @Column({ type: 'text', default: () => 'CURRENT_TIMESTAMP' })
  uploadDate: string; 
}
