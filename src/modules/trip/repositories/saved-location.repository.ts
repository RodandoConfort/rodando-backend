import { Injectable } from "@nestjs/common";
import { BaseRepository } from "src/common/repositories/base.repository";
import { SavedLocation, SavedLocationType } from "../entities/saved-locations.entity";
import { DataSource, DeepPartial, EntityManager, SelectQueryBuilder } from "typeorm";
import { handleRepositoryError } from "src/common/utils/handle-repository-error";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { SavedLocationsQueryDto } from "../dtos/saved_locations/saved-locations-query.dto";
import { SavedLocationListItemProjection } from "../dtos/saved_locations/saved-location-list-item.projection";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

@Injectable()
export class SavedLocationRepository extends BaseRepository<SavedLocation> {
  constructor(dataSource: DataSource) {
    super(
      SavedLocation,
      dataSource.createEntityManager(),
      'SavedLocationRepository',
      'SavedLocation',
    );
  }

  /** Crear y guardar (participa en transacción si pasas manager) */
  async createAndSave(
    partial: DeepPartial<SavedLocation>,
    manager?: EntityManager,
  ): Promise<SavedLocation> {
    const repo = this.scoped(manager);
    const entity = repo.create(partial);
    try {
      return await repo.save(entity);
    } catch (err) {
      handleRepositoryError(this.logger, err, 'createAndSave', this.entityName);
      throw err;
    }
  }

  /** Obtener por id (con relaciones opcionales) */
  async findById(
    id: string,
    opts: { relations?: boolean | Record<string, boolean> } = { relations: true },
  ): Promise<SavedLocation | null> {
    try {
      if (opts.relations) {
        return await this.findOne({
          where: { id } as any,
          relations:
            typeof opts.relations === 'boolean'
              ? ({ user: true } as any)
              : (opts.relations as any),
        });
      }
      return await this.findOne({ where: { id } as any });
    } catch (err) {
      handleRepositoryError(this.logger, err, 'findById', this.entityName);
      throw err;
    }
  }

  /** Listado paginado con ENTIDADES */
  async findAllPaginated(
    pagination: PaginationDto,
    filters?: SavedLocationsQueryDto,
  ): Promise<[SavedLocation[], number]> {
    const { page = 1, limit = 10 } = pagination;

    const qb = this.qb('sl')
      .leftJoinAndSelect('sl.user', 'user')
      .orderBy('sl.createdAt', 'DESC');

    if (filters) this.applyFilters(qb, filters);

    if (filters?.sortByLastUsed) {
      qb.orderBy('sl.lastUsedAt', 'DESC', 'NULLS LAST')
        .addOrderBy('sl.createdAt', 'DESC');
    }

    this.paginate(qb, page, limit);
    return this.getManyAndCountSafe(qb, 'findAllPaginated');
  }

  /**
   * Listado paginado en PROYECCIÓN (RAW)
   * - Más liviano que cargar la entidad + relaciones completas.
   */
  async findListPaginatedProjection(
    pagination: PaginationDto,
    filters?: SavedLocationsQueryDto,
  ): Promise<[SavedLocationListItemProjection[], number]> {
    const { page = 1, limit = 10 } = pagination;

    const qb = this.qb('sl')
      .select([
        'sl._id AS id',
        'sl.user_id AS "userId"',
        'sl.name AS name',
        'sl.address_text AS "addressText"',
        'sl.type AS type',
        'sl.is_favorite AS "isFavorite"',
        'sl.place_id AS "placeId"',
        'sl.last_used_at AS "lastUsedAt"',
        'sl.created_at AS "createdAt"',
        'sl.updated_at AS "updatedAt"',
        `ST_AsGeoJSON(sl.location_point)::json AS "locationPoint"`,
      ])
      .orderBy('sl.created_at', 'DESC');

    if (filters) this.applyFilters(qb, filters);

    if (filters?.sortByLastUsed) {
      qb.orderBy('sl.last_used_at', 'DESC', 'NULLS LAST')
        .addOrderBy('sl.created_at', 'DESC');
    }

    this.paginate(qb, page, limit);

    try {
      const [rows, total] = await Promise.all([
        qb.getRawMany<SavedLocationListItemProjection>(),
        this.countWithFilters(filters),
      ]);
      return [rows, total];
    } catch (err) {
      handleRepositoryError(
        this.logger,
        err,
        'findListPaginatedProjection',
        this.entityName,
      );
      throw err;
    }
  }

  /** Patch con retorno de entidad fresca */
  async updatePartial(
    id: string,
    patch: DeepPartial<SavedLocation>,
    manager?: EntityManager,
  ): Promise<SavedLocation> {
    const repo = this.scoped(manager);
    try {
      await repo.update(
        { id } as any,
        patch as QueryDeepPartialEntity<SavedLocation>,
      );

      const updated = await repo.findOne({
        where: { id } as any,
        relations: { user: true } as any,
      });

      return updated!;
    } catch (err) {
      handleRepositoryError(this.logger, err, 'updatePartial', this.entityName);
      throw err;
    }
  }

  /** Marcar last_used_at (cuando la usan para pedir viaje) */
  async touchLastUsed(
    id: string,
    at: Date,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.scoped(manager);
    try {
      await repo.update({ id } as any, { lastUsedAt: at } as any);
    } catch (err) {
      handleRepositoryError(this.logger, err, 'touchLastUsed', this.entityName);
      throw err;
    }
  }

  async findByUserAndType(
    userId: string,
    type: SavedLocationType,
  ): Promise<SavedLocation | null> {
    const qb = this.qb('sl')
      .where('sl.user_id = :uid', { uid: userId })
      .andWhere('sl.type = :type', { type })
      .limit(1);

    return this.getOneSafe(qb, 'findByUserAndType');
  }

  // --------- helpers privados ----------
  private applyFilters(
    qb: SelectQueryBuilder<SavedLocation>,
    f: SavedLocationsQueryDto,
  ): void {
    if (f.userId) {
      if (f.includeGlobal) {
        qb.andWhere('(sl.user_id = :uid OR sl.user_id IS NULL)', { uid: f.userId });
      } else {
        qb.andWhere('sl.user_id = :uid', { uid: f.userId });
      }
    }

    if (f.type) qb.andWhere('sl.type = :type', { type: f.type });

    if (f.isFavorite !== undefined) {
      qb.andWhere('sl.is_favorite = :fav', { fav: f.isFavorite });
    }

    if (f.q) {
      qb.andWhere('(sl.name ILIKE :q OR sl.address_text ILIKE :q)', {
        q: `%${f.q}%`,
      });
    }
  }

  private async countWithFilters(filters?: SavedLocationsQueryDto): Promise<number> {
    const qb = this.qb('sl').select('sl._id');
    if (filters) this.applyFilters(qb, filters);

    try {
      return await qb.getCount();
    } catch (err) {
      handleRepositoryError(this.logger, err, 'countWithFilters', this.entityName);
      throw err;
    }
  }
}