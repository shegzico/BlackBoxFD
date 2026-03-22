export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'confirmed' | 'cancelled';

export const STATUS_ORDER: DeliveryStatus[] = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'confirmed'];

export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

// Full badge class: bg + border + text — used in StatusBadge
export const STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending:   'bg-[rgba(100,115,130,0.15)] border border-[rgba(100,115,130,0.25)] text-[#8090a0]',
  assigned:  'bg-[rgba(65,100,155,0.15)] border border-[rgba(65,100,155,0.25)] text-[#6a8fbf]',
  picked_up: 'bg-[rgba(150,105,35,0.15)] border border-[rgba(150,105,35,0.25)] text-[#aa8040]',
  in_transit:'bg-[rgba(145,80,35,0.15)] border border-[rgba(145,80,35,0.25)] text-[#a06530]',
  delivered: 'bg-[rgba(38,100,58,0.15)] border border-[rgba(38,100,58,0.25)] text-[#3d8050]',
  confirmed: 'bg-[rgba(30,80,48,0.15)] border border-[rgba(30,80,48,0.25)] text-[#2d6840]',
  cancelled: 'bg-[rgba(135,55,55,0.15)] border border-[rgba(135,55,55,0.25)] text-[#a85858]',
};

// Text-only color — used in timelines, labels, etc.
export const STATUS_TEXT_COLORS: Record<DeliveryStatus, string> = {
  pending:   'text-[#8090a0]',
  assigned:  'text-[#6a8fbf]',
  picked_up: 'text-[#aa8040]',
  in_transit:'text-[#a06530]',
  delivered: 'text-[#3d8050]',
  confirmed: 'text-[#2d6840]',
  cancelled: 'text-[#a85858]',
};

export type PaymentMethod = 'sender_pays' | 'receiver_pays';

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  sender_pays: 'Sender Pays',
  receiver_pays: 'Receiver Pays',
};

export interface Delivery {
  id: string;
  status: DeliveryStatus;
  created_at: string;
  updated_at: string;
  pickup_date: string | null;
  sender_name: string;
  sender_phone: string;
  sender_email: string | null;
  pickup_area: string;
  pickup_address: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_email?: string | null;
  dropoff_area: string;
  dropoff_address: string;
  package_description: string | null;
  package_weight?: number | null;
  payment_method: PaymentMethod;
  is_express: boolean;
  fee: number | null;
  rider_id: number | null;
  customer_id: number | null;
  created_by: 'customer' | 'admin';
  rider?: Rider;
}

export interface DeliveryHistory {
  id: number;
  delivery_id: string;
  status: DeliveryStatus;
  timestamp: string;
  triggered_by: 'system' | 'admin' | 'rider' | 'recipient' | 'customer';
  note: string | null;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  is_verified: boolean;
  default_pickup_area: string | null;
  default_pickup_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface BulkDeliveryRow {
  recipient_name: string;
  recipient_phone: string;
  dropoff_area: string;
  dropoff_address: string;
  package_description?: string;
  payment_method: PaymentMethod;
  is_express: boolean;
}

export interface Rider {
  id: number;
  name: string;
  username: string;
  phone: string;
  pin: string;
  is_active: boolean;
  created_at: string;
  image_url: string | null;
  bike_plate: string | null;
  bike_model: string | null;
  bike_color: string | null;
}

export interface Admin {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'owner' | 'manager';
}

export const LAGOS_ZONES = {
  'Island Core': ['Victoria Island', 'Ikoyi', 'Lagos Island', 'Lekki Phase 1', 'Lekki Phase 2'],
  'Mainland Core': ['Yaba', 'Surulere', 'Maryland', 'Ikeja', 'Costain', 'Ketu', 'Ogudu', 'Ojota', 'Jibowu', 'Oshodi-Isolo', 'Mushin'],
  'Mainland Extended': ['Ogba', 'Egbeda', 'Olowoora', 'Egan', 'Ajangbadi', 'Aspamda', 'Ikorodu', 'Ojodu Berger', 'Isheri-Berger', 'Ojodu', 'Amuwo Odofin', 'Apapa', 'Festac Town'],
  'Island Extended': ['Ajah', 'Sangotedo', 'Lakowe', 'Eleko', 'Bogije', 'Ibeju-Lekki', 'Epe'],
  'Far Areas': ['Agege', 'Iba', 'Lasu', 'Ojo', 'Seme', 'Agbara', 'Mowo'],
} as const;

export type ZoneCategory = keyof typeof LAGOS_ZONES;

export const ALL_ZONES = Object.values(LAGOS_ZONES).flat();

export interface PricingEntry {
  id: number;
  location: string;
  zone_category: ZoneCategory;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Nigerian phone number validation
export function isValidNigerianPhone(phone: string): boolean {
  // Strip spaces, dashes
  const cleaned = phone.replace(/[\s-]/g, '');
  // Accept: 08012345678, +2348012345678, 2348012345678
  return /^(\+?234|0)[789]\d{9}$/.test(cleaned);
}

export function formatNigerianPhone(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+234')) return cleaned;
  if (cleaned.startsWith('234')) return '+' + cleaned;
  if (cleaned.startsWith('0')) return '+234' + cleaned.slice(1);
  return cleaned;
}
