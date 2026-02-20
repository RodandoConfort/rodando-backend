import {
  TripHistoryDriverProjection,
  TripHistoryPassengerProjection,
} from './trip-history.projections';
import { TripHistoryDriverItemDto } from './trip-history-driver-item.dto';
import { TripHistoryPassengerItemDto } from './trip-history-passenger-item.dto';

const toISO = (d: any) => (d instanceof Date ? d.toISOString() : d ? new Date(d).toISOString() : null);

const toLatLng = (p: any) =>
  p?.coordinates?.length === 2
    ? { lat: p.coordinates[1], lng: p.coordinates[0] }
    : null;

export function toPassengerHistoryDto(
  r: TripHistoryPassengerProjection,
): TripHistoryPassengerItemDto {
  return {
    id: r.id,
    currentStatus: r.currentStatus,
    paymentMode: r.paymentMode,

    requestedAt: toISO(r.requestedAt)!,
    acceptedAt: toISO(r.acceptedAt),
    startedAt: toISO(r.startedAt),
    completedAt: toISO(r.completedAt),
    canceledAt: toISO(r.canceledAt),

    pickupAddress: r.pickupAddress ?? null,
    pickupPoint: toLatLng(r.pickupPoint),

    dropoffAddress: r.dropoffAddress ?? null,
    dropoffPoint: toLatLng(r.dropoffPoint),

    stopsCount: Number(r.stopsCount ?? 0),

    currency: r.currency ?? null,
    fareEstimatedTotal: r.fareEstimatedTotal ?? null,
    fareTotal: r.fareTotal ?? null,
    distanceKm: r.distanceKm ?? null,
    durationMin: r.durationMin ?? null,

    orderId: r.orderId ?? null,

    driverName: r.driverName ?? null,
    driverPhone: r.driverPhone ?? null,
    vehicleMake: r.vehicleMake ?? null,
    vehicleModel: r.vehicleModel ?? null,
    vehicleColor: r.vehicleColor ?? null,
    vehiclePlate: r.vehiclePlate ?? null,
    serviceClassName: r.serviceClassName ?? null,
  };
}

export function toDriverHistoryDto(
  r: TripHistoryDriverProjection,
): TripHistoryDriverItemDto {
  return {
    id: r.id,
    currentStatus: r.currentStatus,
    paymentMode: r.paymentMode,

    requestedAt: toISO(r.requestedAt)!,
    acceptedAt: toISO(r.acceptedAt),
    startedAt: toISO(r.startedAt),
    completedAt: toISO(r.completedAt),
    canceledAt: toISO(r.canceledAt),

    pickupAddress: r.pickupAddress ?? null,
    pickupPoint: toLatLng(r.pickupPoint),

    dropoffAddress: r.dropoffAddress ?? null,
    dropoffPoint: toLatLng(r.dropoffPoint),

    stopsCount: Number(r.stopsCount ?? 0),

    currency: r.currency ?? null,
    fareEstimatedTotal: r.fareEstimatedTotal ?? null,
    fareTotal: r.fareTotal ?? null,
    distanceKm: r.distanceKm ?? null,
    durationMin: r.durationMin ?? null,

    orderId: r.orderId ?? null,

    passengerName: r.passengerName ?? null,
    passengerPhone: r.passengerPhone ?? null,

    vehicleMake: r.vehicleMake ?? null,
    vehicleModel: r.vehicleModel ?? null,
    vehicleColor: r.vehicleColor ?? null,
    vehiclePlate: r.vehiclePlate ?? null,
    serviceClassName: r.serviceClassName ?? null,
  };
}