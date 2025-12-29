/**
 * Flight Path Map Component
 * Interactive map showing flight paths with coverage overlay
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { 
  MapPin, 
  Navigation, 
  Layers, 
  Download,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface FlightPath {
  id: string;
  missionId: string;
  droneId: string;
  points: Array<{
    latitude: number;
    longitude: number;
    altitude: number;
    timestamp: Date;
    speed: number;
    heading: number;
  }>;
  coverage: Array<{
    latitude: number;
    longitude: number;
    radius: number;
    quality: number;
  }>;
  waypoints: Array<{
    latitude: number;
    longitude: number;
    altitude: number;
    type: 'start' | 'waypoint' | 'end';
  }>;
}

interface FlightPathMapProps {
  missionId?: string;
  droneId?: string;
  className?: string;
  height?: number;
}

export function FlightPathMap({ 
  missionId, 
  droneId, 
  className,
  height = 400 
}: FlightPathMapProps) {
  const [flightPaths, setFlightPaths] = useState<FlightPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [showCoverage, setShowCoverage] = useState(true);
  const [showWaypoints, setShowWaypoints] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // Fetch flight path data
  useEffect(() => {
    fetchFlightPaths();
  }, [missionId, droneId]);

  // Animation loop for playback
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        setCurrentTime(prev => {
          const selectedFlightPath = flightPaths.find(p => p.id === selectedPath);
          if (selectedFlightPath && prev < selectedFlightPath.points.length - 1) {
            return prev + playbackSpeed;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, selectedPath, flightPaths]);

  const fetchFlightPaths = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (missionId) params.append('missionId', missionId);
      if (droneId) params.append('droneId', droneId);

      const response = await fetch(`/api/v1/analytics/flight-paths?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setFlightPaths(result.data);
          if (result.data.length > 0) {
            setSelectedPath(result.data[0].id);
          }
        }
      } else {
        // Use mock data for development
        setFlightPaths(getMockFlightPaths());
        if (getMockFlightPaths().length > 0) {
          setSelectedPath(getMockFlightPaths()[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching flight paths:', error);
      // Use mock data as fallback
      setFlightPaths(getMockFlightPaths());
      if (getMockFlightPaths().length > 0) {
        setSelectedPath(getMockFlightPaths()[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const getMockFlightPaths = (): FlightPath[] => [
    {
      id: 'path-1',
      missionId: 'mission-1',
      droneId: 'drone-1',
      points: generateMockFlightPoints(),
      coverage: generateMockCoverage(),
      waypoints: [
        { latitude: 37.7749, longitude: -122.4194, altitude: 100, type: 'start' },
        { latitude: 37.7849, longitude: -122.4094, altitude: 120, type: 'waypoint' },
        { latitude: 37.7949, longitude: -122.3994, altitude: 110, type: 'waypoint' },
        { latitude: 37.8049, longitude: -122.3894, altitude: 100, type: 'end' },
      ],
    },
  ];

  const generateMockFlightPoints = () => {
    const points = [];
    const startLat = 37.7749;
    const startLng = -122.4194;
    
    for (let i = 0; i < 100; i++) {
      const progress = i / 99;
      points.push({
        latitude: startLat + progress * 0.03,
        longitude: startLng + progress * 0.03,
        altitude: 100 + Math.sin(progress * Math.PI * 2) * 20,
        timestamp: new Date(Date.now() - (99 - i) * 1000),
        speed: 10 + Math.random() * 5,
        heading: progress * 360,
      });
    }
    
    return points;
  };

  const generateMockCoverage = () => {
    const coverage = [];
    const startLat = 37.7749;
    const startLng = -122.4194;
    
    for (let i = 0; i < 50; i++) {
      const progress = i / 49;
      coverage.push({
        latitude: startLat + progress * 0.03 + (Math.random() - 0.5) * 0.01,
        longitude: startLng + progress * 0.03 + (Math.random() - 0.5) * 0.01,
        radius: 20 + Math.random() * 10,
        quality: 0.7 + Math.random() * 0.3,
      });
    }
    
    return coverage;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleExport = async (format: 'kml' | 'gpx' | 'geojson') => {
    try {
      const selectedFlightPath = flightPaths.find(p => p.id === selectedPath);
      if (!selectedFlightPath) return;

      const response = await fetch('/api/v1/analytics/flight-paths/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pathId: selectedPath,
          format,
          includeCoverage: showCoverage,
          includeWaypoints: showWaypoints,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flight-path-${selectedPath}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting flight path:', error);
    }
  };

  const selectedFlightPath = flightPaths.find(p => p.id === selectedPath);
  const currentPoint = selectedFlightPath?.points[Math.floor(currentTime)] || null;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Flight Path Analysis</CardTitle>
          <CardDescription>Loading flight path data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Flight Path Analysis
            </CardTitle>
            <CardDescription>
              Interactive flight path visualization with coverage overlay
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPath} onValueChange={setSelectedPath}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select flight path" />
              </SelectTrigger>
              <SelectContent>
                {flightPaths.map(path => (
                  <SelectItem key={path.id} value={path.id}>
                    Mission {path.missionId} - Drone {path.droneId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(value) => handleExport(value as any)}>
              <SelectTrigger className="w-32">
                <Download className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kml">KML</SelectItem>
                <SelectItem value="gpx">GPX</SelectItem>
                <SelectItem value="geojson">GeoJSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPause}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(Number(v))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="4">4x</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showCoverage}
                  onChange={(e) => setShowCoverage(e.target.checked)}
                  className="rounded"
                />
                Coverage
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showWaypoints}
                  onChange={(e) => setShowWaypoints(e.target.checked)}
                  className="rounded"
                />
                Waypoints
              </label>
            </div>
          </div>

          {currentPoint && (
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline">
                Alt: {currentPoint.altitude.toFixed(0)}m
              </Badge>
              <Badge variant="outline">
                Speed: {currentPoint.speed.toFixed(1)} m/s
              </Badge>
              <Badge variant="outline">
                Heading: {currentPoint.heading.toFixed(0)}°
              </Badge>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {selectedFlightPath && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{Math.round((currentTime / (selectedFlightPath.points.length - 1)) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(currentTime / (selectedFlightPath.points.length - 1)) * 100}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Map Container */}
        <div 
          ref={mapRef}
          className="w-full bg-gray-100 rounded-lg border relative overflow-hidden"
          style={{ height }}
        >
          {/* Placeholder for actual map implementation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Interactive Map</p>
              <p className="text-sm text-gray-500">
                Flight path visualization would be rendered here
              </p>
              {selectedFlightPath && (
                <div className="mt-4 text-sm">
                  <p>Points: {selectedFlightPath.points.length}</p>
                  <p>Coverage Areas: {selectedFlightPath.coverage.length}</p>
                  <p>Waypoints: {selectedFlightPath.waypoints.length}</p>
                </div>
              )}
            </div>
          </div>

          {/* Overlay Controls */}
          <div className="absolute top-4 right-4">
            <Button variant="outline" size="sm">
              <Layers className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Statistics */}
        {selectedFlightPath && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {selectedFlightPath.points.length}
              </div>
              <div className="text-sm text-gray-600">Data Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {selectedFlightPath.coverage.length}
              </div>
              <div className="text-sm text-gray-600">Coverage Areas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {selectedFlightPath.waypoints.length}
              </div>
              <div className="text-sm text-gray-600">Waypoints</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(selectedFlightPath.coverage.reduce((sum, c) => sum + c.quality, 0) / selectedFlightPath.coverage.length * 100)}%
              </div>
              <div className="text-sm text-gray-600">Avg Quality</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FlightPathMap;