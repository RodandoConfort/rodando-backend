import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { TripRepository } from '../repositories/trip.repository';
import { TripStatus } from '../entities/trip.entity';
import { TripHistoryPassengerItemDto } from '../dtos/history/trip-history-passenger-item.dto';
import { TripHistoryDriverItemDto } from '../dtos/history/trip-history-driver-item.dto';

import {
  toDriverHistoryDto,
  toPassengerHistoryDto,
} from '../dtos/history/trip-history.mappers';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { PaginationMetaDto } from 'src/common/dto/pagination-meta.dto';
import { User, UserType } from 'src/modules/user/entities/user.entity';
import { paginated } from 'src/common/utils/response-helpers';
import { TripHistoryQueryDto } from '../dtos/history/trip-history-query.dto';

@Injectable()
export class TripHistoryService {
  private readonly logger = new Logger(TripHistoryService.name);

  constructor(
    private readonly tripRepo: TripRepository,
    private readonly dataSource: DataSource,
  ) {}

  async getMyHistory(
    authUserId: string,
    q: TripHistoryQueryDto,
  ): Promise<
    ApiResponseDto<
      Array<TripHistoryPassengerItemDto | TripHistoryDriverItemDto>,
      PaginationMetaDto
    >
  > {
    const { page = 1, limit = 10 } = q;

    // 1) Cargar userType de forma minimalista
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: authUserId } as any,
      select: { id: true, userType: true } as any,
    });

    if (!user) throw new NotFoundException('User not found');

    // 2) Validación de status (solo finales)
    if (q.status && !this.isFinalStatus(q.status)) {
      throw new BadRequestException(
        `Invalid status for history. Allowed: completed, cancelled, no_drivers_found`,
      );
    }

    const filters = {
      status: q.status,
      requestedFrom: q.requestedFrom,
      requestedTo: q.requestedTo,
    };

    // 3) Ramas por rol
    if (user.userType === UserType.DRIVER) {
      const [rows, total] =
        await this.tripRepo.findDriverHistoryPaginatedProjection(
          authUserId,
          { page, limit },
          filters,
        );

      const items = rows.map(toDriverHistoryDto);
      return paginated(items, total, page, limit, 'Trip history retrieved');
    }

    if (user.userType === UserType.PASSENGER) {
      const [rows, total] =
        await this.tripRepo.findPassengerHistoryPaginatedProjection(
          authUserId,
          { page, limit },
          filters,
        );

      const items = rows.map(toPassengerHistoryDto);
      return paginated(items, total, page, limit, 'Trip history retrieved');
    }

    // ADMIN u otros: por ahora no aplica (lo haces luego con endpoints de backoffice)
    throw new ForbiddenException('Trip history not available for this user type');
  }

  private isFinalStatus(st: TripStatus): boolean {
    return (
      st === TripStatus.COMPLETED ||
      st === TripStatus.CANCELLED ||
      st === TripStatus.NO_DRIVERS_FOUND
    );
  }
}