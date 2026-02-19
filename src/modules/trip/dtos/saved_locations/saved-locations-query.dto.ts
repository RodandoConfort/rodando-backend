import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SavedLocationType } from '../../entities/saved-locations.entity';

const toBool = (v: any): boolean | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase().trim();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return undefined;
};

export class SavedLocationsQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  // Si userId viene, includeGlobal=true => (user_id = userId OR user_id IS NULL)
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  includeGlobal?: boolean;

  @IsOptional()
  @IsEnum(SavedLocationType)
  type?: SavedLocationType;

  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  sortByLastUsed?: boolean;
}