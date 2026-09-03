declare module "leaflet" {
  export interface MapOptions {
    center?: LatLngExpression;
    zoom?: number;
    zoomControl?: boolean;
    scrollWheelZoom?: boolean;
    attributionControl?: boolean;
  }

  export interface MarkerOptions {
    draggable?: boolean;
    icon?: Icon | DivIcon;
  }

  export interface TileLayerOptions {
    attribution?: string;
    maxZoom?: number;
  }

  export interface GeoJSONOptions {
    pointToLayer?: (feature: unknown, latlng: LatLng) => Marker | undefined;
    onEachFeature?: (feature: unknown, layer: Layer) => void;
  }

  export interface LatLng {
    lat: number;
    lng: number;
  }

  export type LatLngExpression = [number, number] | { lat: number; lng: number };

  export interface Point {
    x: number;
    y: number;
  }

  export interface IconOptions {
    iconUrl?: string;
    iconRetinaUrl?: string;
    shadowUrl?: string;
    iconSize?: Point | [number, number];
    iconAnchor?: Point | [number, number];
    popupAnchor?: Point | [number, number];
    shadowSize?: Point | [number, number];
    className?: string;
  }

  export interface DivIconOptions {
    html?: string;
    iconSize?: Point | [number, number];
    iconAnchor?: Point | [number, number];
    className?: string;
  }

  export class Icon {
    constructor(options: IconOptions);
    static Default: Icon;
  }

  export class DivIcon extends Icon {
    constructor(options?: DivIconOptions);
  }

  export class Marker {
    constructor(latlng: LatLngExpression, options?: MarkerOptions);
    addTo(map: Map): this;
    bindPopup(content: string): this;
    openPopup(): this;
    on(event: string, fn: (...args: unknown[]) => void): this;
    getLatLng(): LatLng;
    setLatLng(latlng: LatLngExpression): this;
    remove(): void;
  }

  export class TileLayer {
    constructor(urlTemplate: string, options?: TileLayerOptions);
    addTo(map: Map): this;
    remove(): this;
  }

  export interface Layer {
    on(event: string, fn: (...args: unknown[]) => void): this;
    bindPopup(content: string): this;
    addTo(map: Map): this;
    remove(): this;
    feature?: unknown;
  }

  export class GeoJSON {
    constructor(geojson: unknown, options?: GeoJSONOptions);
    addTo(map: Map): this;
    remove(): this;
  }

  export class Map {
    constructor(element: string | HTMLElement, options?: MapOptions);
    setView(center: LatLngExpression, zoom?: number): this;
    setZoom(zoom: number): this;
    on(event: string, fn: (...args: unknown[]) => void): this;
    remove(): void;
    invalidateSize(): this;
    eachLayer(fn: (layer: Layer) => void): this;
    closePopup(): this;
    getCenter(): LatLng;
    getZoom(): number;
  }

  export function icon(options: IconOptions): Icon;
  export function divIcon(options?: DivIconOptions): DivIcon;
  export function marker(latlng: LatLngExpression, options?: MarkerOptions): Marker;
  export function tileLayer(urlTemplate: string, options?: TileLayerOptions): TileLayer;
  export function geoJSON(geojson: unknown, options?: GeoJSONOptions): GeoJSON;
  export function map(element: string | HTMLElement, options?: MapOptions): Map;
  export function latLng(lat: number, lng: number): LatLng;

  const L: {
    map: typeof map;
    marker: typeof marker;
    tileLayer: typeof tileLayer;
    geoJSON: typeof geoJSON;
    icon: typeof icon;
    divIcon: typeof divIcon;
    latLng: typeof latLng;
    Icon: typeof Icon;
    DivIcon: typeof DivIcon;
    Marker: typeof Marker;
    Map: typeof Map;
    TileLayer: typeof TileLayer;
    GeoJSON: typeof GeoJSON;
    LatLng: typeof LatLng;
    Point: typeof Point;
  };
  export default L;
}
