export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'confirmed';

export const STATUS_ORDER: DeliveryStatus[] = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'confirmed'];

export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  confirmed: 'Confirmed',
};

export const STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: 'bg-gray-500',
  assigned: 'bg-blue-500',
  picked_up: 'bg-amber-500',
  in_transit: 'bg-amber-700',
  delivered: 'bg-green-500',
  confirmed: 'bg-green-700',
};

export const STATUS_TEXT_COLORS: Record<DeliveryStatus, string> = {
  pending: 'text-gray-400',
  assigned: 'text-blue-400',
  picked_up: 'text-amber-400',
  in_transit: 'text-amber-600',
  delivered: 'text-green-400',
  confirmed: 'text-green-600',
};

export type PaymentMethod = 'transfer' | 'cash_sender' | 'cod';

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  transfer: 'Bank Transfer',
  cash_sender: 'Cash (Sender pays)',
  cod: 'Cash on Delivery (COD)',
};

export interface Delivery {
  id: string;
  status: DeliveryStatus;
  created_at: string;
  updated_at: string;
  sender_name: string;
  sender_phone: string;
  pickup_area: string;
  pickup_address: string;
  recipient_name: string;
  recipient_phone: string;
  dropoff_area: string;
  dropoff_address: string;
  package_description: string | null;
  payment_method: PaymentMethod;
  is_express: boolean;
  fee: number | null;
  rider_id: number | null;
  created_by: 'customer' | 'admin';
  rider?: Rider;
}

export interface DeliveryHistory {
  id: number;
  delivery_id: string;
  status: DeliveryStatus;
  timestamp: string;
  triggered_by: 'system' | 'admin' | 'rider' | 'recipient';
  note: string | null;
}

export interface Rider {
  id: number;
  name: string;
  phone: string;
  pin: string;
  is_active: boolean;
  created_at: string;
}

export interface Admin {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'owner' | 'manager';
}

export const LAGOS_ZONES = {
  'Mainland Core': ['Yaba', 'Surulere', 'Ikeja', 'Ogba', 'Maryland', 'Oshodi'],
  'Island Core': ['Victoria Island', 'Lekki Phase 1', 'Ikoyi', 'Ajah'],
  'Mainland Extended': ['Ikorodu', 'Berger', 'Ojodu', 'Agege', 'Mushin'],
  'Island Extended': ['Lekki Phase 2', 'Epe', 'Sangotedo'],
} as const;

export const ALL_ZONES = Object.values(LAGOS_ZONES).flat();
