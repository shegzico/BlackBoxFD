export type DeliveryStatus =
  | 'pending' | 'assigned' | 'picked_up' | 'in_transit'
  | 'delivered' | 'confirmed' | 'cancelled'
  | 'delivery_failed' | 'returning' | 'returned';

/** Normal forward delivery flow — used by ProgressBar */
export const STATUS_ORDER: DeliveryStatus[] = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'confirmed'];

/** Return flow — shown when delivery has failed and is heading back */
export const RETURN_STATUS_ORDER: DeliveryStatus[] = ['delivery_failed', 'returning', 'returned'];

export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending:          'Pending',
  assigned:         'Assigned',
  picked_up:        'Picked Up',
  in_transit:       'In Transit',
  delivered:        'Delivered',
  confirmed:        'Confirmed',
  cancelled:        'Cancelled',
  delivery_failed:  'Delivery Failed',
  returning:        'Returning',
  returned:         'Returned',
};

// Full badge class: bg + border + text — used in StatusBadge
export const STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending:         'bg-[rgba(100,115,130,0.15)] border border-[rgba(100,115,130,0.25)] text-[#8090a0]',
  assigned:        'bg-[rgba(65,100,155,0.15)] border border-[rgba(65,100,155,0.25)] text-[#6a8fbf]',
  picked_up:       'bg-[rgba(150,105,35,0.15)] border border-[rgba(150,105,35,0.25)] text-[#aa8040]',
  in_transit:      'bg-[rgba(145,80,35,0.15)] border border-[rgba(145,80,35,0.25)] text-[#a06530]',
  delivered:       'bg-[rgba(38,100,58,0.15)] border border-[rgba(38,100,58,0.25)] text-[#3d8050]',
  confirmed:       'bg-[rgba(30,80,48,0.15)] border border-[rgba(30,80,48,0.25)] text-[#2d6840]',
  cancelled:       'bg-[rgba(135,55,55,0.15)] border border-[rgba(135,55,55,0.25)] text-[#a85858]',
  delivery_failed: 'bg-[rgba(180,60,40,0.15)] border border-[rgba(180,60,40,0.25)] text-[#c05040]',
  returning:       'bg-[rgba(80,100,160,0.15)] border border-[rgba(80,100,160,0.25)] text-[#6080c0]',
  returned:        'bg-[rgba(90,60,130,0.15)] border border-[rgba(90,60,130,0.25)] text-[#8060a8]',
};

// Text-only color — used in timelines, labels, etc.
export const STATUS_TEXT_COLORS: Record<DeliveryStatus, string> = {
  pending:         'text-[#8090a0]',
  assigned:        'text-[#6a8fbf]',
  picked_up:       'text-[#aa8040]',
  in_transit:      'text-[#a06530]',
  delivered:       'text-[#3d8050]',
  confirmed:       'text-[#2d6840]',
  cancelled:       'text-[#a85858]',
  delivery_failed: 'text-[#c05040]',
  returning:       'text-[#6080c0]',
  returned:        'text-[#8060a8]',
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
  /** Confirmation codes — only present in server-side contexts / admin views */
  delivery_confirmation_code?: string | null;
  return_confirmation_code?: string | null;
  /** Photos taken by rider at handover */
  delivery_photo_url?: string | null;
  return_photo_url?: string | null;
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
  'Island Core': [
    'Victoria Island', 'Ikoyi', 'Lagos Island', 'Lekki Phase 1', 'Lekki Phase 2',
    'Banana Island', 'Oniru', 'Marina', 'Bade', 'Eko Atlantic',
    'Obalende', 'Lafiaji', 'Bar Beach', 'Ozumba Mbadiwe',
    'Adeola Odeku', 'Ademola Adetokunbo', 'Ligali Ayorinde',
  ],
  'Island Extended': [
    'Lekki', 'Chevron', 'Agungi', 'Idado', 'Osapa London', 'Igbo Efon', 'VGC',
    'Ilaje', 'Awoyaya', 'Thomas Estate', 'Abraham Adesanya', 'Badore', 'Ogombo',
    'Abijo', 'Lakowe', 'Eleko', 'Bogije', 'Ajah', 'Sangotedo',
    'Ibeju-Lekki', 'Epe',
    'Ikate', 'Ikate Elegushi', 'Ologolo', 'Orchid Road', 'Freedom Way',
    'Jakande', 'Lekki Gardens', 'Pennfield', 'Chevron Drive',
    'Ado', 'Ado Odo', 'Ibeju', 'Mowe',
  ],
  'Mainland Core': [
    'Yaba', 'Surulere', 'Maryland', 'Ikeja', 'Costain', 'Ketu', 'Ogudu',
    'Ojota', 'Jibowu', 'Oshodi', 'Oshodi-Isolo', 'Mushin',
    'Gbagada', 'Bariga', 'Palmgrove', 'Anthony', 'Pedro',
    'Fadeyi', 'Onike', 'Akoka', 'Igbobi',
    'Agidingbi', 'Allen Avenue', 'Opebi', 'GRA Ikeja', 'Alausa',
    'Oregun', 'Omole Phase 1', 'Omole Phase 2', 'Kosofe',
    'Anthony Village', 'Mende', 'Shomolu', 'Palmgrove Estate',
    'Ilupeju', 'Toyin Street', 'Allen', 'Ikeja GRA',
    'Mafoluku', 'Airport Road', 'Mangoro', 'Bode Thomas', 'Lawanson',
    'Western Avenue', 'Iganmu',
  ],
  'Mainland Extended': [
    'Ogba', 'Egbeda', 'Olowoora', 'Egan', 'Ajangbadi', 'Aspamda',
    'Ikorodu', 'Ojodu Berger', 'Isheri-Berger', 'Ojodu',
    'Amuwo Odofin', 'Apapa', 'Festac Town', 'Satellite Town',
    'Ago Palace Way', 'Okota', 'Isolo', 'Ilasamaja', 'Mile 2',
    'Dopemu', 'Abule Egba', 'Iyana Ipaja', 'Idimu',
    'Ifako-Ijaiye', 'Meiran', 'Ipaja', 'Ayobo',
    'Berger', 'Ketu-Alapere', 'Mile 12', 'Oworo', 'Owuronshoki',
    'Alapere', 'Ojuelegba', 'Ajegunle', 'Orile', 'Kirikiri',
    'Ijesha', 'Igando', 'Ikotun', 'Ejigbo', 'Bucknor',
    'Coker', 'Cement', 'Isale Eko',
  ],
  'Far Areas': [
    'Agege', 'Iba', 'Lasu', 'Ojo', 'Seme', 'Agbara', 'Mowo', 'Badagry',
    'Alimosho', 'Egbe', 'Egbe-Idimu',
  ],
} as const;

/**
 * Alternate names Google Places API may return that map to a canonical zone entry.
 * Keys are lower-cased alternate names.
 */
export const AREA_ALIASES: Record<string, string> = {
  'lekki phase i': 'Lekki Phase 1',
  'lekki phase ii': 'Lekki Phase 2',
  'ibeju lekki': 'Ibeju-Lekki',
  'ibeju - lekki': 'Ibeju-Lekki',
  'vi': 'Victoria Island',
  'v.i.': 'Victoria Island',
  'v/i': 'Victoria Island',
  'victoria island annex': 'Victoria Island',
  'ikeja gra': 'GRA Ikeja',
  'gra, ikeja': 'GRA Ikeja',
  'government residential area': 'GRA Ikeja',
  'anthony village': 'Anthony',
  'allen': 'Allen Avenue',
  'berger': 'Ojodu Berger',
  'ojodu - berger': 'Ojodu Berger',
  'festac': 'Festac Town',
  'satellite': 'Satellite Town',
  'ago palace': 'Ago Palace Way',
  'somolu': 'Shomolu',
  'mende': 'Maryland',
  'onipetesi': 'Maryland',
  'orchid hotel road': 'Orchid Road',
  'orchid hotel': 'Orchid Road',
  'ikate elegushi': 'Ikate',
  'elegushi': 'Ikate',
  'cms': 'Lagos Island',
  'broad street': 'Lagos Island',
  'tinubu square': 'Lagos Island',
  'bar beach': 'Victoria Island',
  'eko hotel': 'Victoria Island',
  'ligali': 'Victoria Island',
  'mile 2': 'Mile 2',
  'ketu-alapere': 'Ketu',
  'alapere': 'Ketu',
  'mile 12': 'Ketu',
  'egbe idimu': 'Egbe-Idimu',
  'chevron drive': 'Chevron',
  'freedom way': 'Lekki Phase 1',
  'admiralty way': 'Lekki Phase 1',
  'oniru estate': 'Oniru',
};

/** Match a Google Places area name to the nearest Lagos zone, or return ''. */
export function matchLagosZone(placeName: string): string {
  if (!placeName) return '';
  const lower = placeName.toLowerCase().trim();

  // Check aliases first (handles common Google spelling variations)
  const aliasMatch = AREA_ALIASES[lower];
  if (aliasMatch) return aliasMatch;

  // Exact match (case-insensitive)
  for (const zones of Object.values(LAGOS_ZONES)) {
    for (const zone of zones as readonly string[]) {
      if (zone.toLowerCase() === lower) return zone;
    }
  }

  // Partial match — zone name contains the place name or vice versa
  for (const zones of Object.values(LAGOS_ZONES)) {
    for (const zone of zones as readonly string[]) {
      if (zone.toLowerCase().includes(lower) || lower.includes(zone.toLowerCase())) {
        return zone;
      }
    }
  }

  return '';
}

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
