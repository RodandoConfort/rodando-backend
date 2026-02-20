import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { TripStatus } from '../../entities/trip.entity';

export class TripHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /**
   * Permite filtrar dentro de los estados finales.
   * Si mandan algo fuera de: completed/cancelled/no_drivers_found -> 400.
   */
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @IsOptional()
  @Type(() => Date)
  requestedFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  requestedTo?: Date;
}