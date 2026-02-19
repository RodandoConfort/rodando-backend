import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateSavedLocationDto } from './create-saved-location.dto';

/**
 * Buenas prácticas: no permitir cambiar el owner con update.
 * Si necesitas “transfer”, haz un endpoint/admin dedicado.
 */
export class UpdateSavedLocationDto extends PartialType(
  OmitType(CreateSavedLocationDto, ['userId'] as const),
) {}