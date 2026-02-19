import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { SavedLocation, SavedLocationType } from "../entities/saved-locations.entity";
import { SavedLocationRepository } from "../repositories/saved-location.repository";
import { DataSource, DeepPartial } from "typeorm";
import { SavedLocationsQueryDto } from "../dtos/saved_locations/saved-locations-query.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { ApiResponseDto } from "src/common/dto/api-response.dto";
import { PaginationMetaDto } from "src/common/dto/pagination-meta.dto";
import { paginated } from "src/common/utils/response-helpers";
import { CreateSavedLocationDto } from "../dtos/saved_locations/create-saved-location.dto";
import { withQueryRunnerTx } from "src/common/utils/tx.util";
import { UpdateSavedLocationDto } from "../dtos/saved_locations/update-saved-location.dto";
import { Point } from "geojson";

export type SavedLocationResponseDto = {
  id: string;
  userId: string | null;
  name: string;
  addressText: string;
  type: SavedLocationType;
  isFavorite: boolean;
  point: { lat: number; lng: number };
  placeId: string | null;
  metadata: Record<string, any> | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class SavedLocationService {
  private readonly logger = new Logger(SavedLocationService.name);

  constructor(
    private readonly savedLocationRepo: SavedLocationRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Listado paginado de ubicaciones guardadas del usuario.
   * - Por defecto SOLO del usuario.
   * - Si includeGlobal=true => incluye también POI global (user_id IS NULL).
   */
  async findAllForUser(
    authUserId: string,
    q: SavedLocationsQueryDto & PaginationDto,
  ): Promise<ApiResponseDto<SavedLocationResponseDto[], PaginationMetaDto>> {
    const { page = 1, limit = 10, ...filters } = q;

    // Blindaje: el usuario no puede pedir data de otro userId por query
    const safeFilters: SavedLocationsQueryDto = {
      ...filters,
      userId: authUserId,
      includeGlobal: filters.includeGlobal ?? false,
    };

    const [entities, total] = await this.savedLocationRepo.findAllPaginated(
      { page, limit },
      safeFilters,
    );

    const items = entities.map(toSavedLocationResponseDto);
    return paginated(items, total, page, limit, 'Saved locations retrieved');
  }

  /** Detalle por id (owner o global) */
  async getByIdForUser(
    authUserId: string,
    id: string,
  ): Promise<ApiResponseDto<SavedLocationResponseDto>> {
    const loc = await this.savedLocationRepo.findById(id, {
      relations: { user: true },
    });
    if (!loc) throw new NotFoundException('Saved location not found');

    this.assertReadableByUser(loc, authUserId);

    return {
      success: true,
      message: 'Saved location retrieved',
      data: toSavedLocationResponseDto(loc),
    };
  }

  /** Crear ubicación guardada (SIEMPRE para el usuario autenticado) */
  async createForUser(
    authUserId: string,
    dto: CreateSavedLocationDto,
  ): Promise<ApiResponseDto<SavedLocationResponseDto>> {
    this.validatePoint(dto.point);

    // Regla pro simple: HOME/WORK 1 por usuario (si ya existe => conflicto)
    if (dto.type === SavedLocationType.HOME || dto.type === SavedLocationType.WORK) {
      const existing = await this.savedLocationRepo.findByUserAndType(authUserId, dto.type);
      if (existing) {
        throw new ConflictException(`You already have a '${dto.type}' saved location. Update it instead.`);
      }
    }

    const created = await withQueryRunnerTx(
      this.dataSource,
      async (_qr, manager) => {
        const entity: DeepPartial<SavedLocation> = {
          user: { id: authUserId } as any,
          name: dto.name.trim(),
          addressText: dto.addressText.trim(),
          locationPoint: toGeoPoint(dto.point.lat, dto.point.lng) as any,
          isFavorite: dto.isFavorite ?? false,
          type: dto.type ?? SavedLocationType.OTHER,
          placeId: dto.placeId ?? null,
          metadata: dto.metadata ?? null,
          lastUsedAt: null,
        };

        return await this.savedLocationRepo.createAndSave(entity, manager);
      },
      { logLabel: 'saved_location.create' },
    );

    const full = await this.savedLocationRepo.findById(created.id, {
      relations: { user: true },
    });

    return {
      success: true,
      message: 'Saved location created',
      data: toSavedLocationResponseDto(full!),
    };
  }

  /** Update (solo owner; global => forbidden) */
  async updateForUser(
    authUserId: string,
    id: string,
    dto: UpdateSavedLocationDto,
  ): Promise<ApiResponseDto<SavedLocationResponseDto>> {
    const updated = await withQueryRunnerTx(
      this.dataSource,
      async (_qr, manager) => {
        const loc = await this.savedLocationRepo.findById(id, {
          relations: { user: true },
        });
        if (!loc) throw new NotFoundException('Saved location not found');

        this.assertWritableByUser(loc, authUserId);

        if (dto.point) this.validatePoint(dto.point);

        // Si están intentando cambiar a HOME/WORK, validar unicidad
        if (
          dto.type === SavedLocationType.HOME ||
          dto.type === SavedLocationType.WORK
        ) {
          const existing = await this.savedLocationRepo.findByUserAndType(authUserId, dto.type);
          if (existing && existing.id !== loc.id) {
            throw new ConflictException(`You already have a '${dto.type}' saved location.`);
          }
        }

        const patch: DeepPartial<SavedLocation> = {};

        if (dto.name !== undefined) patch.name = dto.name.trim();
        if (dto.addressText !== undefined) patch.addressText = dto.addressText.trim();
        if (dto.type !== undefined) patch.type = dto.type as any;
        if (dto.isFavorite !== undefined) patch.isFavorite = dto.isFavorite;
        if (dto.placeId !== undefined) patch.placeId = dto.placeId ?? null;
        if (dto.metadata !== undefined) patch.metadata = dto.metadata ?? null;

        if (dto.point) {
          patch.locationPoint = toGeoPoint(dto.point.lat, dto.point.lng) as any;
        }

        return await this.savedLocationRepo.updatePartial(id, patch, manager);
      },
      { logLabel: 'saved_location.update' },
    );

    return {
      success: true,
      message: 'Saved location updated',
      data: toSavedLocationResponseDto(updated),
    };
  }

  /** Delete (solo owner; global => forbidden) */
  async deleteForUser(
    authUserId: string,
    id: string,
  ): Promise<ApiResponseDto<{ id: string }>> {
    await withQueryRunnerTx(
      this.dataSource,
      async (_qr, manager) => {
        const loc = await this.savedLocationRepo.findById(id, {
          relations: { user: true },
        });
        if (!loc) throw new NotFoundException('Saved location not found');

        this.assertWritableByUser(loc, authUserId);

        const repo = this.savedLocationRepo['scoped'](manager) as any;
        await repo.delete({ id } as any);
      },
      { logLabel: 'saved_location.delete' },
    );

    return {
      success: true,
      message: 'Saved location deleted',
      data: { id },
    };
  }

  /** Toggle favorito (solo owner; global => forbidden) */
  async setFavoriteForUser(
    authUserId: string,
    id: string,
    isFavorite: boolean,
  ): Promise<ApiResponseDto<SavedLocationResponseDto>> {
    const updated = await withQueryRunnerTx(
      this.dataSource,
      async (_qr, manager) => {
        const loc = await this.savedLocationRepo.findById(id, {
          relations: { user: true },
        });
        if (!loc) throw new NotFoundException('Saved location not found');

        this.assertWritableByUser(loc, authUserId);

        return await this.savedLocationRepo.updatePartial(
          id,
          { isFavorite } as any,
          manager,
        );
      },
      { logLabel: 'saved_location.favorite' },
    );

    return {
      success: true,
      message: 'Saved location favorite updated',
      data: toSavedLocationResponseDto(updated),
    };
  }

  /**
   * Marcar como usada (last_used_at)
   * Útil si al seleccionar una ubicación guardada para pedir viaje quieres orden por recencia.
   */
  async markUsedForUser(
    authUserId: string,
    id: string,
  ): Promise<ApiResponseDto<{ id: string; lastUsedAt: string }>> {
    const now = new Date();

    await withQueryRunnerTx(
      this.dataSource,
      async (_qr, manager) => {
        const loc = await this.savedLocationRepo.findById(id, {
          relations: { user: true },
        });
        if (!loc) throw new NotFoundException('Saved location not found');

        // readable (owner o global) -> permitir "used"
        this.assertReadableByUser(loc, authUserId);

        await this.savedLocationRepo.touchLastUsed(id, now, manager);
      },
      { logLabel: 'saved_location.used' },
    );

    return {
      success: true,
      message: 'Saved location marked as used',
      data: { id, lastUsedAt: now.toISOString() },
    };
  }

  // ----------------- helpers -----------------

  private assertReadableByUser(loc: SavedLocation, authUserId: string) {
    const ownerId = (loc as any).user?.id ?? null;
    if (ownerId && ownerId !== authUserId) {
      throw new ForbiddenException('You do not have access to this saved location');
    }
    // ownerId null => POI global => se permite leer
  }

  private assertWritableByUser(loc: SavedLocation, authUserId: string) {
    const ownerId = (loc as any).user?.id ?? null;

    // Global POI: por defecto NO se puede editar/borrar por usuarios normales
    if (!ownerId) {
      throw new ForbiddenException('Global saved locations cannot be modified');
    }
    if (ownerId !== authUserId) {
      throw new ForbiddenException('You cannot modify this saved location');
    }
  }

  private validatePoint(p?: { lat: number; lng: number } | null) {
    if (!p) throw new BadRequestException('point is required');
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) {
      throw new BadRequestException('Invalid coordinates');
    }
    if (p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180) {
      throw new BadRequestException('Coordinates out of range');
    }
  }
}

// ----------------- mappers -----------------

const toISO = (d?: Date | null) => (d instanceof Date ? d.toISOString() : null);

const toLatLng = (geoPoint: any) => ({
  lat: geoPoint?.coordinates?.[1],
  lng: geoPoint?.coordinates?.[0],
});

const toGeoPoint = (lat: number, lng: number): Point => ({
  type: 'Point',
  coordinates: [lng, lat],
});

function toSavedLocationResponseDto(loc: SavedLocation): SavedLocationResponseDto {
  const ownerId = (loc as any).user?.id ?? (loc as any).userId ?? null;

  return {
    id: (loc as any).id,
    userId: ownerId,
    name: (loc as any).name,
    addressText: (loc as any).addressText,
    type: (loc as any).type,
    isFavorite: (loc as any).isFavorite,
    point: toLatLng((loc as any).locationPoint),
    placeId: (loc as any).placeId ?? null,
    metadata: (loc as any).metadata ?? null,
    lastUsedAt: toISO((loc as any).lastUsedAt),
    createdAt: (loc as any).createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: (loc as any).updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}