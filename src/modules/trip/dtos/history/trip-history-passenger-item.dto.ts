import { PaymentMode, TripStatus } from '../../entities/trip.entity';

export type LatLngDto = { lat: number; lng: number };

export class TripHistoryPassengerItemDto {
  id: string;

  currentStatus: TripStatus;
  paymentMode: PaymentMode;

  requestedAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;

  pickupAddress: string | null;
  pickupPoint: LatLngDto | null;

  dropoffAddress: string | null;
  dropoffPoint: LatLngDto | null;

  stopsCount: number;

  currency: string | null;
  fareEstimatedTotal: number | null;
  fareTotal: number | null;
  distanceKm: number | null;
  durationMin: number | null;

  orderId: string | null;

  // “display stable” (snapshot)
  driverName: string | null;
  driverPhone: string | null;

  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  vehiclePlate: string | null;

  serviceClassName: string | null;
}