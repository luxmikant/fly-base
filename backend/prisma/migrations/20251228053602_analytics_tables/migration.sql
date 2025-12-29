-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('MAINTENANCE_DUE', 'PERFORMANCE_DEGRADATION', 'UTILIZATION_LOW', 'UTILIZATION_HIGH', 'COVERAGE_POOR', 'EFFICIENCY_DROP', 'BATTERY_ISSUE', 'WEATHER_IMPACT');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('DRONE', 'MISSION', 'SITE', 'ORGANIZATION');

-- CreateTable
CREATE TABLE "mission_analytics" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "actual_duration" INTEGER,
    "actual_distance" DOUBLE PRECISION,
    "area_surveyed" DOUBLE PRECISION,
    "coverage_efficiency" DOUBLE PRECISION,
    "battery_consumption" DOUBLE PRECISION,
    "average_speed" DOUBLE PRECISION,
    "average_altitude" DOUBLE PRECISION,
    "max_altitude" DOUBLE PRECISION,
    "min_altitude" DOUBLE PRECISION,
    "telemetry_points" INTEGER,
    "quality_score" DOUBLE PRECISION,
    "weather_conditions" JSONB,
    "flight_path_data" JSONB,
    "coverage_gaps" JSONB,
    "overlap_areas" JSONB,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_metrics" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "drone_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_flight_time" INTEGER NOT NULL DEFAULT 0,
    "total_distance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_missions" INTEGER NOT NULL DEFAULT 0,
    "successful_missions" INTEGER NOT NULL DEFAULT 0,
    "failed_missions" INTEGER NOT NULL DEFAULT 0,
    "average_mission_time" DOUBLE PRECISION,
    "battery_usage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maintenance_events" INTEGER NOT NULL DEFAULT 0,
    "downtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "utilization_rate" DOUBLE PRECISION,
    "performance_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_metrics" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_surveys" INTEGER NOT NULL DEFAULT 0,
    "total_area_covered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_flight_time" INTEGER NOT NULL DEFAULT 0,
    "active_drones" INTEGER NOT NULL DEFAULT 0,
    "average_efficiency" DOUBLE PRECISION,
    "cost_per_survey" DOUBLE PRECISION,
    "cost_per_area" DOUBLE PRECISION,
    "success_rate" DOUBLE PRECISION,
    "seasonal_factor" DOUBLE PRECISION,
    "weather_impact" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_metrics" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_surveys" INTEGER NOT NULL DEFAULT 0,
    "total_area_covered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_flight_time" INTEGER NOT NULL DEFAULT 0,
    "active_drones" INTEGER NOT NULL DEFAULT 0,
    "average_efficiency" DOUBLE PRECISION,
    "success_rate" DOUBLE PRECISION,
    "weather_delays" INTEGER NOT NULL DEFAULT 0,
    "maintenance_downtime" INTEGER NOT NULL DEFAULT 0,
    "utilization_rate" DOUBLE PRECISION,
    "performance_rank" INTEGER,
    "benchmark_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coverage_analysis" (
    "id" TEXT NOT NULL,
    "mission_analytics_id" TEXT NOT NULL,
    "planned_area" DOUBLE PRECISION NOT NULL,
    "actual_coverage" DOUBLE PRECISION NOT NULL,
    "coverage_percentage" DOUBLE PRECISION NOT NULL,
    "gap_areas" JSONB,
    "overlap_areas" JSONB,
    "overlap_efficiency" DOUBLE PRECISION,
    "pattern_compliance" DOUBLE PRECISION,
    "quality_score" DOUBLE PRECISION NOT NULL,
    "recommendations" JSONB,
    "industry_standards" JSONB,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coverage_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_alerts" (
    "id" TEXT NOT NULL,
    "alert_type" "AlertType" NOT NULL,
    "severity" "AlertLevel" NOT NULL DEFAULT 'INFO',
    "entity_type" "EntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "threshold" DOUBLE PRECISION,
    "actual_value" DOUBLE PRECISION,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mission_analytics_mission_id_key" ON "mission_analytics"("mission_id");

-- CreateIndex
CREATE INDEX "mission_analytics_mission_id_idx" ON "mission_analytics"("mission_id");

-- CreateIndex
CREATE INDEX "mission_analytics_calculated_at_idx" ON "mission_analytics"("calculated_at");

-- CreateIndex
CREATE INDEX "mission_analytics_coverage_efficiency_idx" ON "mission_analytics"("coverage_efficiency");

-- CreateIndex
CREATE INDEX "mission_analytics_quality_score_idx" ON "mission_analytics"("quality_score");

-- CreateIndex
CREATE INDEX "fleet_metrics_site_id_date_idx" ON "fleet_metrics"("site_id", "date");

-- CreateIndex
CREATE INDEX "fleet_metrics_drone_id_date_idx" ON "fleet_metrics"("drone_id", "date");

-- CreateIndex
CREATE INDEX "fleet_metrics_date_performance_score_idx" ON "fleet_metrics"("date", "performance_score");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_metrics_drone_id_date_key" ON "fleet_metrics"("drone_id", "date");

-- CreateIndex
CREATE INDEX "organization_metrics_org_id_date_idx" ON "organization_metrics"("org_id", "date");

-- CreateIndex
CREATE INDEX "organization_metrics_date_total_surveys_idx" ON "organization_metrics"("date", "total_surveys");

-- CreateIndex
CREATE UNIQUE INDEX "organization_metrics_org_id_date_key" ON "organization_metrics"("org_id", "date");

-- CreateIndex
CREATE INDEX "site_metrics_site_id_date_idx" ON "site_metrics"("site_id", "date");

-- CreateIndex
CREATE INDEX "site_metrics_date_benchmark_score_idx" ON "site_metrics"("date", "benchmark_score");

-- CreateIndex
CREATE INDEX "site_metrics_performance_rank_idx" ON "site_metrics"("performance_rank");

-- CreateIndex
CREATE UNIQUE INDEX "site_metrics_site_id_date_key" ON "site_metrics"("site_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "coverage_analysis_mission_analytics_id_key" ON "coverage_analysis"("mission_analytics_id");

-- CreateIndex
CREATE INDEX "coverage_analysis_mission_analytics_id_idx" ON "coverage_analysis"("mission_analytics_id");

-- CreateIndex
CREATE INDEX "coverage_analysis_coverage_percentage_idx" ON "coverage_analysis"("coverage_percentage");

-- CreateIndex
CREATE INDEX "coverage_analysis_quality_score_idx" ON "coverage_analysis"("quality_score");

-- CreateIndex
CREATE INDEX "performance_alerts_entity_type_entity_id_idx" ON "performance_alerts"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "performance_alerts_alert_type_severity_idx" ON "performance_alerts"("alert_type", "severity");

-- CreateIndex
CREATE INDEX "performance_alerts_created_at_idx" ON "performance_alerts"("created_at");

-- CreateIndex
CREATE INDEX "performance_alerts_is_resolved_idx" ON "performance_alerts"("is_resolved");

-- AddForeignKey
ALTER TABLE "mission_analytics" ADD CONSTRAINT "mission_analytics_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_metrics" ADD CONSTRAINT "fleet_metrics_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_metrics" ADD CONSTRAINT "fleet_metrics_drone_id_fkey" FOREIGN KEY ("drone_id") REFERENCES "drones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_metrics" ADD CONSTRAINT "organization_metrics_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_metrics" ADD CONSTRAINT "site_metrics_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_analysis" ADD CONSTRAINT "coverage_analysis_mission_analytics_id_fkey" FOREIGN KEY ("mission_analytics_id") REFERENCES "mission_analytics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
