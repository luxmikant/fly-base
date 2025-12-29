import dotenv from 'dotenv';
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.DATABASE_URL!,
    timescaleUrl: process.env.TIMESCALE_URL!,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  kafka: {
    brokers: process.env.KAFKA_BOOTSTRAP_SERVERS?.split(',') || ['localhost:9092'],
    apiKey: process.env.KAFKA_API_KEY,
    apiSecret: process.env.KAFKA_API_SECRET,
    schemaRegistryUrl: process.env.KAFKA_SCHEMA_REGISTRY_URL,
    schemaRegistryKey: process.env.KAFKA_SCHEMA_REGISTRY_KEY,
    schemaRegistrySecret: process.env.KAFKA_SCHEMA_REGISTRY_SECRET,
    topics: {
      telemetry: 'drone.telemetry',
      commands: 'drone.commands',
      events: 'mission.events',
      alerts: 'system.alerts',
    },
  },
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  },
  datadog: {
    apiKey: process.env.DD_API_KEY,
    appKey: process.env.DD_APP_KEY,
    site: process.env.DD_SITE || 'datadoghq.com',
    service: process.env.DD_SERVICE || 'drone-mission-backend',
    env: process.env.DD_ENV || 'development',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};
