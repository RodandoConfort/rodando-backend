import { PaymentMode, TripStatus } from '../../entities/trip.entity';

export type GeoJsonPoint = { type: 'Point'; coordinates: [number, number] };

export interface TripHistoryPassengerProjection {
  id: string;

  currentStatus: TripStatus;
  paymentMode: PaymentMode;

  requestedAt: Date;
  acceptedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  canceledAt: Date | null;

  pickupAddress: string | null;
  pickupPoint: GeoJsonPoint | null;

  dropoffAddress: string | null;
  dropoffPoint: GeoJsonPoint | null;

  stopsCount: number;

  currency: string | null;
  fareEstimatedTotal: number | null;
  fareTotal: number | null;
  distanceKm: number | null;
  durationMin: number | null;

  orderId: string | null;

  // snapshot
  driverName: string | null;
  driverPhone: string | null;

  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  vehiclePlate: string | null;

  serviceClassName: string | null;
}

export interface TripHistoryDriverProjection {
  id: string;

  currentStatus: TripStatus;
  paymentMode: PaymentMode;

  requestedAt: Date;
  acceptedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  canceledAt: Date | null;

  pickupAddress: string | null;
  pickupPoint: GeoJsonPoint | null;

  dropoffAddress: string | null;
  dropoffPoint: GeoJsonPoint | null;

  stopsCount: number;

  currency: string | null;
  fareEstimatedTotal: number | null;
  fareTotal: number | null;
  distanceKm: number | null;
  durationMin: number | null;

  orderId: string | null;

  passengerName: string | null;
  passengerPhone: string | null;

  // snapshot vehicle
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  vehiclePlate: string | null;

  serviceClassName: string | null;
}