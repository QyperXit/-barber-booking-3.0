/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as appointments from "../appointments.js";
import type * as availabilityTemplates from "../availabilityTemplates.js";
import type * as barbers from "../barbers.js";
import type * as bookings from "../bookings.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as migrations from "../migrations.js";
import type * as slots from "../slots.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  appointments: typeof appointments;
  availabilityTemplates: typeof availabilityTemplates;
  barbers: typeof barbers;
  bookings: typeof bookings;
  constants: typeof constants;
  crons: typeof crons;
  migrations: typeof migrations;
  slots: typeof slots;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
