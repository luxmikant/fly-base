-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drone telemetry hypertable
CREATE TABLE IF NOT EXISTS drone_telemetry (
    time TIMESTAMPTZ NOT NULL,
    mission_id UUID NOT NULL,
    drone_id UUID NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION,
    heading INTEGER,
    battery_level INTEGER,
    signal_strength INTEGER,
    status VARCHAR(50),
    progress DOUBLE PRECISION,
    
    PRIMARY KEY (time, drone_id)
);

-- Convert to hypertable
SELECT create_hypertable('drone_telemetry', 'time', if_not_exists => TRUE);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_telemetry_mission ON drone_telemetry (mission_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_drone ON drone_telemetry (drone_id, time DESC);

-- Compression policy: compress data older than 1 day
SELECT add_compression_policy('drone_telemetry', INTERVAL '1 day', if_not_exists => TRUE);

-- Retention policy: drop data older than 2 years
SELECT add_retention_policy('drone_telemetry', INTERVAL '2 years', if_not_exists => TRUE);

-- Continuous aggregate for hourly stats
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    mission_id,
    drone_id,
    AVG(speed) AS avg_speed,
    AVG(altitude) AS avg_altitude,
    MIN(battery_level) AS min_battery,
    MAX(progress) AS max_progress,
    COUNT(*) AS data_points
FROM drone_telemetry
GROUP BY bucket, mission_id, drone_id
WITH NO DATA;

-- Refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('telemetry_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Mission summary table
CREATE TABLE IF NOT EXISTS mission_summary (
    mission_id UUID PRIMARY KEY,
    drone_id UUID NOT NULL,
    site_id UUID NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    total_distance DOUBLE PRECISION,
    total_duration INTEGER,
    area_covered DOUBLE PRECISION,
    avg_speed DOUBLE PRECISION,
    avg_altitude DOUBLE PRECISION,
    min_battery INTEGER,
    data_points_collected INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_summary_site ON mission_summary (site_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_summary_drone ON mission_summary (drone_id, completed_at DESC);
