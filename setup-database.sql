-- Create database schema for drone mission management system

-- Create enums
CREATE TYPE "DroneStatus" AS ENUM ('AVAILABLE', 'IN_MISSION', 'CHARGING', 'MAINTENANCE', 'OFFLINE');
CREATE TYPE "MissionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABORTED', 'FAILED');
CREATE TYPE "FlightPattern" AS ENUM ('CROSSHATCH', 'PERIMETER', 'SPIRAL');
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'ANALYST');

-- Create organizations table
CREATE TABLE IF NOT EXISTS "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- Create sites table
CREATE TABLE IF NOT EXISTS "sites" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create drones table
CREATE TABLE IF NOT EXISTS "drones" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "DroneStatus" NOT NULL DEFAULT 'AVAILABLE',
    "battery_level" INTEGER NOT NULL DEFAULT 100,
    "last_seen" TIMESTAMP(3),
    "home_latitude" DOUBLE PRECISION NOT NULL,
    "home_longitude" DOUBLE PRECISION NOT NULL,
    "firmware_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "drones_pkey" PRIMARY KEY ("id")
);

-- Create missions table
CREATE TABLE IF NOT EXISTS "missions" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "drone_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'PLANNED',
    "survey_area" JSONB NOT NULL,
    "flight_pattern" "FlightPattern" NOT NULL,
    "parameters" JSONB NOT NULL,
    "waypoints" JSONB,
    "scheduled_start" TIMESTAMP(3),
    "actual_start" TIMESTAMP(3),
    "actual_end" TIMESTAMP(3),
    "estimated_duration" INTEGER,
    "estimated_distance" DOUBLE PRECISION,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "drones_serial_number_key" ON "drones"("serial_number");

-- Create indexes
CREATE INDEX IF NOT EXISTS "sites_org_id_idx" ON "sites"("org_id");
CREATE INDEX IF NOT EXISTS "users_org_id_idx" ON "users"("org_id");
CREATE INDEX IF NOT EXISTS "drones_site_id_status_idx" ON "drones"("site_id", "status");
CREATE INDEX IF NOT EXISTS "drones_status_battery_level_idx" ON "drones"("status", "battery_level");
CREATE INDEX IF NOT EXISTS "missions_site_id_status_created_at_idx" ON "missions"("site_id", "status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "missions_drone_id_status_idx" ON "missions"("drone_id", "status");
CREATE INDEX IF NOT EXISTS "missions_status_scheduled_start_idx" ON "missions"("status", "scheduled_start");

-- Add foreign key constraints
ALTER TABLE "sites" ADD CONSTRAINT "sites_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "drones" ADD CONSTRAINT "drones_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "missions" ADD CONSTRAINT "missions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "missions" ADD CONSTRAINT "missions_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "missions" ADD CONSTRAINT "missions_drone_id_fkey" FOREIGN KEY ("drone_id") REFERENCES "drones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "missions" ADD CONSTRAINT "missions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert sample data
INSERT INTO "organizations" ("id", "name", "updated_at") VALUES 
('org-1', 'FlytBase Demo Organization', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "sites" ("id", "org_id", "name", "latitude", "longitude", "updated_at") VALUES 
('site-sf-01', 'org-1', 'San Francisco Site 01', 37.7749, -122.4194, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "users" ("id", "org_id", "email", "password", "name", "updated_at") VALUES 
('user-1', 'org-1', 'operator@flytbase.com', '$2b$10$rOzJqQqQqQqQqQqQqQqQqO', 'J. Smith', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "drones" ("id", "site_id", "serial_number", "model", "home_latitude", "home_longitude", "updated_at") VALUES 
('DJI-M300-001', 'site-sf-01', 'DJI001', 'DJI Matrice 300 RTK', 37.7749, -122.4194, CURRENT_TIMESTAMP),
('DJI-M300-002', 'site-sf-01', 'DJI002', 'DJI Matrice 300 RTK', 37.7759, -122.4184, CURRENT_TIMESTAMP),
('DJI-M300-003', 'site-sf-01', 'DJI003', 'DJI Matrice 300 RTK', 37.7739, -122.4204, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;