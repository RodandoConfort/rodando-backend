import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMyTripCashOrderDto {
  @ApiProperty({
    description: 'Monto total solicitado de la orden (decimal positivo en string)',
    example: '120.00',
  })
  @IsNotEmpty()
  @IsNumberString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  requestedAmount: string;
}