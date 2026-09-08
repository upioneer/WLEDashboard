"""The WLEDashboard Home Assistant integration."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_PORT, CONF_SSL
from homeassistant.core import HomeAssistant, ServiceCall
import homeassistant.helpers.config_validation as cv

from .const import (
    ATTR_CONDITION,
    ATTR_DEVICE_ID,
    ATTR_GROUP_ID,
    ATTR_PALETTE_ID,
    ATTR_PAYLOAD,
    ATTR_ROOM_ID,
    ATTR_ROUTINE_ID,
    CONF_API_TOKEN,
    DOMAIN,
    PLATFORMS,
    SERVICE_APPLY_PALETTE,
    SERVICE_EXECUTE_ROUTINE,
    SERVICE_SIMULATE_WEATHER,
    SERVICE_SYNC_WEATHER_NOW,
)
from .coordinator import WLEDashboardCoordinator

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up WLEDashboard from a config entry."""
    host = entry.data[CONF_HOST]
    port = entry.data[CONF_PORT]
    api_token = entry.data.get(CONF_API_TOKEN)
    use_ssl = entry.data.get(CONF_SSL, False)

    coordinator = WLEDashboardCoordinator(
        hass=hass,
        host=host,
        port=port,
        api_token=api_token,
        use_ssl=use_ssl,
    )

    await coordinator.async_config_entry_first_refresh()

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = coordinator

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Register custom Home Assistant services
    async def handle_execute_routine(call: ServiceCall) -> None:
        routine_id = call.data[ATTR_ROUTINE_ID]
        await coordinator.async_execute_routine(routine_id)

    async def handle_simulate_weather(call: ServiceCall) -> None:
        condition = call.data[ATTR_CONDITION]
        await coordinator.async_simulate_weather(condition)

    async def handle_sync_weather_now(call: ServiceCall) -> None:
        await coordinator.async_sync_weather_now()

    async def handle_apply_palette(call: ServiceCall) -> None:
        palette_id = call.data.get(ATTR_PALETTE_ID)
        target_group = call.data.get(ATTR_GROUP_ID)
        target_room = call.data.get(ATTR_ROOM_ID)
        target_dev = call.data.get(ATTR_DEVICE_ID)

        payload = {"ps": palette_id} if palette_id else {}
        if target_group:
            await coordinator.async_send_group_command(target_group, payload)
        elif target_room:
            await coordinator.async_send_room_command(target_room, payload)
        elif target_dev:
            await coordinator.async_send_device_command(target_dev, payload)

    hass.services.async_register(
        DOMAIN,
        SERVICE_EXECUTE_ROUTINE,
        handle_execute_routine,
        schema=vol.Schema({vol.Required(ATTR_ROUTINE_ID): cv.string}),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_SIMULATE_WEATHER,
        handle_simulate_weather,
        schema=vol.Schema({vol.Required(ATTR_CONDITION): cv.string}),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_SYNC_WEATHER_NOW,
        handle_sync_weather_now,
        schema=vol.Schema({}),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_APPLY_PALETTE,
        handle_apply_palette,
        schema=vol.Schema(
            {
                vol.Required(ATTR_PALETTE_ID): cv.string,
                vol.Optional(ATTR_GROUP_ID): cv.string,
                vol.Optional(ATTR_ROOM_ID): cv.string,
                vol.Optional(ATTR_DEVICE_ID): cv.string,
            }
        ),
    )

    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a WLEDashboard config entry."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        coordinator: WLEDashboardCoordinator = hass.data[DOMAIN].pop(entry.entry_id)
        await coordinator.async_close()

    return unload_ok
