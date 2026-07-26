import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateLandmarkDto } from './create-landmark.dto';

export class UpdateLandmarkDto extends PartialType(
  OmitType(CreateLandmarkDto, ['latitude', 'longitude'] as const),
) {
  latitude?: number;
  longitude?: number;
}
