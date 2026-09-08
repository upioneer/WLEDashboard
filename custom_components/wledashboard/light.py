"""Light platform for WLEDashboard (Devices, Groups, and 3D Spatial Rooms)."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.light import (
    ATTR_BRIGHTNESS,
    ATTR_EFFECT,
    ATTR_RGB_COLOR,
    ColorMode,
    LightEntity,
    LightEntityFeature,
)
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
    """Set up WLEDashboard light platform."""
    coordinator: WLEDashboardCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities: list[LightEntity] = []

    # 1. Individual Device Lights
    for dev_id, dev_data in coordinator.data.get("devices", {}).items():
        entities.append(WLEDashboardDeviceLight(coordinator, dev_id))

    # 2. Lighting Groups (Zones, Scenes, Clusters)
    for grp_id, grp_data in coordinator.data.get("groups", {}).items():
        entities.append(WLEDashboardGroupLight(coordinator, grp_id))

    # 3. 3D Spatial Rooms
    for room_id, room_data in coordinator.data.get("rooms", {}).items():
        entities.append(WLEDashboardRoomLight(coordinator, room_id))

    async_add_entities(entities)


class WLEDashboardDeviceLight(CoordinatorEntity[WLEDashboardCoordinator], LightEntity):
    """Representation of a direct WLED controller."""

    _attr_color_mode = ColorMode.RGB
    _attr_supported_color_modes = {ColorMode.RGB, ColorMode.BRIGHTNESS, ColorMode.ONOFF}
    _attr_supported_features = LightEntityFeature.EFFECT

    def __init__(self, coordinator: WLEDashboardCoordinator, device_id: str) -> None:
        """Initialize the device light."""
        super().__init__(coordinator)
        self.device_id = device_id
        self._attr_unique_id = f"wledashboard_dev_{device_id}"

    @property
    def device_data(self) -> dict[str, Any]:
        """Return the device data from coordinator."""
        return self.coordinator.data.get("devices", {}).get(self.device_id, {})

    @property
    def name(self) -> str:
        """Return the name of the light."""
        return self.device_data.get("name", f"WLED {self.device_id}")

    @property
    def is_on(self) -> bool:
        """Return true if device is on."""
        live_state = self.device_data.get("liveState", {})
        return bool(live_state.get("on", False))

    @property
    def brightness(self) -> int | None:
        """Return the brightness of the light."""
        live_state = self.device_data.get("liveState", {})
        return live_state.get("bri")

    @property
    def rgb_color(self) -> tuple[int, int, int] | None:
        """Return the rgb color value."""
        live_state = self.device_data.get("liveState", {})
        segs = live_state.get("seg", [])
        if segs and "col" in segs[0] and segs[0]["col"]:
            col = segs[0]["col"][0]
            if len(col) >= 3:
                return (col[0], col[1], col[2])
        return None

    @property
    def available(self) -> bool:
        """Return if entity is available."""
        return bool(self.device_data.get("is_online", 1))

    @property
    def device_info(self) -> DeviceInfo:
        """Return device registry information."""
        return DeviceInfo(
            identifiers={(DOMAIN, f"dev_{self.device_id}")},
            name=self.name,
            manufacturer="WLED",
            model="WLED Controller",
            sw_version=self.device_data.get("firmware_ver", "0.14.0"),
        )

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Turn on the device light."""
        cmd: dict[str, Any] = {"on": True}
        if ATTR_BRIGHTNESS in kwargs:
            cmd["bri"] = kwargs[ATTR_BRIGHTNESS]
        if ATTR_RGB_COLOR in kwargs:
            r, g, b = kwargs[ATTR_RGB_COLOR]
            cmd["seg"] = [{"col": [[r, g, b]]}]
        if ATTR_EFFECT in kwargs:
            # If effect index is provided
            pass
        await self.coordinator.async_send_device_command(self.device_id, cmd)

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Turn off the device light."""
        await self.coordinator.async_send_device_command(self.device_id, {"on": False})


class WLEDashboardGroupLight(CoordinatorEntity[WLEDashboardCoordinator], LightEntity):
    """Representation of a WLEDashboard lighting group or zone."""

    _attr_color_mode = ColorMode.RGB
    _attr_supported_color_modes = {ColorMode.RGB, ColorMode.BRIGHTNESS, ColorMode.ONOFF}

    def __init__(self, coordinator: WLEDashboardCoordinator, group_id: str) -> None:
        """Initialize the group light."""
        super().__init__(coordinator)
        self.group_id = group_id
        self._attr_unique_id = f"wledashboard_grp_{group_id}"

    @property
    def group_data(self) -> dict[str, Any]:
        """Return group data from coordinator."""
        return self.coordinator.data.get("groups", {}).get(self.group_id, {})

    @property
    def name(self) -> str:
        """Return the group name."""
        return f"Group: {self.group_data.get('name', self.group_id)}"

    @property
    def is_on(self) -> bool:
        """Return true if any member device is on."""
        member_ids = self.group_data.get("device_ids", [])
        devices = self.coordinator.data.get("devices", {})
        for dev_id in member_ids:
            dev = devices.get(dev_id, {})
            if dev.get("liveState", {}).get("on"):
                return True
        return False

    @property
    def device_info(self) -> DeviceInfo:
        """Return device registry information."""
        return DeviceInfo(
            identifiers={(DOMAIN, f"grp_{self.group_id}")},
            name=self.name,
            manufacturer="WLEDashboard",
            model=f"Lighting Group ({self.group_data.get('type', 'custom')})",
            suggested_area=self.group_data.get("name"),
        )

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Turn on all devices in the group."""
        cmd: dict[str, Any] = {"on": True}
        if ATTR_BRIGHTNESS in kwargs:
            cmd["bri"] = kwargs[ATTR_BRIGHTNESS]
        if ATTR_RGB_COLOR in kwargs:
            r, g, b = kwargs[ATTR_RGB_COLOR]
            cmd["seg"] = [{"col": [[r, g, b]]}]
        await self.coordinator.async_send_group_command(self.group_id, cmd)

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Turn off all devices in the group."""
        await self.coordinator.async_send_group_command(self.group_id, {"on": False})


class WLEDashboardRoomLight(CoordinatorEntity[WLEDashboardCoordinator], LightEntity):
    """Representation of a 3D Spatial Room coordinating all anchored fixtures."""

    _attr_color_mode = ColorMode.RGB
    _attr_supported_color_modes = {ColorMode.RGB, ColorMode.BRIGHTNESS, ColorMode.ONOFF}

    def __init__(self, coordinator: WLEDashboardCoordinator, room_id: str) -> None:
        """Initialize the room light."""
        super().__init__(coordinator)
        self.room_id = room_id
        self._attr_unique_id = f"wledashboard_room_{room_id}"

    @property
    def room_data(self) -> dict[str, Any]:
        """Return room data from coordinator."""
        return self.coordinator.data.get("rooms", {}).get(self.room_id, {})

    @property
    def name(self) -> str:
        """Return the room name."""
        return f"Room: {self.room_data.get('name', self.room_id)}"

    @property
    def is_on(self) -> bool:
        """Return true if any anchored device in the room is on."""
        anchors = self.room_data.get("anchors", [])
        devices = self.coordinator.data.get("devices", {})
        for anchor in anchors:
            dev_id = anchor.get("device_id")
            if dev_id and devices.get(dev_id, {}).get("liveState", {}).get("on"):
                return True
        return False

    @property
    def device_info(self) -> DeviceInfo:
        """Return device registry information."""
        return DeviceInfo(
            identifiers={(DOMAIN, f"room_{self.room_id}")},
            name=self.name,
            manufacturer="WLEDashboard",
            model="Spatial 3D Room Anchor Coordinator",
            suggested_area=self.room_data.get("name"),
        )

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Turn on all fixtures anchored in this room."""
        cmd: dict[str, Any] = {"on": True}
        if ATTR_BRIGHTNESS in kwargs:
            cmd["bri"] = kwargs[ATTR_BRIGHTNESS]
        if ATTR_RGB_COLOR in kwargs:
            r, g, b = kwargs[ATTR_RGB_COLOR]
            cmd["seg"] = [{"col": [[r, g, b]]}]
        await self.coordinator.async_send_room_command(self.room_id, cmd)

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Turn off all fixtures anchored in this room."""
        await self.coordinator.async_send_room_command(self.room_id, {"on": False})
