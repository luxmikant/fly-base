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

# Drone Mission Operations Dashboard
dashboard_config = {
    "title": "🚁 Drone Mission Operations",
    "description": "Real-time monitoring of drone missions, fleet status, and system performance",
    "widgets": [
        {
            "id": 1,
            "definition": {
                "type": "query_value",
                "requests": [
                    {
                        "q": "sum:drone_mission.mission.active{*}",
                        "aggregator": "last"
                    }
                ],
                "title": "Active Missions",
                "title_size": "16",
                "title_align": "left",
                "precision": 0
            },
            "layout": {"x": 0, "y": 0, "width": 2, "height": 2}
        },
        {
            "id": 2,
            "definition": {
                "type": "timeseries",
                "requests": [
                    {
                        "q": "sum:drone_mission.telemetry.received{*}.as_rate()",
                        "display_type": "line",
                        "style": {
                            "palette": "dog_classic",
                            "line_type": "solid",
                            "line_width": "normal"
                        }
                    }
                ],
                "title": "Telemetry Messages/sec",
                "title_size": "16",
                "title_align": "left",
                "yaxis": {
                    "scale": "linear",
                    "min": "auto",
                    "max": "auto"
                }
            },
            "layout": {"x": 2, "y": 0, "width": 4, "height": 2}
        },
        {
            "id": 3,
            "definition": {
                "type": "timeseries",
                "requests": [
                    {
                        "q": "p95:drone_mission.telemetry.latency{*}",
                        "display_type": "line"
                    },
                    {
                        "q": "p50:drone_mission.telemetry.latency{*}",
                        "display_type": "line"
                    }
                ],
                "title": "Telemetry Latency (p95/p50)",
                "title_size": "16",
                "yaxis": {
                    "scale": "linear",
                    "unit": "millisecond"
                }
            },
            "layout": {"x": 6, "y": 0, "width": 4, "height": 2}
        },
        {
            "id": 4,
            "definition": {
                "type": "toplist",
                "requests": [
                    {
                        "q": "sum:drone_mission.drone.status{*} by {status}",
                        "style": {
                            "palette": "dog_classic"
                        }
                    }
                ],
                "title": "Fleet Status Distribution"
            },
            "layout": {"x": 10, "y": 0, "width": 2, "height": 2}
        },
        {
            "id": 5,
            "definition": {
                "type": "timeseries",
                "requests": [
                    {
                        "q": "sum:drone_mission.api.request_count{*}.as_rate() by {path}",
                        "display_type": "line"
                    }
                ],
                "title": "API Request Rate by Endpoint"
            },
            "layout": {"x": 0, "y": 2, "width": 6, "height": 2}
        },
        {
            "id": 6,
            "definition": {
                "type": "query_value",
                "requests": [
                    {
                        "q": "sum:drone_mission.drone.command_ack{*}.as_count() / sum:drone_mission.drone.command_sent{*}.as_count() * 100",
                        "aggregator": "last"
                    }
                ],
                "title": "Command Success Rate (%)",
                "precision": 1
            },
            "layout": {"x": 6, "y": 2, "width": 3, "height": 2}
        },
        {
            "id": 7,
            "definition": {
                "type": "heatmap",
                "requests": [
                    {
                        "q": "avg:drone_mission.mission.duration{*} by {site_id}"
                    }
                ],
                "title": "Mission Duration by Site"
            },
            "layout": {"x": 9, "y": 2, "width": 3, "height": 2}
        }
    ],
    "layout_type": "ordered",
    "is_read_only": False,
    "notify_list": [],
    "template_variables": [
        {
            "name": "site",
            "prefix": "site_id",
            "available_values": [],
            "default": "*"
        }
    ]
}

def create_dashboard():
    """Create the drone mission dashboard in Datadog"""
    url = f"{BASE_URL}/api/v1/dashboard"
    
    response = requests.post(url, headers=headers, json=dashboard_config)
    
    if response.status_code == 200:
        dashboard = response.json()
        print(f"✅ Dashboard created successfully!")
        print(f"Dashboard URL: https://app.{DD_SITE}/dashboard/{dashboard['id']}")
        return dashboard['id']
    else:
        print(f"❌ Failed to create dashboard: {response.status_code}")
        print(response.text)
        return None

if __name__ == "__main__":
    if not DD_API_KEY or not DD_APP_KEY:
        print("❌ Please set DD_API_KEY and DD_APP_KEY environment variables")
        exit(1)
    
    dashboard_id = create_dashboard()