import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class CreateConversationDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  participantIds: string[];
}
