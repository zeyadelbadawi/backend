import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { FileMetadata } from '../file/file.entity';  // Import FileMetadata

@Entity()
export class User {
  @PrimaryGeneratedColumn()  // 👈 now it's an auto-incrementing integer
  id: number;               

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({ default: 'user' })
  role: string; // This can be 'user' or 'admin'

  // One user can have many files
  @OneToMany(() => FileMetadata, file => file.user)  // Defining the relation
  files: FileMetadata[];
}
