import React from "react";
import type maplibregl from "maplibre-gl";
interface UseNwsAlertsParams {
  lat?: number;
  lon?: number;
  severity?: string;
}
interface NwsAlertFeature {
  id: string;
  geometry?: GeoJSON.Geometry;
  properties: {
    event?: string;
    severity?: string;
    headline?: string;
    sent?: string;
  };
}
interface NwsAlertsResponse {
  features?: NwsAlertFeature[];
}
export function useNwsAlerts({
  lat,
  lon,
  severity = "actual",
}: UseNwsAlertsParams) {
  const [alerts, setAlerts] = React.useState<NwsAlertFeature[]>([]);
  React.useEffect(() => {
    if (lat == null || lon == null) {
      return undefined;
    }
    let cancelled = false;
    const controller = new AbortController();
    const url = new URL("https://api.weather.gov/alerts/active");
    url.searchParams.set("status", "actual");
    url.searchParams.set("message_type", severity);
    url.searchParams.set("point", `${lat},${lon}`);
    fetch(url.toString(), {
      headers: { Accept: "application/geo+json" },
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((json: NwsAlertsResponse) => {
        if (!cancelled && Array.isArray(json.features)) {
          setAlerts(json.features);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAlerts([]);
        }
      });
    return () => {
      cancelled = true;
      controller.abort("Weather alerts cleanup");
    };
  }, [lat, lon, severity]);
  return alerts;
}
function clearExistingAlertLayers(map: maplibregl.Map) {
  if (map.getLayer("nws-alerts-fill")) {
    map.removeLayer("nws-alerts-fill");
  }
  if (map.getLayer("nws-alerts-line")) {
    map.removeLayer("nws-alerts-line");
  }
  if (map.getSource("nws-alerts")) {
    map.removeSource("nws-alerts");
  }
}
export function addAlertsToMap(map: maplibregl.Map, alerts: NwsAlertFeature[]) {
  if (!map || !map.isStyleLoaded()) {
    return;
  }
  clearExistingAlertLayers(map);
  const featureCollection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: alerts
      .filter((alert) => Boolean(alert.geometry))
      .map((alert) => ({
        type: "Feature",
        geometry: alert.geometry as GeoJSON.Geometry,
        properties: {
          id: alert.id,
          event: alert.properties.event,
          severity: alert.properties.severity,
          headline: alert.properties.headline,
          sent: alert.properties.sent,
        },
      })),
  };
  if (!featureCollection.features.length) {
    return;
  }
  map.addSource("nws-alerts", { type: "geojson", data: featureCollection });
  map.addLayer({
    id: "nws-alerts-fill",
    type: "fill",
    source: "nws-alerts",
    paint: {
      "fill-color": [
        "match",
        ["get", "severity"],
        "Extreme",
        "#d100d1",
        "Severe",
        "#ff3b3b",
        "Moderate",
        "#ffb200",
        "Minor",
        "#60b8ff",
        "#8dd3ff",
      ],
      "fill-opacity": 0.2,
    },
  });
  map.addLayer({
    id: "nws-alerts-line",
    type: "line",
    source: "nws-alerts",
    paint: {
      "line-color": "#ffffff",
      "line-opacity": 0.45,
      "line-width": 1.2,
      "line-dasharray": [2, 2],
    },
  });
}
