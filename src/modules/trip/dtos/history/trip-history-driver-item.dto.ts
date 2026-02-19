import { PaymentMode, TripStatus } from '../../entities/trip.entity';

export type LatLngDto = { lat: number; lng: number };

export class TripHistoryDriverItemDto {
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

  // Driver necesita ver pasajero para historial
  passengerName: string | null;
  passengerPhone: string | null;

  // Útil si el driver cambia de vehículo, este “snapshot” evita inconsistencias
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  vehiclePlate: string | null;

  serviceClassName: string | null;
}