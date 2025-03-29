import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { FileMetadata } from '../file/file.entity';  

@Entity()
export class User {
  @PrimaryGeneratedColumn() 
  id: number;               

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({ default: 'user' })
  role: string; 

  @OneToMany(() => FileMetadata, file => file.user) 
  files: FileMetadata[];
}
