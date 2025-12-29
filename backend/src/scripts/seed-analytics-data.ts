/**
 * Seed Analytics Data Script
 * Creates sample analytics data for testing and development
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';

const prisma = new PrismaClient();

async function seedAnalyticsData() {
  try {
    logger.info('Starting analytics data seeding...');

    // First, let's check if we have any existing missions to work with
    const existingMissions = await prisma.mission.findMany({
      take: 5,
      include: {
        drone: true,
        site: true,
        organization: true
      }
    });

    if (existingMissions.length === 0) {
      logger.info('No existing missions found. Creating sample missions first...');
      await createSampleMissions();
    }

    // Get missions to create analytics for
    const missions = await prisma.mission.findMany({
      take: 10,
      include: {
        drone: true,
        site: true,
        organization: true
      }
    });

    logger.info(`Creating analytics data for ${missions.length} missions...`);

    // Create mission analytics for each mission
    for (const mission of missions) {
      await createMissionAnalytics(mission);
    }

    // Create fleet metrics
    await createFleetMetrics();

    // Create organization metrics
    await createOrganizationMetrics();

    // Create site metrics
    await createSiteMetrics();

    // Create sample performance alerts
    await createPerformanceAlerts();

    logger.info('Analytics data seeding completed successfully!');

  } catch (error) {
    logger.error('Error seeding analytics data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createSampleMissions() {
  // First ensure we have an organization and site
  let organization = await prisma.organization.findFirst();
  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: 'Sample Drone Operations Inc.'
      }
    });
  }

  let site = await prisma.site.findFirst();
  if (!site) {
    site = await prisma.site.create({
      data: {
        orgId: organization.id,
        name: 'Main Operations Site',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles'
      }
    });
  }

  let drone = await prisma.drone.findFirst();
  if (!drone) {
    drone = await prisma.drone.create({
      data: {
        siteId: site.id,
        serialNumber: 'DRN-001-TEST',
        model: 'DJI Phantom 4 Pro',
        status: 'AVAILABLE',
        batteryLevel: 85,
        homeLatitude: site.latitude,
        homeLongitude: site.longitude,
        firmwareVersion: '1.2.3'
      }
    });
  }

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        orgId: organization.id,
        email: 'operator@example.com',
        password: 'hashed_password',
        name: 'Test Operator',
        role: 'OPERATOR'
      }
    });
  }

  // Create sample missions
  const missionData = [
    {
      name: 'Agricultural Survey - Field A',
      status: 'COMPLETED' as const,
      flightPattern: 'CROSSHATCH' as const,
      surveyArea: {
        type: 'Polygon',
        coordinates: [[
          [-122.4194, 37.7749],
          [-122.4094, 37.7749],
          [-122.4094, 37.7849],
          [-122.4194, 37.7849],
          [-122.4194, 37.7749]
        ]]
      },
      parameters: {
        altitude: 100,
        speed: 10,
        overlap: 80,
        sidelap: 70
      },
      scheduledStart: new Date('2024-12-20T09:00:00Z'),
      actualStart: new Date('2024-12-20T09:15:00Z'),
      actualEnd: new Date('2024-12-20T10:45:00Z'),
      estimatedDuration: 90,
      estimatedDistance: 5.2
    },
    {
      name: 'Infrastructure Inspection - Bridge',
      status: 'COMPLETED' as const,
      flightPattern: 'PERIMETER' as const,
      surveyArea: {
        type: 'Polygon',
        coordinates: [[
          [-122.4200, 37.7750],
          [-122.4180, 37.7750],
          [-122.4180, 37.7760],
          [-122.4200, 37.7760],
          [-122.4200, 37.7750]
        ]]
      },
      parameters: {
        altitude: 50,
        speed: 8,
        overlap: 85,
        sidelap: 75
      },
      scheduledStart: new Date('2024-12-21T14:00:00Z'),
      actualStart: new Date('2024-12-21T14:05:00Z'),
      actualEnd: new Date('2024-12-21T14:35:00Z'),
      estimatedDuration: 30,
      estimatedDistance: 2.1
    }
  ];

  for (const data of missionData) {
    await prisma.mission.create({
      data: {
        ...data,
        orgId: organization.id,
        siteId: site.id,
        droneId: drone.id,
        createdBy: user.id
      }
    });
  }
}

async function createMissionAnalytics(mission: any) {
  // Generate realistic analytics data based on mission parameters
  const duration = mission.actualEnd && mission.actualStart 
    ? Math.floor((new Date(mission.actualEnd).getTime() - new Date(mission.actualStart).getTime()) / 60000)
    : mission.estimatedDuration || 60;

  const distance = mission.estimatedDistance || (duration * 0.05); // Rough estimate
  const areaSurveyed = distance * 0.1; // Rough estimate based on distance
  const coverageEfficiency = 85 + Math.random() * 10; // 85-95%
  const batteryConsumption = Math.min(100, duration * 0.8 + Math.random() * 10);
  const averageSpeed = distance / (duration / 60); // km/h converted to rough m/s
  const qualityScore = 75 + Math.random() * 20; // 75-95

  // Generate sample flight path data
  const flightPathData = generateSampleFlightPath(mission, duration);
  
  // Generate sample weather conditions
  const weatherConditions = {
    temperature: 18 + Math.random() * 10, // 18-28°C
    humidity: 40 + Math.random() * 30, // 40-70%
    windSpeed: Math.random() * 8, // 0-8 m/s
    windDirection: Math.random() * 360,
    visibility: 8 + Math.random() * 7, // 8-15 km
    conditions: ['clear', 'partly_cloudy', 'overcast'][Math.floor(Math.random() * 3)],
    impact: ['none', 'minor'][Math.floor(Math.random() * 2)]
  };

  await prisma.missionAnalytics.create({
    data: {
      missionId: mission.id,
      actualDuration: duration,
      actualDistance: distance,
      areaSurveyed: areaSurveyed,
      coverageEfficiency: coverageEfficiency,
      batteryConsumption: batteryConsumption,
      averageSpeed: averageSpeed,
      averageAltitude: mission.parameters?.altitude || 100,
      maxAltitude: (mission.parameters?.altitude || 100) + 10,
      minAltitude: (mission.parameters?.altitude || 100) - 5,
      telemetryPoints: Math.floor(duration * 2), // 2 points per minute
      qualityScore: qualityScore,
      weatherConditions: weatherConditions,
      flightPathData: flightPathData,
      coverageGaps: [],
      overlapAreas: []
    }
  });

  // Create coverage analysis
  const missionAnalytics = await prisma.missionAnalytics.findUnique({
    where: { missionId: mission.id }
  });

  if (missionAnalytics) {
    await prisma.coverageAnalysis.create({
      data: {
        missionAnalyticsId: missionAnalytics.id,
        plannedArea: areaSurveyed * 1.1, // Slightly larger planned area
        actualCoverage: areaSurveyed,
        coveragePercentage: coverageEfficiency,
        gapAreas: [],
        overlapAreas: [],
        overlapEfficiency: 85 + Math.random() * 10,
        patternCompliance: 90 + Math.random() * 8,
        qualityScore: qualityScore,
        recommendations: [
          'Consider increasing overlap in windy conditions',
          'Optimize flight speed for better image quality'
        ],
        industryStandards: [
          {
            standard: 'ISO 21500',
            requirement: 'Minimum 80% overlap',
            compliance: true,
            score: 95
          }
        ]
      }
    });
  }
}

function generateSampleFlightPath(mission: any, durationMinutes: number): any[] {
  const points = [];
  const totalPoints = Math.floor(durationMinutes / 2); // One point every 2 minutes
  const startTime = new Date(mission.actualStart || mission.scheduledStart);
  
  for (let i = 0; i < totalPoints; i++) {
    const timestamp = new Date(startTime.getTime() + (i * 2 * 60 * 1000));
    const batteryLevel = 100 - (i / totalPoints) * (mission.batteryConsumption || 30);
    
    points.push({
      timestamp: timestamp,
      latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
      altitude: (mission.parameters?.altitude || 100) + (Math.random() - 0.5) * 10,
      speed: 8 + Math.random() * 4, // 8-12 m/s
      heading: Math.random() * 360,
      batteryLevel: Math.max(0, batteryLevel)
    });
  }
  
  return points;
}

async function createFleetMetrics() {
  const sites = await prisma.site.findMany({
    include: { drones: true }
  });

  const today = new Date();
  const dates = [];
  
  // Create metrics for the last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date);
  }

  for (const site of sites) {
    for (const drone of site.drones) {
      for (const date of dates) {
        const totalFlightTime = Math.floor(Math.random() * 240); // 0-4 hours
        const totalMissions = Math.floor(totalFlightTime / 60); // Roughly 1 hour per mission
        const successfulMissions = Math.floor(totalMissions * (0.85 + Math.random() * 0.1));
        const failedMissions = totalMissions - successfulMissions;

        await prisma.fleetMetrics.create({
          data: {
            siteId: site.id,
            droneId: drone.id,
            date: date,
            totalFlightTime: totalFlightTime,
            totalDistance: totalFlightTime * 0.1, // Rough estimate
            totalMissions: totalMissions,
            successfulMissions: successfulMissions,
            failedMissions: failedMissions,
            averageMissionTime: totalMissions > 0 ? totalFlightTime / totalMissions : null,
            batteryUsage: totalFlightTime * 0.5, // Rough estimate
            maintenanceEvents: Math.random() < 0.1 ? 1 : 0, // 10% chance per day
            downtimeMinutes: Math.floor(Math.random() * 60),
            utilizationRate: Math.min(100, (totalFlightTime / 480) * 100), // Out of 8 hours
            performanceScore: 70 + Math.random() * 25 // 70-95
          }
        });
      }
    }
  }
}

async function createOrganizationMetrics() {
  const organizations = await prisma.organization.findMany();
  const today = new Date();
  
  for (const org of organizations) {
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const totalSurveys = Math.floor(Math.random() * 20) + 5; // 5-25 surveys per day
      const totalAreaCovered = totalSurveys * (0.5 + Math.random() * 2); // 0.5-2.5 km² per survey
      const totalFlightTime = totalSurveys * (30 + Math.random() * 60); // 30-90 minutes per survey
      
      await prisma.organizationMetrics.create({
        data: {
          orgId: org.id,
          date: date,
          totalSurveys: totalSurveys,
          totalAreaCovered: totalAreaCovered,
          totalFlightTime: totalFlightTime,
          activeDrones: 3 + Math.floor(Math.random() * 5), // 3-8 active drones
          averageEfficiency: 80 + Math.random() * 15, // 80-95%
          costPerSurvey: 150 + Math.random() * 100, // $150-250 per survey
          costPerArea: 50 + Math.random() * 30, // $50-80 per km²
          successRate: 85 + Math.random() * 12, // 85-97%
          seasonalFactor: 0.9 + Math.random() * 0.2, // 0.9-1.1
          weatherImpact: Math.random() * 15 // 0-15% weather delays
        }
      });
    }
  }
}

async function createSiteMetrics() {
  const sites = await prisma.site.findMany();
  const today = new Date();
  
  for (const site of sites) {
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const totalSurveys = Math.floor(Math.random() * 10) + 2; // 2-12 surveys per day
      const totalAreaCovered = totalSurveys * (0.3 + Math.random() * 1.5); // 0.3-1.8 km² per survey
      const totalFlightTime = totalSurveys * (25 + Math.random() * 50); // 25-75 minutes per survey
      
      await prisma.siteMetrics.create({
        data: {
          siteId: site.id,
          date: date,
          totalSurveys: totalSurveys,
          totalAreaCovered: totalAreaCovered,
          totalFlightTime: totalFlightTime,
          activeDrones: 1 + Math.floor(Math.random() * 3), // 1-4 active drones
          averageEfficiency: 75 + Math.random() * 20, // 75-95%
          successRate: 80 + Math.random() * 15, // 80-95%
          weatherDelays: Math.floor(Math.random() * 120), // 0-2 hours of delays
          maintenanceDowntime: Math.floor(Math.random() * 60), // 0-1 hour downtime
          utilizationRate: 60 + Math.random() * 30, // 60-90%
          performanceRank: 1 + Math.floor(Math.random() * 5), // Rank 1-5
          benchmarkScore: 70 + Math.random() * 25 // 70-95
        }
      });
    }
  }
}

async function createPerformanceAlerts() {
  const drones = await prisma.drone.findMany();
  const sites = await prisma.site.findMany();
  const organizations = await prisma.organization.findMany();
  
  const alertTypes = [
    'MAINTENANCE_DUE',
    'PERFORMANCE_DEGRADATION',
    'UTILIZATION_LOW',
    'UTILIZATION_HIGH',
    'COVERAGE_POOR',
    'EFFICIENCY_DROP',
    'BATTERY_ISSUE'
  ];
  
  const severities = ['INFO', 'WARNING', 'CRITICAL'];
  
  // Create alerts for drones
  for (const drone of drones.slice(0, 3)) { // Just first 3 drones
    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    
    await prisma.performanceAlerts.create({
      data: {
        alertType: alertType as any,
        severity: severity as any,
        entityType: 'DRONE',
        entityId: drone.id,
        title: `${alertType.replace('_', ' ')} - ${drone.serialNumber}`,
        message: `Drone ${drone.serialNumber} requires attention: ${alertType.toLowerCase().replace('_', ' ')}`,
        metadata: {
          droneModel: drone.model,
          batteryLevel: drone.batteryLevel,
          lastSeen: drone.lastSeen
        },
        threshold: Math.random() * 100,
        actualValue: Math.random() * 100,
        isResolved: Math.random() < 0.3 // 30% chance of being resolved
      }
    });
  }
}

// Run the seeding function
if (require.main === module) {
  seedAnalyticsData()
    .then(() => {
      console.log('Analytics data seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding analytics data:', error);
      process.exit(1);
    });
}

export { seedAnalyticsData };