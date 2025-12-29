#!/usr/bin/env python3

import json
import requests
import os

# Datadog API configuration
DD_API_KEY = os.getenv('DD_API_KEY')
DD_APP_KEY = os.getenv('DD_APP_KEY')
DD_SITE = os.getenv('DD_SITE', 'datadoghq.com')

BASE_URL = f"https://api.{DD_SITE}"

headers = {
    'Content-Type': 'application/json',
    'DD-API-KEY': DD_API_KEY,
    'DD-APPLICATION-KEY': DD_APP_KEY
}

monitors = [
    {
        "name": "[Drone Mission] High Telemetry Latency",
        "type": "metric alert",
        "query": "avg(last_5m):avg:drone_mission.telemetry.latency{*} > 500",
        "message": """🚨 **High Telemetry Latency Alert**

Telemetry latency is above 500ms. This may indicate:
- Network connectivity issues
- Processing bottlenecks
- Kafka consumer lag

**Current latency**: {{value}}ms
**Threshold**: 500ms

@slack-drone-alerts @webhook-pagerduty""",
        "tags": ["service:drone-mission-backend", "team:drone-ops", "severity:high"],
        "options": {
            "thresholds": {
                "critical": 500,
                "warning": 300
            },
            "notify_audit": False,
            "require_full_window": True,
            "notify_no_data": True,
            "no_data_timeframe": 10
        }
    },
    {
        "name": "[Drone Mission] Command Timeout Rate High",
        "type": "metric alert", 
        "query": "sum(last_10m):sum:drone_mission.drone.command_timeout{*}.as_count() / sum:drone_mission.drone.command_sent{*}.as_count() * 100 > 10",
        "message": """🚨 **Command Timeout Rate Alert**

Command timeout rate is above 10%. Drones may be experiencing connectivity issues.

**Current rate**: {{value}}%
**Threshold**: 10%

**Immediate Actions**:
1. Check MQTT broker status
2. Verify drone connectivity
3. Review network conditions

@pagerduty-drone-ops @slack-drone-alerts""",
        "tags": ["service:drone-mission-backend", "team:drone-ops", "severity:critical"],
        "options": {
            "thresholds": {
                "critical": 10,
                "warning": 5
            }
        }
    },
    {
        "name": "[Drone Mission] Multiple Low Battery Drones",
        "type": "metric alert",
        "query": "sum(last_5m):sum:drone_mission.drone.battery_low{*}.as_count() > 3",
        "message": """⚠️ **Multiple Low Battery Alert**

{{value}} drones are reporting low battery levels.

**Actions Required**:
- Review active missions
- Prepare backup drones
- Consider mission prioritization

@slack-drone-alerts""",
        "tags": ["service:drone-mission-backend", "team:drone-ops"],
        "options": {
            "thresholds": {
                "critical": 3,
                "warning": 2
            }
        }
    },
    {
        "name": "[Drone Mission] API Error Rate High",
        "type": "metric alert",
        "query": "sum(last_5m):sum:drone_mission.api.error_count{*}.as_count() / sum:drone_mission.api.request_count{*}.as_count() * 100 > 5",
        "message": """🚨 **API Error Rate Alert**

API error rate is above 5%.

**Current rate**: {{value}}%
**Threshold**: 5%

Check application logs and system health.

@slack-drone-alerts""",
        "tags": ["service:drone-mission-backend", "team:drone-ops"],
        "options": {
            "thresholds": {
                "critical": 5,
                "warning": 2
            }
        }
    },
    {
        "name": "[Drone Mission] Mission Failure Rate High",
        "type": "metric alert",
        "query": "sum(last_1h):sum:drone_mission.mission.failed{*}.as_count() / (sum:drone_mission.mission.completed{*}.as_count() + sum:drone_mission.mission.failed{*}.as_count()) * 100 > 10",
        "message": """🚨 **Mission Failure Rate Alert**

Mission failure rate is above 10% in the last hour.

**Current rate**: {{value}}%
**Failed missions**: {{threshold}}

**Investigation Required**:
- Review failure reasons
- Check environmental conditions
- Verify drone maintenance status

@pagerduty-drone-ops @slack-drone-alerts""",
        "tags": ["service:drone-mission-backend", "team:drone-ops", "severity:critical"],
        "options": {
            "thresholds": {
                "critical": 10,
                "warning": 5
            }
        }
    }
]

def create_monitor(monitor_config):
    """Create a single monitor in Datadog"""
    url = f"{BASE_URL}/api/v1/monitor"
    
    response = requests.post(url, headers=headers, json=monitor_config)
    
    if response.status_code == 200:
        monitor = response.json()
        print(f"✅ Monitor created: {monitor_config['name']}")
        return monitor['id']
    else:
        print(f"❌ Failed to create monitor '{monitor_config['name']}': {response.status_code}")
        print(response.text)
        return None

def create_all_monitors():
    """Create all monitors"""
    created_monitors = []
    
    for monitor_config in monitors:
        monitor_id = create_monitor(monitor_config)
        if monitor_id:
            created_monitors.append(monitor_id)
    
    print(f"\n✅ Created {len(created_monitors)} monitors successfully!")
    return created_monitors

if __name__ == "__main__":
    if not DD_API_KEY or not DD_APP_KEY:
        print("❌ Please set DD_API_KEY and DD_APP_KEY environment variables")
        exit(1)
    
    create_all_monitors()