"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: "landmark" | "address" | "user";
  category?: string;
}

interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  onClick?: (lat: number, lng: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function Map({ center = [-4.4419, 15.2663], zoom = 13, markers = [], onMarkerClick, onClick, className, style }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || mapInstanceRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default;
      if (!mapRef.current) return;

      const map = L.map(mapRef.current, {
        center,
        zoom,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>",
        maxZoom: 19,
      }).addTo(map);

      if (onClick) {
        map.on("click", (e: unknown) => {
          const evt = e as { latlng: { lat: number; lng: number } };
          onClick(evt.latlng.lat, evt.latlng.lng);
        });
      }

      mapInstanceRef.current = map;
    });

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (markers.length === 0) return;

    import("leaflet").then((mod) => {
      const L = mod.default;

      const defaultIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const colors: Record<string, string> = {
        landmark: "#d97706",
        address: "#2563eb",
        user: "#16a34a",
      };

      markers.forEach((m) => {
        const marker = L.marker([m.lat, m.lng], {
          icon: m.type === "user"
            ? L.divIcon({ className: "", html: `<div style="width:16px;height:16px;background:${colors[m.type]};border:3px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>` })
            : defaultIcon,
        });

        const categoryLabel = m.category ?? m.type;
        marker.bindPopup(`<b>${m.label}</b><br/><span style="font-size:0.85em;color:#666">${categoryLabel}</span>`);

        if (onMarkerClick) {
          marker.on("click", () => onMarkerClick(m));
        }

        marker.addTo(map);
        markersRef.current.push(marker);
      });
    });
  }, [markers, onMarkerClick]);

  return <div ref={mapRef} className={className} style={style} />;
}
