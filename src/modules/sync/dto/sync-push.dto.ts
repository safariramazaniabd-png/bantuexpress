import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsISO8601,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SYNC_ACTIONS, SYNC_ENTITY_TYPES } from './sync.constants';

export class SyncOperationDto {
  @IsIn(SYNC_ENTITY_TYPES, { message: 'entityType must be one of addresses, landmarks, business-profiles, qrcodes' })
  entityType: string;

  @IsString()
  @MaxLength(64)
  entityId: string;

  @IsIn(SYNC_ACTIONS, { message: 'action must be create, update or delete' })
  action: string;

  @IsObject()
  data: Record<string, unknown>;

  @IsISO8601({ strict: false }, { message: 'clientTimestamp must be a valid ISO 8601 date' })
  clientTimestamp: string;
}

export class SyncPushDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'operations must not be empty' })
  @ArrayMaxSize(100, { message: 'Batch too large (max 100 operations)' })
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations: SyncOperationDto[];
}