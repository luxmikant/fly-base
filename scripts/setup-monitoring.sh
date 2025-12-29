#!/bin/bash

# Complete setup script for Confluent Kafka + Datadog
# Run this after creating accounts and getting API keys

set -e

echo "🚁 Setting up Drone Mission Monitoring Stack..."

# Check required environment variables
required_vars=("DD_API_KEY" "DD_APP_KEY" "KAFKA_API_KEY" "KAFKA_API_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var environment variable is not set"
        echo "Please set all required variables and run again"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# 1. Setup Kafka Topics
echo "📡 Setting up Kafka topics..."
if command -v confluent &> /dev/null; then
    chmod +x scripts/setup-kafka-topics.sh
    ./scripts/setup-kafka-topics.sh
else
    echo "⚠️  Confluent CLI not found. Please install it and run setup-kafka-topics.sh manually"
fi

# 2. Create Datadog Dashboard
echo "📊 Creating Datadog dashboard..."
python3 scripts/create-datadog-dashboard.py

# 3. Create Datadog Monitors
echo "🔔 Creating Datadog monitors..."
python3 scripts/create-datadog-monitors.py

# 4. Install Datadog Agent (if on production server)
if [ "$DD_ENV" = "production" ]; then
    echo "🤖 Installing Datadog Agent..."
    chmod +x scripts/install-datadog-agent.sh
    sudo ./scripts/install-datadog-agent.sh
fi

# 5. Test connections
echo "🧪 Testing connections..."

# Test Kafka connection
echo "Testing Kafka connection..."
node -e "
const { Kafka } = require('kafkajs');
const kafka = new Kafka({
  clientId: 'setup-test',
  brokers: ['$KAFKA_BOOTSTRAP_SERVERS'],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: '$KAFKA_API_KEY',
    password: '$KAFKA_API_SECRET'
  }
});
kafka.admin().connect().then(() => {
  console.log('✅ Kafka connection successful');
  process.exit(0);
}).catch(err => {
  console.log('❌ Kafka connection failed:', err.message);
  process.exit(1);
});
"

# Test Datadog API
echo "Testing Datadog API..."
curl -s -X GET "https://api.datadoghq.com/api/v1/validate" \
  -H "DD-API-KEY: $DD_API_KEY" \
  -H "DD-APPLICATION-KEY: $DD_APP_KEY" | \
  jq -r 'if .valid then "✅ Datadog API connection successful" else "❌ Datadog API connection failed" end'

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with the API keys"
echo "2. Start your application: npm run dev"
echo "3. Check Datadog dashboard: https://app.datadoghq.com/dashboard/lists"
echo "4. Monitor Kafka topics: https://confluent.cloud"
echo ""
echo "Useful commands:"
echo "- View Kafka topics: confluent kafka topic list"
echo "- Check Datadog agent: sudo datadog-agent status"
echo "- View application logs: docker-compose logs -f api"