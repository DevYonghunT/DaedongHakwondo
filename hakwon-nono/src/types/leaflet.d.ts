/* eslint-disable @typescript-eslint/no-explicit-any */
import 'leaflet';

declare global {
  interface Window {
    L: typeof import('leaflet') & {
      markerClusterGroup: (options?: any) => any;
    };
  }
}
