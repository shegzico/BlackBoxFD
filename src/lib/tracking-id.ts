// Characters excluding easily confused ones: O, 0, I, 1, L
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateTrackingId(): string {
  let id = 'BB-';
  for (let i = 0; i < 6; i++) {
    id += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return id;
}
