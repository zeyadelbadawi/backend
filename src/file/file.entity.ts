import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';  // Assuming you have a User entity

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

  // New field to associate the file with a user
  @ManyToOne(() => User, user => user.files)
  user: User;

  @Column()
  userId: number;  // Store the user's ID in the file metadata

  // Use TEXT for the uploadDate field and store the date in a readable format
  @Column({ type: 'text', default: () => 'CURRENT_TIMESTAMP' })
  uploadDate: string;  // Store the date as a string in ISO-8601 format
}
