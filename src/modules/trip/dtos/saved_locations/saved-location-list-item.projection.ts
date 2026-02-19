import { GeoPointDto } from "src/common/dto/geo-point.dto";

export interface SavedLocationListItemProjection {
  id: string;
  userId: string | null;
  name: string;
  addressText: string;
  type: GeoPointDto;
  isFavorite: boolean;
  placeId: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // GeoJSON si lo seleccionas con ST_AsGeoJSON(...)
  locationPoint?: { type: 'Point'; coordinates: [number, number] } | null;
}