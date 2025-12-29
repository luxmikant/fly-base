import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate, registerDroneSchema, updateDroneStatusSchema, paginationSchema } from '../middleware/validation';
import { droneService } from '../services/drone.service';
import { logger } from '../lib/logger';
import { DroneStatus } from '@prisma/client';

const router = Router();

// List drones
router.get(
  '/',
  authenticate,
  validate(paginationSchema),
  async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query as any;
      const { siteId, status } = req.query;

      const result = await droneService.listDrones(
        {
          siteId: siteId as string,
          status: status as DroneStatus,
        },
        { page: parseInt(page) || 1, limit: parseInt(limit) || 20 }
      );

      res.json({
        drones: result.drones,
        pagination: {
          page: parseInt(page) || 1,
          limit: parseInt(limit) || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (parseInt(limit) || 20)),
        },
      });
    } catch (error: any) {
      logger.error('Failed to list drones', error);
      res.status(500).json({ error: 'Failed to fetch drones' });
    }
  }
);

// Get drone details
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const drone = await droneService.getDrone(req.params.id);
    
    if (!drone) {
      res.status(404).json({ error: 'Drone not found' });
      return;
    }

    res.json(drone);
  } catch (error: any) {
    logger.error('Failed to get drone', error);
    res.status(500).json({ error: 'Failed to fetch drone' });
  }
});

// Register new drone
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(registerDroneSchema),
  async (req: Request, res: Response) => {
    try {
      const drone = await droneService.registerDrone(req.body);
      res.status(201).json(drone);
    } catch (error: any) {
      logger.error('Failed to register drone', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Update drone status
router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(updateDroneStatusSchema),
  async (req: Request, res: Response) => {
    try {
      const drone = await droneService.updateDroneStatus(
        req.params.id,
        req.body.status as DroneStatus
      );
      res.json(drone);
    } catch (error: any) {
      logger.error('Failed to update drone status', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Decommission drone
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      await droneService.decommissionDrone(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      logger.error('Failed to decommission drone', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Get latest telemetry for drone
router.get('/:id/telemetry/latest', authenticate, async (req: Request, res: Response) => {
  try {
    const drone = await droneService.getDrone(req.params.id);
    
    if (!drone) {
      res.status(404).json({ error: 'Drone not found' });
      return;
    }

    res.json({
      droneId: drone.id,
      currentLocation: drone.currentLocation,
      batteryLevel: drone.batteryLevel,
      status: drone.status,
      lastSeen: drone.lastSeen,
    });
  } catch (error: any) {
    logger.error('Failed to get drone telemetry', error);
    res.status(500).json({ error: 'Failed to fetch telemetry' });
  }
});

// Get fleet status for a site
router.get('/site/:siteId/fleet-status', authenticate, async (req: Request, res: Response) => {
  try {
    const status = await droneService.getFleetStatus(req.params.siteId);
    res.json(status);
  } catch (error: any) {
    logger.error('Failed to get fleet status', error);
    res.status(500).json({ error: 'Failed to fetch fleet status' });
  }
});

// Get available drones for a site
router.get('/site/:siteId/available', authenticate, async (req: Request, res: Response) => {
  try {
    const minBattery = parseInt(req.query.minBattery as string) || 30;
    const drones = await droneService.getAvailableDrones(req.params.siteId, minBattery);
    res.json(drones);
  } catch (error: any) {
    logger.error('Failed to get available drones', error);
    res.status(500).json({ error: 'Failed to fetch available drones' });
  }
});

// Get nearby drones
router.get('/nearby', authenticate, async (req: Request, res: Response) => {
  try {
    const { lat, lon, radius } = req.query;
    
    if (!lat || !lon) {
      res.status(400).json({ error: 'lat and lon are required' });
      return;
    }

    const drones = await droneService.getNearbyDrones(
      parseFloat(lat as string),
      parseFloat(lon as string),
      parseFloat(radius as string) || 10
    );

    res.json(drones);
  } catch (error: any) {
    logger.error('Failed to get nearby drones', error);
    res.status(500).json({ error: 'Failed to fetch nearby drones' });
  }
});

export default router;
