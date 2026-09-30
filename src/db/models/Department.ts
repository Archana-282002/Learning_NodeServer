import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany} from 'sequelize-typescript';
import { User } from './User';
import { Employee } from './Employee';

@Table({ tableName: 'Departments' })
export class Department extends Model {
  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  name!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  code!: string;

  @Column({ type: DataType.STRING, allowNull: true })
  description?: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  createdBy?: number;

  @BelongsTo(() => User)
  creator!: User;

  @HasMany(() => Employee)
  employees!: Employee[];
}
