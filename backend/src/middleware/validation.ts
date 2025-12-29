import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

// Common validation schemas
export const paginationSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  }),
});

export const uuidParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// Mission schemas
export const createMissionSchema = z.object({
  body: z.object({
    siteId: z.string().uuid(),
    droneId: z.string().uuid(),
    name: z.string().min(1).max(255),
    surveyArea: z.object({
      type: z.literal('Polygon'),
      coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
    }),
    flightPattern: z.enum(['CROSSHATCH', 'PERIMETER', 'SPIRAL']),
    parameters: z.object({
      altitude: z.number().min(10).max(400),
      speed: z.number().min(1).max(20),
      overlap: z.number().min(0).max(90),
      gimbalAngle: z.number().min(-90).max(0),
    }),
    scheduledStart: z.string().datetime().optional(),
  }),
});

export const missionCommandSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// Drone schemas
export const registerDroneSchema = z.object({
  body: z.object({
    siteId: z.string().uuid(),
    serialNumber: z.string().min(1).max(100),
    model: z.string().min(1).max(100),
    homeLatitude: z.number().min(-90).max(90),
    homeLongitude: z.number().min(-180).max(180),
    firmwareVersion: z.string().optional(),
  }),
});

export const updateDroneStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    status: z.enum(['AVAILABLE', 'CHARGING', 'MAINTENANCE', 'OFFLINE']),
  }),
});
