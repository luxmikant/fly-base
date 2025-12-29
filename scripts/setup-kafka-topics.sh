#!/bin/bash

# Confluent Cloud Topic Creation Script
# Run this after setting up your cluster and API keys

# Set your cluster details
CLUSTER_ID="lkc-6ry86q"  # Replace with your cluster ID
API_KEY="EA5DIEEO7UBNBCTT"
API_SECRET="cfltPP74GIKEMUuKFlAQpP2P/Lx1NAcSmV75v5+x4KFgEVTarHCTKehJZmKmN8QA"

# Install Confluent CLI if not already installed
# curl -sL --http1.1 https://cnfl.io/cli | sh -s -- latest

# Login to Confluent Cloud
confluent login --save

# Set environment and cluster
confluent environment use env-w6dqyg  # Replace with your environment ID
confluent kafka cluster use $CLUSTER_ID

# Create topics
echo "Creating Kafka topics..."

# Telemetry topic - high throughput, short retention
confluent kafka topic create drone.telemetry \
  --partitions 6 \
  --config "retention.ms=604800000" \
  --config "cleanup.policy=delete" \
  --config "compression.type=gzip" \
  --config "max.message.bytes=1048576"

# Commands topic - low throughput, short retention
confluent kafka topic create drone.commands \
  --partitions 3 \
  --config "retention.ms=86400000" \
  --config "cleanup.policy=delete" \
  --config "compression.type=gzip"

# Mission events - medium throughput, longer retention
confluent kafka topic create mission.events \
  --partitions 3 \
  --config "retention.ms=2592000000" \
  --config "cleanup.policy=delete" \
  --config "compression.type=gzip"

# System alerts - low throughput, medium retention
confluent kafka topic create system.alerts \
  --partitions 1 \
  --config "retention.ms=604800000" \
  --config "cleanup.policy=delete"

echo "Topics created successfully!"

# List topics to verify
confluent kafka topic list