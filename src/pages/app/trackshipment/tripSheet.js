/*
| The Trip Sheet rules that have to hold however the page looks: every stop
| has a place on the map, saving never makes two loads, and the load goes in
| with its pickup and delivery so the backend can refuse a driver who is
| already on another load then.
|
| Plain JavaScript on purpose - no React, no imports - so `npm test` can
| check them directly (tripSheet.test.js).
*/

export const PICK_FROM_SUGGESTIONS = "Pick the address from the suggestions so it can be placed on the map.";

export const NOT_ON_THE_MAP = "Google couldn't place that address on the map. Pick one of the suggestions.";

/*
| The driver app draws every stop from its latitude / longitude, and the
| driver API only lets a driver mark "Arrived" within 500 m of them. Both
| read anything other than these ranges as "no location" - and so does the
| backend (App\Support\StopLocation), which refuses such a stop on save.
*/
export function isLatitude(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isLongitude(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function hasLocation(stop) {
  return isLatitude(stop?.latitude) && isLongitude(stop?.longitude);
}

/**
 * The pin of a place Google Autocomplete picked, or null when there is none:
 * Enter pressed on typed text with no suggestion highlighted comes back as
 * just a name, with no geometry at all.
 */
export function placeLocation(place) {
  const location = place?.geometry?.location;

  if (!location) {
    return null;
  }

  const latitude = typeof location.lat === "function" ? location.lat() : location.lat;
  const longitude = typeof location.lng === "function" ? location.lng() : location.lng;

  return isLatitude(latitude) && isLongitude(longitude) ? { latitude, longitude } : null;
}

/**
 * When the load starts and ends - its first stop's start window and its last
 * stop's end window - as the pickup / delivery fields POST /shipments takes.
 * Blank parts are null, never "", so they can't reach a DATE column.
 *
 * Sent with the load so the backend can refuse it before it exists when one
 * of its drivers is already on another load at that time. The backend checks
 * the stops again when they are saved.
 */
export function loadSchedule(stops) {
  const first = stops[0] || {};
  const last = stops[stops.length - 1] || {};

  return {
    pickup_date: first.start_date || null,
    pickup_time: first.start_time || null,
    pickup_timezone: first.start_timezone || null,
    delivery_date: last.end_date || null,
    delivery_time: last.end_time || null,
    delivery_timezone: last.end_timezone || null,
  };
}

/**
 * Whether a save was refused because a driver on the load is already on
 * another load at an overlapping time. The error's message says which load
 * and when.
 */
export function isDriverBooked(err) {
  return err?.status === 422 && Array.isArray(err?.errors?.driver_schedule);
}

/** What a page starts a save with - and keeps between retries. */
export function newSaveAttempt() {
  return { uuid: null, sentStops: [] };
}

/**
 * Creates the load from step 1 - with its pickup and delivery, see
 * loadSchedule() - then saves its stops.
 *
 * Two requests, so a save can fail half-way - the load made, its stops not.
 * `attempt` remembers what an earlier try got done:
 *
 *  - a retry reuses the load that try created, instead of making a second;
 *  - if that try's stops did reach the server but its answer never came
 *    back (a timeout), the server answers the retry 409 "already saved" -
 *    which is success. `stopsChanged` says the broker edited the stops in
 *    between, so what was saved is the earlier version, not what's on screen.
 *
 * Throws on any other failure, leaving `attempt` ready for the retry.
 *
 * @returns {Promise<{ uuid: string, alreadySaved: boolean, stopsChanged: boolean }>}
 */
export async function saveTripSheet({ apiFetch, step1Payload, stopsPayload, attempt }) {
  if (!attempt.uuid) {
    const created = await apiFetch("/shipments", {
      method: "POST",
      body: JSON.stringify({ ...step1Payload, ...loadSchedule(stopsPayload) }),
    });

    const uuid = created?.data?.uuid || created?.uuid;

    if (!uuid) {
      throw new Error(created?.message || "Could not create the shipment. Please try again.");
    }

    attempt.uuid = uuid;
  }

  const stopsJson = JSON.stringify(stopsPayload);
  const sentBefore = [...attempt.sentStops];

  attempt.sentStops.push(stopsJson);

  const formData = new FormData();
  formData.append("stops_data", stopsJson);

  try {
    await apiFetch(`/shipments/${attempt.uuid}/stops`, {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    if (err?.status !== 409) {
      throw err;
    }

    return {
      uuid: attempt.uuid,
      alreadySaved: true,
      stopsChanged: sentBefore.some((sent) => sent !== stopsJson),
    };
  }

  return { uuid: attempt.uuid, alreadySaved: false, stopsChanged: false };
}
