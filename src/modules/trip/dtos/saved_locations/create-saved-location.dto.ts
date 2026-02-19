import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { GeoPointDto } from 'src/common/dto/geo-point.dto';
import { SavedLocationType } from '../../entities/saved-locations.entity';

export class CreateSavedLocationDto {
  // En flujo normal lo pondrás desde el user autenticado (service),
  // pero se deja opcional por si creas POI global (userId null) o admin.
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 80)
  name: string;

  @IsString()
  @IsNotEmpty()
  addressText: string;

  @ValidateNested()
  @Type(() => GeoPointDto)
  point: GeoPointDto;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsEnum(SavedLocationType)
  type?: SavedLocationType;

  @IsOptional()
  @IsString()
  @Length(1, 128)
  placeId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}