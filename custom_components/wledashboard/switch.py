"""Switch platform for WLEDashboard (Weather and Spotify Sync Toggles)."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.switch import SwitchEntity
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
    """Set up WLEDashboard switch platform."""
    coordinator: WLEDashboardCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities: list[SwitchEntity] = []

    # Weather & Spotify sync switches for devices
    for dev_id in coordinator.data.get("devices", {}):
        entities.append(WLEDashboardDeviceWeatherSwitch(coordinator, dev_id))
        entities.append(WLEDashboardDeviceSpotifySwitch(coordinator, dev_id))

    # Weather & Spotify sync switches for groups
    for grp_id in coordinator.data.get("groups", {}):
        entities.append(WLEDashboardGroupWeatherSwitch(coordinator, grp_id))
        entities.append(WLEDashboardGroupSpotifySwitch(coordinator, grp_id))

    async_add_entities(entities)


class WLEDashboardDeviceWeatherSwitch(CoordinatorEntity[WLEDashboardCoordinator], SwitchEntity):
    """Switch to toggle weather sync for a device."""

    def __init__(self, coordinator: WLEDashboardCoordinator, device_id: str) -> None:
        """Initialize the switch."""
        super().__init__(coordinator)
        self.device_id = device_id
        self._attr_unique_id = f"wledashboard_sw_weather_dev_{device_id}"

    @property
    def device_data(self) -> dict[str, Any]:
        """Return device data."""
        return self.coordinator.data.get("devices", {}).get(self.device_id, {})

    @property
    def name(self) -> str:
        """Return switch name."""
        return f"{self.device_data.get('name', self.device_id)} Weather Sync"

    @property
    def is_on(self) -> bool:
        """Return true if weather sync is enabled."""
        return bool(self.device_data.get("weather_sync_enabled", 0))

    @property
    def device_info(self) -> DeviceInfo:
        """Return device registry info."""
        return DeviceInfo(
            identifiers={(DOMAIN, f"dev_{self.device_id}")},
            name=self.device_data.get("name", self.device_id),
        )

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Enable weather sync."""
        await self.coordinator.async_request("PATCH", f"/devices/{self.device_id}", {"weather_sync_enabled": 1})
        await self.coordinator.async_request_refresh()

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Disable weather sync."""
        await self.coordinator.async_request("PATCH", f"/devices/{self.device_id}", {"weather_sync_enabled": 0})
        await self.coordinator.async_request_refresh()


class WLEDashboardDeviceSpotifySwitch(CoordinatorEntity[WLEDashboardCoordinator], SwitchEntity):
    """Switch to toggle Spotify sync for a device."""

    def __init__(self, coordinator: WLEDashboardCoordinator, device_id: str) -> None:
        """Initialize the switch."""
        super().__init__(coordinator)
        self.device_id = device_id
        self._attr_unique_id = f"wledashboard_sw_spotify_dev_{device_id}"

    @property
    def device_data(self) -> dict[str, Any]:
        """Return device data."""
        return self.coordinator.data.get("devices", {}).get(self.device_id, {})

    @property
    def name(self) -> str:
        """Return switch name."""
        return f"{self.device_data.get('name', self.device_id)} Spotify Sync"

    @property
    def is_on(self) -> bool:
        """Return true if Spotify sync is enabled."""
        return bool(self.device_data.get("spotify_sync_enabled", 0))

    @property
    def device_info(self) -> DeviceInfo:
        """Return device registry info."""
        return DeviceInfo(
            identifiers={(DOMAIN, f"dev_{self.device_id}")},
            name=self.device_data.get("name", self.device_id),
        )

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Enable Spotify sync."""
        await self.coordinator.async_request("PATCH", f"/devices/{self.device_id}", {"spotify_sync_enabled": 1})
        await self.coordinator.async_request_refresh()

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Disable Spotify sync."""
        await self.coordinator.async_request("PATCH", f"/devices/{self.device_id}", {"spotify_sync_enabled": 0})
        await self.coordinator.async_request_refresh()


class WLEDashboardGroupWeatherSwitch(CoordinatorEntity[WLEDashboardCoordinator], SwitchEntity):
    """Switch to toggle weather sync for a group."""

    def __init__(self, coordinator: WLEDashboardCoordinator, group_id: str) -> None:
        """Initialize the switch."""
        super().__init__(coordinator)
        self.group_id = group_id
        self._attr_unique_id = f"wledashboard_sw_weather_grp_{group_id}"

    @property
    def group_data(self) -> dict[str, Any]:
        """Return group data."""
        return self.coordinator.data.get("groups", {}).get(self.group_id, {})

    @property
    def name(self) -> str:
        """Return switch name."""
        return f"Group {self.group_data.get('name', self.group_id)} Weather Sync"

    @property
    def is_on(self) -> bool:
        """Return true if weather sync is enabled."""
        return bool(self.group_data.get("weather_sync_enabled", 0))

    @property
    def device_info(self) -> DeviceInfo:
        """Return device registry info."""
        return DeviceInfo(
            identifiers={(DOMAIN, f"grp_{self.group_id}")},
            name=f"Group: {self.group_data.get('name', self.group_id)}",
        )

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Enable weather sync."""
        await self.coordinator.async_request("PATCH", f"/groups/{self.group_id}", {"weather_sync_enabled": 1})
        await self.coordinator.async_request_refresh()

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Disable weather sync."""
        await self.coordinator.async_request("PATCH", f"/groups/{self.group_id}", {"weather_sync_enabled": 0})
        await self.coordinator.async_request_refresh()


class WLEDashboardGroupSpotifySwitch(CoordinatorEntity[WLEDashboardCoordinator], SwitchEntity):
    """Switch to toggle Spotify sync for a group."""

    def __init__(self, coordinator: WLEDashboardCoordinator, group_id: str) -> None:
        """Initialize the switch."""
        super().__init__(coordinator)
        self.group_id = group_id
        self._attr_unique_id = f"wledashboard_sw_spotify_grp_{group_id}"

    @property
    def group_data(self) -> dict[str, Any]:
        """Return group data."""
        return self.coordinator.data.get("groups", {}).get(self.group_id, {})

    @property
    def name(self) -> str:
        """Return switch name."""
        return f"Group {self.group_data.get('name', self.group_id)} Spotify Sync"

    @property
    def is_on(self) -> bool:
        """Return true if Spotify sync is enabled."""
        return bool(self.group_data.get("spotify_sync_enabled", 0))

    @property
    def device_info(self) -> DeviceInfo:
        """Return device registry info."""
        return DeviceInfo(
            identifiers={(DOMAIN, f"grp_{self.group_id}")},
            name=f"Group: {self.group_data.get('name', self.group_id)}",
        )

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Enable Spotify sync."""
        await self.coordinator.async_request("PATCH", f"/groups/{self.group_id}", {"spotify_sync_enabled": 1})
        await self.coordinator.async_request_refresh()

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Disable Spotify sync."""
        await self.coordinator.async_request("PATCH", f"/groups/{self.group_id}", {"spotify_sync_enabled": 0})
        await self.coordinator.async_request_refresh()
