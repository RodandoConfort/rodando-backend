import { Point } from 'geojson';
import { User } from 'src/modules/user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SavedLocationType {
  HOME = 'home',
  WORK = 'work',
  OTHER = 'other',
  POI = 'poi',
  AIRPORT = 'airport',
  STATION = 'station',
}

@Entity({ name: 'saved_locations' })
@Index('idx_saved_locations_user', ['user'])
@Index('idx_saved_locations_type', ['type'])
@Index('idx_saved_locations_user_favorite', ['user', 'isFavorite'])
// Recomendado para que un usuario no tenga 2 "home" o 2 "work"
// (Si tu versión de TypeORM no crea bien el partial index, hazlo en migración manual)
@Index('ux_saved_locations_user_type_home_work', ['user', 'type'], {
  unique: true,
  where: `"user_id" IS NOT NULL AND "type" IN ('home','work')`,
})
export class SavedLocation {
  @PrimaryGeneratedColumn('uuid', { name: '_id' })
  id: string;

  /**
   * NULL => POI general de la plataforma (no pertenece a un usuario)
   * NO NULL => ubicación guardada por el usuario
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ name: 'name', type: 'varchar', length: 80 })
  name: string;

  @Column({ name: 'address_text', type: 'text' })
  addressText: string;

  // GEOGRAFÍA (GeoJSON Point: [lng, lat])
  @Column({
    name: 'location_point',
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  locationPoint: Point;

  @Column({ name: 'is_favorite', type: 'boolean', default: false })
  isFavorite: boolean;

  @Column({
    name: 'type',
    type: 'enum',
    enum: SavedLocationType,
    default: SavedLocationType.OTHER,
  })
  type: SavedLocationType;

  /**
   * Opcional “pro” (sin acoplarte): id del proveedor de geocoding (Google PlaceId / Mapbox / etc.)
   */
  @Column({ name: 'place_id', type: 'varchar', length: 128, nullable: true })
  placeId?: string | null;

  /**
   * Para ordenar por “recientes” (ej: casa/trabajo salen siempre arriba, y el resto por uso)
   */
  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt?: Date | null;

  /**
   * Bolsillo para metadata (componentes de dirección, countryCode, etc.) sin migraciones futuras
   */
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

/**
 * ⚠️ Índice espacial recomendado (Postgres GIST) para location_point:
 * Crear en migración manual:
 *   CREATE INDEX idx_saved_locations_point_gist
 *   ON saved_locations USING GIST (location_point);
 */