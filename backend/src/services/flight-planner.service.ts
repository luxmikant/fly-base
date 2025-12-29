import { FlightPattern } from '@prisma/client';
import { logger } from '../lib/logger';

export interface Waypoint {
  latitude: number;
  longitude: number;
  altitude: number;
  index: number;
}

export interface FlightPlan {
  waypoints: Waypoint[];
  estimatedDuration: number; // seconds
  estimatedDistance: number; // meters
  totalWaypoints: number;
}

export interface FlightParameters {
  altitude: number;
  speed: number;
  overlap: number;
  gimbalAngle: number;
}

export class FlightPlannerService {
  private static instance: FlightPlannerService;
  private readonly DRONE_FOV_METERS = 50; // Camera field of view at reference altitude

  private constructor() {}

  static getInstance(): FlightPlannerService {
    if (!FlightPlannerService.instance) {
      FlightPlannerService.instance = new FlightPlannerService();
    }
    return FlightPlannerService.instance;
  }

  generateFlightPlan(
    surveyArea: GeoJSON.Polygon,
    pattern: FlightPattern,
    params: FlightParameters
  ): FlightPlan {
    switch (pattern) {
      case FlightPattern.CROSSHATCH:
        return this.generateCrosshatchPattern(surveyArea, params);
      case FlightPattern.PERIMETER:
        return this.generatePerimeterPattern(surveyArea, params);
      case FlightPattern.SPIRAL:
        return this.generateSpiralPattern(surveyArea, params);
      default:
        throw new Error(`Unknown flight pattern: ${pattern}`);
    }
  }

  private generateCrosshatchPattern(
    polygon: GeoJSON.Polygon,
    params: FlightParameters
  ): FlightPlan {
    const coords = polygon.coordinates[0];
    const bbox = this.getBoundingBox(coords);
    
    // Calculate line spacing based on overlap
    const coverageWidth = this.DRONE_FOV_METERS * (1 - params.overlap / 100);
    const spacingDegrees = this.metersToDegreesLat(coverageWidth);

    const waypoints: Waypoint[] = [];
    let index = 0;
    let direction = 1;

    // Generate horizontal lines (0° pass)
    let lat = bbox.minLat;
    while (lat <= bbox.maxLat) {
      const intersections = this.getLinePolygonIntersections(
        coords,
        lat,
        'horizontal'
      );

      if (intersections.length >= 2) {
        const [start, end] = direction === 1 
          ? [intersections[0], intersections[intersections.length - 1]]
          : [intersections[intersections.length - 1], intersections[0]];

        waypoints.push({
          latitude: lat,
          longitude: start,
          altitude: params.altitude,
          index: index++,
        });
        waypoints.push({
          latitude: lat,
          longitude: end,
          altitude: params.altitude,
          index: index++,
        });

        direction *= -1;
      }
      lat += spacingDegrees;
    }

    // Generate vertical lines (90° pass)
    const spacingDegreesLon = this.metersToDegreesLon(coverageWidth, bbox.centerLat);
    let lon = bbox.minLon;
    direction = 1;

    while (lon <= bbox.maxLon) {
      const intersections = this.getLinePolygonIntersections(
        coords,
        lon,
        'vertical'
      );

      if (intersections.length >= 2) {
        const [start, end] = direction === 1
          ? [intersections[0], intersections[intersections.length - 1]]
          : [intersections[intersections.length - 1], intersections[0]];

        waypoints.push({
          latitude: start,
          longitude: lon,
          altitude: params.altitude,
          index: index++,
        });
        waypoints.push({
          latitude: end,
          longitude: lon,
          altitude: params.altitude,
          index: index++,
        });

        direction *= -1;
      }
      lon += spacingDegreesLon;
    }

    // Calculate estimates
    const totalDistance = this.calculateTotalDistance(waypoints);
    const estimatedDuration = Math.ceil(totalDistance / params.speed);

    logger.debug('Generated crosshatch flight plan', {
      waypointCount: waypoints.length,
      totalDistance,
      estimatedDuration,
    });

    return {
      waypoints,
      estimatedDuration,
      estimatedDistance: totalDistance,
      totalWaypoints: waypoints.length,
    };
  }

  private generatePerimeterPattern(
    polygon: GeoJSON.Polygon,
    params: FlightParameters
  ): FlightPlan {
    const coords = polygon.coordinates[0];
    const waypoints: Waypoint[] = coords.map((coord, index) => ({
      latitude: coord[1],
      longitude: coord[0],
      altitude: params.altitude,
      index,
    }));

    const totalDistance = this.calculateTotalDistance(waypoints);
    const estimatedDuration = Math.ceil(totalDistance / params.speed);

    return {
      waypoints,
      estimatedDuration,
      estimatedDistance: totalDistance,
      totalWaypoints: waypoints.length,
    };
  }

  private generateSpiralPattern(
    polygon: GeoJSON.Polygon,
    params: FlightParameters
  ): FlightPlan {
    const coords = polygon.coordinates[0];
    const centroid = this.getCentroid(coords);
    const bbox = this.getBoundingBox(coords);
    
    const maxRadius = Math.max(
      this.haversineDistance(centroid.lat, centroid.lon, bbox.maxLat, centroid.lon),
      this.haversineDistance(centroid.lat, centroid.lon, centroid.lat, bbox.maxLon)
    );

    const coverageWidth = this.DRONE_FOV_METERS * (1 - params.overlap / 100);
    const waypoints: Waypoint[] = [];
    let index = 0;
    let radius = coverageWidth;
    let angle = 0;

    while (radius <= maxRadius) {
      const lat = centroid.lat + this.metersToDegreesLat(radius * Math.cos(angle));
      const lon = centroid.lon + this.metersToDegreesLon(radius * Math.sin(angle), centroid.lat);

      if (this.isPointInPolygon([lon, lat], coords)) {
        waypoints.push({
          latitude: lat,
          longitude: lon,
          altitude: params.altitude,
          index: index++,
        });
      }

      angle += 0.2; // Radians per step
      radius += coverageWidth * 0.1; // Gradual expansion
    }

    const totalDistance = this.calculateTotalDistance(waypoints);
    const estimatedDuration = Math.ceil(totalDistance / params.speed);

    return {
      waypoints,
      estimatedDuration,
      estimatedDistance: totalDistance,
      totalWaypoints: waypoints.length,
    };
  }

  // Utility functions
  private getBoundingBox(coords: number[][]): {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
    centerLat: number;
    centerLon: number;
  } {
    const lats = coords.map(c => c[1]);
    const lons = coords.map(c => c[0]);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    return {
      minLat,
      maxLat,
      minLon,
      maxLon,
      centerLat: (minLat + maxLat) / 2,
      centerLon: (minLon + maxLon) / 2,
    };
  }

  private getCentroid(coords: number[][]): { lat: number; lon: number } {
    const n = coords.length - 1; // Exclude closing point
    let lat = 0, lon = 0;
    
    for (let i = 0; i < n; i++) {
      lat += coords[i][1];
      lon += coords[i][0];
    }

    return { lat: lat / n, lon: lon / n };
  }

  private getLinePolygonIntersections(
    coords: number[][],
    value: number,
    direction: 'horizontal' | 'vertical'
  ): number[] {
    const intersections: number[] = [];
    const n = coords.length - 1;

    for (let i = 0; i < n; i++) {
      const [x1, y1] = coords[i];
      const [x2, y2] = coords[i + 1];

      if (direction === 'horizontal') {
        if ((y1 <= value && y2 >= value) || (y1 >= value && y2 <= value)) {
          if (y1 !== y2) {
            const x = x1 + (value - y1) * (x2 - x1) / (y2 - y1);
            intersections.push(x);
          }
        }
      } else {
        if ((x1 <= value && x2 >= value) || (x1 >= value && x2 <= value)) {
          if (x1 !== x2) {
            const y = y1 + (value - x1) * (y2 - y1) / (x2 - x1);
            intersections.push(y);
          }
        }
      }
    }

    return intersections.sort((a, b) => a - b);
  }

  private isPointInPolygon(point: number[], polygon: number[][]): boolean {
    const [x, y] = point;
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  private calculateTotalDistance(waypoints: Waypoint[]): number {
    let total = 0;
    for (let i = 1; i < waypoints.length; i++) {
      total += this.haversineDistance(
        waypoints[i - 1].latitude,
        waypoints[i - 1].longitude,
        waypoints[i].latitude,
        waypoints[i].longitude
      );
    }
    return total;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) ** 2;
    
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private metersToDegreesLat(meters: number): number {
    return meters / 111320;
  }

  private metersToDegreesLon(meters: number, latitude: number): number {
    return meters / (111320 * Math.cos(this.toRadians(latitude)));
  }

  private toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }
}

export const flightPlannerService = FlightPlannerService.getInstance();
