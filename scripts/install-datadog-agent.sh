#!/bin/bash

# Datadog Agent Installation Script
# Run this on your production servers

DD_API_KEY="e6624bec589884a79b137bfaa3fbaa46  "
DD_SITE="datadoghq.com"  # or datadoghq.eu for EU

# Install Datadog Agent
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=$DD_API_KEY DD_SITE=$DD_SITE bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Configure APM
sudo tee /etc/datadog-agent/conf.d/apm.yaml > /dev/null <<EOF
apm_config:
  enabled: true
  env: production
  receiver_port: 8126
  apm_non_local_traffic: true
EOF

# Configure logs collection
sudo tee /etc/datadog-agent/conf.d/logs.yaml > /dev/null <<EOF
logs_config:
  enabled: true
  container_collect_all: true
EOF

# Configure custom metrics
sudo tee /etc/datadog-agent/conf.d/statsd.yaml > /dev/null <<EOF
dogstatsd_config:
  enabled: true
  port: 8125
  non_local_traffic: true
EOF

# Restart agent
sudo systemctl restart datadog-agent
sudo systemctl enable datadog-agent

echo "Datadog Agent installed and configured!"
echo "Check status: sudo datadog-agent status"