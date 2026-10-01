// Location helpers: distance, Google Maps link parsing, and a Leaflet pin-drop picker.
import { html, toast } from './dom.js?v=20261001-10';

export function distanceKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null || a.lng == null || b.lng == null) return null;
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function parseMapsLink(text) {
  const s = decodeURIComponent(String(text || '').trim());
  const pats = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|ll|query|destination|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /\/place\/(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/];
  for (const re of pats) {
    const m = s.match(re);
    if (m) {
      const lat = Number(m[1]), lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

export const gmapsUrl = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
export const gmapsDirections = (from, to) => `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}`;

export async function geocode(q) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': 'en' } });
  if (!r.ok) throw new Error('Search failed');
  return (await r.json()).map((x) => ({ lat: Number(x.lat), lng: Number(x.lon), label: x.display_name }));
}
export async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, { headers: { 'Accept-Language': 'en' } });
    if (!r.ok) return '';
    return (await r.json()).display_name || '';
  } catch { return ''; }
}

const TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function pinIcon(kind = 'school') {
  return window.L.divIcon({ className: `pin pin-${kind}`, html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -26] });
}

export function baseMap(el, center, zoom = 13) {
  const map = window.L.map(el, { scrollWheelZoom: false }).setView(center, zoom);
  window.L.tileLayer(TILE, { attribution: ATTR, maxZoom: 19 }).addTo(map);
  setTimeout(() => map.invalidateSize(), 60);
  return map;
}

// ---------- form field ----------
export function locationField({ label = 'Location', address = '', lat = null, lng = null, maps_link = '', required = true, hint = '' } = {}) {
  return html`<fieldset class="loc-field" data-loc>
    <legend>${label}${required ? html` <span class="req">*</span>` : ''}</legend>
    ${hint ? html`<p class="hint">${hint}</p>` : ''}
    <div class="loc-tools">
      <div class="loc-search"><input type="search" data-loc-q placeholder="Search area, landmark or pincode…" aria-label="Search location">
        <button type="button" class="btn btn-ghost btn-sm" data-loc-go>Search</button></div>
      <button type="button" class="btn btn-ghost btn-sm" data-loc-me>📍 Use my location</button>
    </div>
    <div class="loc-results" data-loc-results hidden></div>
    <div class="loc-map" data-loc-map></div>
    <p class="hint">Tap the map or drag the pin to the exact spot. Or paste a Google Maps link:</p>
    <input type="url" name="maps_link" value="${maps_link}" placeholder="https://www.google.com/maps/place/…" data-loc-link>
    <label class="mt">Full address ${required ? html`<span class="req">*</span>` : ''}
      <textarea name="address" rows="2" ${required ? 'required' : ''} placeholder="Building, street, area, city, pincode">${address}</textarea></label>
    <input type="hidden" name="lat" value="${lat ?? ''}"><input type="hidden" name="lng" value="${lng ?? ''}">
    <p class="loc-status" data-loc-status></p>
  </fieldset>`;
}

export function mountLocationField(root) {
  const box = root.querySelector('[data-loc]');
  if (!box || !window.L) return;
  const latIn = box.querySelector('[name=lat]'), lngIn = box.querySelector('[name=lng]');
  const addr = box.querySelector('[name=address]'), status = box.querySelector('[data-loc-status]');
  const results = box.querySelector('[data-loc-results]');
  const has = latIn.value !== '' && lngIn.value !== '';
  const start = has ? [Number(latIn.value), Number(lngIn.value)] : [20.59, 78.96];
  const map = baseMap(box.querySelector('[data-loc-map]'), start, has ? 16 : 5);
  let marker = null;

  const set = async (lat, lng, { zoom = true, fillAddress = true } = {}) => {
    latIn.value = lat.toFixed(6); lngIn.value = lng.toFixed(6);
    if (!marker) {
      marker = window.L.marker([lat, lng], { draggable: true, icon: pinIcon('school') }).addTo(map);
      marker.on('dragend', () => { const p = marker.getLatLng(); set(p.lat, p.lng, { zoom: false }); });
    } else marker.setLatLng([lat, lng]);
    if (zoom) map.setView([lat, lng], Math.max(map.getZoom(), 16));
    status.textContent = `📍 Pinned at ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    status.classList.add('ok');
    if (fillAddress && !addr.value.trim()) { const a = await reverseGeocode(lat, lng); if (a && !addr.value.trim()) addr.value = a; }
  };
  if (has) set(start[0], start[1], { fillAddress: false });
  map.on('click', (e) => set(e.latlng.lat, e.latlng.lng, { zoom: false }));

  box.querySelector('[data-loc-me]').onclick = () => {
    if (!navigator.geolocation) return toast('Location is not available in this browser', 'error');
    status.textContent = 'Finding you…';
    navigator.geolocation.getCurrentPosition((p) => set(p.coords.latitude, p.coords.longitude),
      () => { status.textContent = ''; toast('Could not get your location — search or tap the map instead', 'error'); },
      { enableHighAccuracy: true, timeout: 10000 });
  };
  const doSearch = async () => {
    const q = box.querySelector('[data-loc-q]').value.trim();
    if (!q) return;
    results.hidden = false; results.textContent = 'Searching…';
    try {
      const r = await geocode(q);
      if (!r.length) { results.textContent = 'No matches — try a nearby landmark or pincode.'; return; }
      results.innerHTML = '';
      r.forEach((x) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'loc-result'; b.textContent = x.label;
        b.onclick = () => { results.hidden = true; addr.value = addr.value.trim() ? addr.value : x.label; set(x.lat, x.lng, { fillAddress: false }); };
        results.appendChild(b);
      });
    } catch { results.textContent = 'Search is unavailable right now — tap the map instead.'; }
  };
  box.querySelector('[data-loc-go]').onclick = doSearch;
  box.querySelector('[data-loc-q]').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
  box.querySelector('[data-loc-link]').addEventListener('change', (e) => {
    const v = e.target.value.trim();
    if (!v) return;
    const c = parseMapsLink(v);
    if (c) set(c.lat, c.lng);
    else if (/goo\.gl|maps\.app/.test(v)) toast('Short links can\'t be read — open it, then copy the full URL from the address bar, or drop the pin on the map.', 'error');
    else toast('Couldn\'t find coordinates in that link — drop the pin on the map instead.', 'error');
  });
}

export function readLocation(form) {
  const lat = form.querySelector('[name=lat]').value, lng = form.querySelector('[name=lng]').value;
  return lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;
}
