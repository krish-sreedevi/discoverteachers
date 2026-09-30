// Aadhaar numbers carry a Verhoeff check digit — catches typos before they reach the admin.
const d = [
  [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],
  [5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0],
];
const p = [
  [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],
  [9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
];

export function cleanAadhaar(v) { return String(v || '').replace(/\D/g, ''); }

export function isValidAadhaar(v) {
  const s = cleanAadhaar(v);
  if (!/^[2-9][0-9]{11}$/.test(s)) return false;
  let c = 0;
  s.split('').reverse().forEach((ch, i) => { c = d[c][p[i % 8][Number(ch)]]; });
  return c === 0;
}

export function formatAadhaar(v) { return cleanAadhaar(v).replace(/(\d{4})(?=\d)/g, '$1 '); }

export function cleanPhone(v) {
  let s = String(v || '').replace(/[^\d+]/g, '');
  if (s.startsWith('+91')) s = s.slice(3);
  else if (s.startsWith('91') && s.length === 12) s = s.slice(2);
  else if (s.startsWith('0') && s.length === 11) s = s.slice(1);
  return s;
}
export function isValidPhone(v) {
  const s = cleanPhone(v);
  return /^[6-9]\d{9}$/.test(s) || /^\d{10,11}$/.test(s); // mobiles or landlines with STD code
}

export function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()); }

export function normalizeUrl(v) {
  v = String(v || '').trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}
