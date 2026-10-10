// Run with `npm test` (Node's built-in test runner - no extra packages).
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  hasLocation,
  isLatitude,
  isLongitude,
  newSaveAttempt,
  placeLocation,
  saveTripSheet,
} from "./tripSheet.js";

describe("the location rule (same as the backend and the driver side)", () => {
  it("accepts every latitude from -90 to 90", () => {
    for (const value of [0, 90, -90, 28.4198677, -33.8688]) assert.equal(isLatitude(value), true, String(value));
  });

  it("refuses anything else as a latitude", () => {
    for (const value of [90.0000001, -91, null, undefined, "", "28.4", NaN, Infinity, true, {}]) {
      assert.equal(isLatitude(value), false, String(value));
    }
  });

  it("accepts every longitude from -180 to 180 and nothing else", () => {
    for (const value of [0, 180, -180, 77.0382266]) assert.equal(isLongitude(value), true, String(value));
    for (const value of [180.0000001, -181, null, "77", NaN]) assert.equal(isLongitude(value), false, String(value));
  });

  it("needs both halves for a stop to have a location", () => {
    assert.equal(hasLocation({ latitude: 28.4, longitude: 77.03 }), true);
    assert.equal(hasLocation({ latitude: 28.4, longitude: null }), false);
    assert.equal(hasLocation({ latitude: null, longitude: null }), false);
    assert.equal(hasLocation(undefined), false);
  });
});

describe("placeLocation", () => {
  const googlePlace = (lat, lng) => ({ geometry: { location: { lat: () => lat, lng: () => lng } } });

  it("reads the pin of a picked suggestion", () => {
    assert.deepEqual(placeLocation(googlePlace(28.4198677, 77.0382266)), { latitude: 28.4198677, longitude: 77.0382266 });
  });

  it("is null when Google gave no pin - e.g. Enter on typed text", () => {
    assert.equal(placeLocation({ name: "jmd megapolis" }), null);
    assert.equal(placeLocation(undefined), null);
  });

  it("is null for a pin the driver side couldn't use", () => {
    assert.equal(placeLocation(googlePlace(95, 10)), null);
  });
});

/**
 * A stand-in for apiFetch: answers each call from a script and records it.
 * A script entry is a value to return, or an Error to throw.
 */
function fakeApi(script) {
  const calls = [];

  const apiFetch = async (path, options) => {
    calls.push({ path, method: options?.method, body: options?.body });

    const next = script.shift();

    if (next instanceof Error) throw next;

    return next;
  };

  return { apiFetch, calls };
}

const failure = (message, status) => Object.assign(new Error(message), status ? { status } : {});

const created = { status: true, data: { uuid: "load-1" } };
const stopsSaved = { status: true };

const step1Payload = { tracking_method: "driver_phone" };
const stops = [{ address: "4200 Diplomacy Rd", latitude: 32.834, longitude: -96.944 }];
const editedStops = [{ address: "2075 W Buckeye Rd", latitude: 33.436, longitude: -112.103 }];

const paths = (calls) => calls.map((c) => c.path);

describe("saveTripSheet", () => {
  it("creates the load, then saves its stops", async () => {
    const { apiFetch, calls } = fakeApi([created, stopsSaved]);

    const result = await saveTripSheet({ apiFetch, step1Payload, stopsPayload: stops, attempt: newSaveAttempt() });

    assert.deepEqual(result, { uuid: "load-1", alreadySaved: false, stopsChanged: false });
    assert.deepEqual(paths(calls), ["/shipments", "/shipments/load-1/stops"]);
    assert.equal(calls[1].body.get("stops_data"), JSON.stringify(stops));
  });

  it("retries the stops on the load it already made - never a second load", async () => {
    const { apiFetch, calls } = fakeApi([created, failure("Server Error", 500), stopsSaved]);
    const attempt = newSaveAttempt();

    await assert.rejects(saveTripSheet({ apiFetch, step1Payload, stopsPayload: stops, attempt }), /Server Error/);

    const result = await saveTripSheet({ apiFetch, step1Payload, stopsPayload: stops, attempt });

    assert.equal(result.alreadySaved, false);
    assert.deepEqual(paths(calls), ["/shipments", "/shipments/load-1/stops", "/shipments/load-1/stops"]);
  });

  it("treats 'already saved' after a timeout as saved", async () => {
    // The first stops request timed out, but the server did save the stops,
    // so the retry gets 409 from the backend's "load already has stops" guard.
    const { apiFetch, calls } = fakeApi([
      created,
      failure("Request timed out. Please check your connection and try again."),
      failure("This load's stops are already saved and can't be replaced.", 409),
    ]);
    const attempt = newSaveAttempt();

    await assert.rejects(saveTripSheet({ apiFetch, step1Payload, stopsPayload: stops, attempt }), /timed out/);

    const result = await saveTripSheet({ apiFetch, step1Payload, stopsPayload: stops, attempt });

    assert.deepEqual(result, { uuid: "load-1", alreadySaved: true, stopsChanged: false });
    assert.equal(paths(calls).filter((p) => p === "/shipments").length, 1);
  });

  it("flags it when the stops were edited between the timeout and the retry", async () => {
    const { apiFetch } = fakeApi([created, failure("Request timed out."), failure("already saved", 409)]);
    const attempt = newSaveAttempt();

    await assert.rejects(saveTripSheet({ apiFetch, step1Payload, stopsPayload: stops, attempt }));

    const result = await saveTripSheet({ apiFetch, step1Payload, stopsPayload: editedStops, attempt });

    assert.deepEqual(result, { uuid: "load-1", alreadySaved: true, stopsChanged: true });
  });

  it("passes the backend's reason through, and the fixed retry reuses the load", async () => {
    const reason = "Stop 2 (Delivery): choose the address from the suggestions.";
    const { apiFetch, calls } = fakeApi([created, failure(reason, 422), stopsSaved]);
    const attempt = newSaveAttempt();

    await assert.rejects(saveTripSheet({ apiFetch, step1Payload, stopsPayload: stops, attempt }), { message: reason });

    await saveTripSheet({ apiFetch, step1Payload, stopsPayload: editedStops, attempt });

    assert.deepEqual(paths(calls), ["/shipments", "/shipments/load-1/stops", "/shipments/load-1/stops"]);
  });

  it("creates the load again only if the first try never got one", async () => {
    const { apiFetch, calls } = fakeApi([failure("Network error."), created, stopsSaved]);
    const attempt = newSaveAttempt();

    await assert.rejects(saveTripSheet({ apiFetch, step1Payload, stopsPayload: stops, attempt }), /Network error/);
    assert.equal(attempt.uuid, null);

    await saveTripSheet({ apiFetch, step1Payload, stopsPayload: stops, attempt });

    assert.deepEqual(paths(calls), ["/shipments", "/shipments", "/shipments/load-1/stops"]);
  });

  it("refuses a create answer with no load id instead of posting stops nowhere", async () => {
    const { apiFetch, calls } = fakeApi([{ status: false, message: "Monthly load allowance used up." }]);

    await assert.rejects(
      saveTripSheet({ apiFetch, step1Payload, stopsPayload: stops, attempt: newSaveAttempt() }),
      /allowance/
    );
    assert.equal(calls.length, 1);
  });
});
