"""Button platform for WLEDashboard (Routines and Action Triggers)."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import WLEDashboardCoordinator

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up WLEDashboard button platform."""
    coordinator: WLEDashboardCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities: list[ButtonEntity] = []

    # 1. Timeline Routine Buttons
    for rt_id, rt_data in coordinator.data.get("routines", {}).items():
        entities.append(WLEDashboardRoutineButton(coordinator, rt_id))

    # 2. System Action Buttons
    entities.append(WLEDashboardWeatherSyncButton(coordinator))
    entities.append(WLEDashboardMdnsRescanButton(coordinator))

    async_add_entities(entities)


class WLEDashboardRoutineButton(CoordinatorEntity[WLEDashboardCoordinator], ButtonEntity):
    """Button to trigger a multi-step timeline routine."""

    def __init__(self, coordinator: WLEDashboardCoordinator, routine_id: str) -> None:
        """Initialize the routine button."""
        super().__init__(coordinator)
        self.routine_id = routine_id
        self._attr_unique_id = f"wledashboard_routine_{routine_id}"

    @property
    def routine_data(self) -> dict[str, Any]:
        """Return routine data from coordinator."""
        return self.coordinator.data.get("routines", {}).get(self.routine_id, {})

    @property
    def name(self) -> str:
        """Return button name."""
        return f"Routine: {self.routine_data.get('name', self.routine_id)}"

    @property
    def device_info(self) -> DeviceInfo:
        """Return device registry information."""
        return DeviceInfo(
            identifiers={(DOMAIN, "routines")},
            name="WLEDashboard Routines",
            manufacturer="WLEDashboard",
            model="Animation Timeline Engine",
        )

    async def async_press(self) -> None:
        """Press the button to execute the routine."""
        await self.coordinator.async_execute_routine(self.routine_id)


class WLEDashboardWeatherSyncButton(CoordinatorEntity[WLEDashboardCoordinator], ButtonEntity):
    """Button to manually force instant weather polling and sync to lights."""

    _attr_unique_id = "wledashboard_btn_weather_sync_now"

    def __init__(self, coordinator: WLEDashboardCoordinator) -> None:
        """Initialize the weather sync button."""
        super().__init__(coordinator)

    @property
    def name(self) -> str:
        """Return button name."""
        return "Sync Weather Lighting Now"

    @property
    def device_info(self) -> DeviceInfo:
        """Return device registry information."""
        return DeviceInfo(
            identifiers={(DOMAIN, "weather_engine")},
            name="WLEDashboard Weather Engine",
            manufacturer="WLEDashboard",
            model="Dynamic Weather Sync",
        )

    async def async_press(self) -> None:
        """Trigger immediate weather sync."""
        await self.coordinator.async_sync_weather_now()


class WLEDashboardMdnsRescanButton(CoordinatorEntity[WLEDashboardCoordinator], ButtonEntity):
    """Button to trigger an mDNS network scan for new WLED devices."""

    _attr_unique_id = "wledashboard_btn_mdns_rescan"

    def __init__(self, coordinator: WLEDashboardCoordinator) -> None:
        """Initialize the mDNS rescan button."""
        super().__init__(coordinator)

    @property
    def name(self) -> str:
        """Return button name."""
        return "Rescan Network for WLED Devices"

    @property
    def device_info(self) -> DeviceInfo:
        """Return device registry information."""
        return DeviceInfo(
            identifiers={(DOMAIN, "core_hub")},
            name="WLEDashboard Core Hub",
            manufacturer="WLEDashboard",
            model="Local-First Lighting Server",
        )

    async def async_press(self) -> None:
        """Trigger device rescan."""
        await self.coordinator.async_request("POST", "/devices/scan")
        await self.coordinator.async_request_refresh()
