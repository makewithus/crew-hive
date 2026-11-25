/**
 * apps/mobile/src/services/locationService.js
 * Location permission and coarse coordinates resolution conforming to DPDP privacy mandates.
 */

import * as Location from "expo-location";
import { LAUNCH_CITIES } from "@crew-hive/shared";

export class MobileLocationService {
  /**
   * Requests foreground location permission specifically for availability broadcast.
   * Returns rounded coarse coordinates (2 decimal places ~ 1.1km) or triggers manual fallback.
   */
  async requestCoarseLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return {
          granted: false,
          fallbackRequired: true,
          reason: "Permission denied",
        };
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Strict DPDP privacy mandate: round to 2 decimal places
      const coarseLat = Math.round(position.coords.latitude * 100) / 100;
      const coarseLng = Math.round(position.coords.longitude * 100) / 100;

      let detectedCity = "Kochi";
      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: coarseLat,
          longitude: coarseLng,
        });
        if (reverse && reverse.length > 0) {
          detectedCity = reverse[0].city || reverse[0].district || reverse[0].subregion || "Kochi";
        }
      } catch (_) {}

      return {
        granted: true,
        coarseLocation: {
          lat: coarseLat,
          lng: coarseLng,
          city: detectedCity,
        },
      };
    } catch (err) {
      return {
        granted: false,
        fallbackRequired: true,
        reason: err.message,
      };
    }
  }

  /**
   * Resolves coarse location with automatic city fallback for 18-hour availability broadcasts.
   */
  async getCoarseLocation(fallbackCity = "Kochi") {
    const safeCity = typeof fallbackCity === "object"
      ? (fallbackCity.nameEn || fallbackCity.name || "Kochi")
      : String(fallbackCity || "Kochi");

    try {
      const res = await this.requestCoarseLocation();
      if (res.granted && res.coarseLocation) {
        return {
          coarseLat: res.coarseLocation.lat,
          coarseLng: res.coarseLocation.lng,
          coarseCity: res.coarseLocation.city || safeCity,
        };
      }
    } catch (_) {}

    // Coarse coordinates for Kerala launch hubs
    const cityCoords = {
      Kochi: { coarseLat: 9.98, coarseLng: 76.30 },
      Thiruvananthapuram: { coarseLat: 8.52, coarseLng: 76.94 },
      Kozhikode: { coarseLat: 11.26, coarseLng: 75.78 },
    };
    const coords = cityCoords[safeCity] || { coarseLat: 9.98, coarseLng: 76.30 };
    return {
      coarseLat: coords.coarseLat,
      coarseLng: coords.coarseLng,
      coarseCity: safeCity,
    };
  }

  getAvailableLaunchCities() {
    return LAUNCH_CITIES;
  }

  async clearCachedLocation() {
    this._cachedLocation = null;
    return true;
  }
}

export const locationService = new MobileLocationService();
export default locationService;

