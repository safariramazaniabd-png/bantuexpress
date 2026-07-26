import { IsString, IsOptional, IsIn } from 'class-validator';

export class AddMemberDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'member'])
  role?: string;
}
