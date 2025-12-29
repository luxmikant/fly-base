import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate, createMissionSchema, missionCommandSchema, paginationSchema } from '../middleware/validation';
import { missionService } from '../services/mission.service';
import { commandService } from '../services/command.service';
import { telemetryService } from '../services/telemetry.service';
import { logger } from '../lib/logger';
import { FlightPattern, MissionStatus } from '@prisma/client';
import { z } from 'zod';

const router = Router();

// Create mission
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(createMissionSchema),
  async (req: Request, res: Response) => {
    try {
      const mission = await missionService.createMission({
        orgId: req.user!.orgId,
        siteId: req.body.siteId,
        droneId: req.body.droneId,
        name: req.body.name,
        surveyArea: req.body.surveyArea,
        flightPattern: req.body.flightPattern as FlightPattern,
        parameters: req.body.parameters,
        scheduledStart: req.body.scheduledStart ? new Date(req.body.scheduledStart) : undefined,
        createdBy: req.user!.id,
      });

      res.status(201).json({
        missionId: mission.id,
        status: mission.status,
        estimatedDuration: mission.estimatedDuration,
        estimatedDistance: mission.estimatedDistance,
        waypointsCount: Array.isArray(mission.waypoints) ? (mission.waypoints as any[]).length : 0,
        createdAt: mission.createdAt,
      });
    } catch (error: any) {
      logger.error('Failed to create mission', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// List missions
router.get(
  '/',
  authenticate,
  validate(paginationSchema),
  async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query as any;
      const { siteId, droneId, status } = req.query;

      const result = await missionService.listMissions(
        {
          orgId: req.user!.orgId,
          siteId: siteId as string,
          droneId: droneId as string,
          status: status as MissionStatus,
        },
        { page: parseInt(page) || 1, limit: parseInt(limit) || 20 }
      );

      res.json({
        missions: result.missions,
        pagination: {
          page: parseInt(page) || 1,
          limit: parseInt(limit) || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (parseInt(limit) || 20)),
        },
      });
    } catch (error: any) {
      logger.error('Failed to list missions', error);
      res.status(500).json({ error: 'Failed to fetch missions' });
    }
  }
);

// Get mission details
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const mission = await missionService.getMission(req.params.id);
    
    if (!mission) {
      res.status(404).json({ error: 'Mission not found' });
      return;
    }

    // Get real-time progress
    const progress = await missionService.getMissionProgress(req.params.id);

    res.json({ ...mission, liveProgress: progress });
  } catch (error: any) {
    logger.error('Failed to get mission', error);
    res.status(500).json({ error: 'Failed to fetch mission' });
  }
});

// Update mission
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  async (req: Request, res: Response) => {
    try {
      const mission = await missionService.updateMission(req.params.id, req.body);
      res.json(mission);
    } catch (error: any) {
      logger.error('Failed to update mission', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Delete mission
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      await missionService.deleteMission(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      logger.error('Failed to delete mission', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Mission control commands
router.post(
  '/:id/start',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(missionCommandSchema),
  async (req: Request, res: Response) => {
    try {
      const mission = await missionService.getMission(req.params.id);
      if (!mission) {
        res.status(404).json({ error: 'Mission not found' });
        return;
      }

      const validation = await commandService.validateCommand(req.params.id, 'START');
      if (!validation.valid) {
        res.status(400).json({ error: validation.reason });
        return;
      }

      const result = await commandService.sendCommand(
        req.params.id,
        mission.droneId,
        'START',
        req.user!.id
      );

      res.json(result);
    } catch (error: any) {
      logger.error('Failed to start mission', error);
      res.status(500).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/pause',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(missionCommandSchema),
  async (req: Request, res: Response) => {
    try {
      const mission = await missionService.getMission(req.params.id);
      if (!mission) {
        res.status(404).json({ error: 'Mission not found' });
        return;
      }

      const validation = await commandService.validateCommand(req.params.id, 'PAUSE');
      if (!validation.valid) {
        res.status(400).json({ error: validation.reason });
        return;
      }

      const result = await commandService.sendCommand(
        req.params.id,
        mission.droneId,
        'PAUSE',
        req.user!.id
      );

      res.json(result);
    } catch (error: any) {
      logger.error('Failed to pause mission', error);
      res.status(500).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/resume',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(missionCommandSchema),
  async (req: Request, res: Response) => {
    try {
      const mission = await missionService.getMission(req.params.id);
      if (!mission) {
        res.status(404).json({ error: 'Mission not found' });
        return;
      }

      const validation = await commandService.validateCommand(req.params.id, 'RESUME');
      if (!validation.valid) {
        res.status(400).json({ error: validation.reason });
        return;
      }

      const result = await commandService.sendCommand(
        req.params.id,
        mission.droneId,
        'RESUME',
        req.user!.id
      );

      res.json(result);
    } catch (error: any) {
      logger.error('Failed to resume mission', error);
      res.status(500).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/abort',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(missionCommandSchema),
  async (req: Request, res: Response) => {
    try {
      const mission = await missionService.getMission(req.params.id);
      if (!mission) {
        res.status(404).json({ error: 'Mission not found' });
        return;
      }

      const validation = await commandService.validateCommand(req.params.id, 'ABORT');
      if (!validation.valid) {
        res.status(400).json({ error: validation.reason });
        return;
      }

      const result = await commandService.sendCommand(
        req.params.id,
        mission.droneId,
        'ABORT',
        req.user!.id
      );

      res.json(result);
    } catch (error: any) {
      logger.error('Failed to abort mission', error);
      res.status(500).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/rth',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(missionCommandSchema),
  async (req: Request, res: Response) => {
    try {
      const mission = await missionService.getMission(req.params.id);
      if (!mission) {
        res.status(404).json({ error: 'Mission not found' });
        return;
      }

      const validation = await commandService.validateCommand(req.params.id, 'RTH');
      if (!validation.valid) {
        res.status(400).json({ error: validation.reason });
        return;
      }

      const result = await commandService.sendCommand(
        req.params.id,
        mission.droneId,
        'RTH',
        req.user!.id
      );

      res.json(result);
    } catch (error: any) {
      logger.error('Failed to send RTH command', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get mission telemetry
router.get('/:id/telemetry', authenticate, async (req: Request, res: Response) => {
  try {
    const telemetry = await telemetryService.getLatestTelemetry(req.params.id);
    
    if (!telemetry) {
      res.status(404).json({ error: 'No telemetry data available' });
      return;
    }

    res.json(telemetry);
  } catch (error: any) {
    logger.error('Failed to get telemetry', error);
    res.status(500).json({ error: 'Failed to fetch telemetry' });
  }
});

export default router;
