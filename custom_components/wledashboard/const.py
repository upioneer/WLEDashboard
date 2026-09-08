"""Constants for the WLEDashboard Home Assistant integration."""

DOMAIN = "wledashboard"
DEFAULT_NAME = "WLEDashboard"
DEFAULT_PORT = 3001

CONF_HOST = "host"
CONF_PORT = "port"
CONF_API_TOKEN = "api_token"
CONF_SSL = "ssl"

ATTR_GROUP_ID = "group_id"
ATTR_ROOM_ID = "room_id"
ATTR_DEVICE_ID = "device_id"
ATTR_ROUTINE_ID = "routine_id"
ATTR_PALETTE_ID = "palette_id"
ATTR_CONDITION = "condition"
ATTR_PAYLOAD = "payload"
ATTR_MATRIX_PIXELS = "pixels"

SERVICE_APPLY_PALETTE = "apply_palette"
SERVICE_EXECUTE_ROUTINE = "execute_routine"
SERVICE_SIMULATE_WEATHER = "simulate_weather"
SERVICE_SYNC_WEATHER_NOW = "sync_weather_now"
SERVICE_DISPLAY_MATRIX = "display_matrix"

PLATFORMS = ["light", "button", "switch"]
