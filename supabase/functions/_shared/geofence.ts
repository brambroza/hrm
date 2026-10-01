/**
 * @file Where a punch happened (shared by the app and the Edge Function; see src/lib/clock), and whether that is inside a work site.
 *
 * Pure: positions and sites in, a decision out. Shared by the phone screen,
 * which shows the decision before the button is pressed, and the Edge
 * Function, which makes the decision that counts.
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Position extends GeoPoint {
  /** Radius of 68% confidence in metres, as the device reports it. */
  accuracy?: number | null;
}

export interface WorkSite extends GeoPoint {
  id: string;
  name: string;
  /** Allowed distance from the site centre, in metres. */
  radius_m: number;
  is_active?: boolean | null;
}

export type PunchVerdict = 'inside' | 'outside' | 'imprecise' | 'no_sites' | 'no_position';

export interface GeofenceResult {
  verdict: PunchVerdict;
  /** The nearest active site, when there is one. */
  site: WorkSite | null;
  /** Distance to that site's centre in whole metres. */
  distance_m: number | null;
  /** Metres beyond the radius; zero when inside. */
  overshoot_m: number;
}

/** A reported accuracy worse than this means the phone does not know where it is. */
export const MAX_ACCURACY_M = 200;
/** Smallest radius a site may have; GPS in a city is rarely better than this. */
export const MIN_RADIUS_M = 30;
/** Largest radius a site may have. */
export const MAX_RADIUS_M = 5000;

const EARTH_RADIUS_M = 6371008.8;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Whether a value is a usable latitude.
 * @param value - Anything.
 * @returns True for a finite number between -90 and 90.
 */
export const isLatitude = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;

/**
 * Whether a value is a usable longitude.
 * @param value - Anything.
 * @returns True for a finite number between -180 and 180.
 */
export const isLongitude = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;

/**
 * Whether a value is a usable site radius.
 * @param value - Anything.
 * @returns True for a whole number of metres within the allowed range.
 */
export const isRadius = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= MIN_RADIUS_M && value <= MAX_RADIUS_M;

/**
 * Great-circle distance between two points (haversine).
 * @param a - One point.
 * @param b - The other point.
 * @returns Distance in metres.
 */
export const distanceBetween = (a: GeoPoint, b: GeoPoint): number => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

/**
 * Decide whether a position counts as being at work.
 *
 * The nearest active site is the one that matters. A position is inside when
 * its distance to that site's centre is within the radius; the reported
 * accuracy is not added to the distance, because that would let a phone with
 * poor GPS punch from further away, not closer. Instead a very poor accuracy
 * is refused outright so the employee can try again under open sky.
 *
 * @param position - Where the phone says it is.
 * @param sites - The company's work sites.
 * @returns The verdict and the figures behind it.
 */
export const evaluatePosition = (position: Position | null | undefined, sites: WorkSite[]): GeofenceResult => {
  const active = sites.filter((site) => site.is_active !== false && isLatitude(site.latitude) && isLongitude(site.longitude));
  if (active.length === 0) return { verdict: 'no_sites', site: null, distance_m: null, overshoot_m: 0 };
  if (!position || !isLatitude(position.latitude) || !isLongitude(position.longitude)) {
    return { verdict: 'no_position', site: null, distance_m: null, overshoot_m: 0 };
  }

  let nearest: WorkSite = active[0];
  let nearestDistance = Number.POSITIVE_INFINITY;
  active.forEach((site) => {
    const distance = distanceBetween(position, site);
    if (distance < nearestDistance) {
      nearest = site;
      nearestDistance = distance;
    }
  });

  const distance_m = Math.round(nearestDistance);
  const overshoot_m = Math.max(0, distance_m - nearest.radius_m);
  if (typeof position.accuracy === 'number' && position.accuracy > MAX_ACCURACY_M) {
    return { verdict: 'imprecise', site: nearest, distance_m, overshoot_m };
  }
  return { verdict: overshoot_m === 0 ? 'inside' : 'outside', site: nearest, distance_m, overshoot_m };
};

/**
 * A distance as people say it.
 * @param metres - Distance in metres.
 * @returns Text such as `85 ม.` or `1.2 กม.`.
 */
export const formatDistance = (metres: number | null | undefined): string => {
  if (metres === null || metres === undefined || !Number.isFinite(metres)) return '';
  if (metres < 1000) return `${Math.round(metres)} ม.`;
  return `${(metres / 1000).toFixed(metres < 10000 ? 1 : 0)} กม.`;
};
