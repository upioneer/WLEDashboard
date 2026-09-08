"""DataUpdateCoordinator for WLEDashboard."""
from __future__ import annotations

import asyncio
from datetime import timedelta
import logging
from typing import Any

import aiohttp

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

class WLEDashboardCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Coordinator to fetch data and manage WebSocket streaming from WLEDashboard API."""

    def __init__(
        self,
        hass: HomeAssistant,
        host: str,
        port: int,
        api_token: str | None = None,
        use_ssl: bool = False,
    ) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=10),
        )
        self.host = host
        self.port = port
        self.api_token = api_token
        self.use_ssl = use_ssl
        proto = "https" if use_ssl else "http"
        self.base_url = f"{proto}://{host}:{port}/api"
        self._session: aiohttp.ClientSession | None = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create an aiohttp client session."""
        if self._session is None or self._session.closed:
            headers = {}
            if self.api_token:
                headers["Authorization"] = f"Bearer {self.api_token}"
            self._session = aiohttp.ClientSession(headers=headers)
        return self._session

    async def async_request(self, method: str, endpoint: str, json_data: dict[str, Any] | None = None) -> Any:
        """Send an authenticated HTTP request to the WLEDashboard API."""
        session = await self._get_session()
        url = f"{self.base_url}{endpoint}"
        try:
            async with session.request(method, url, json=json_data, timeout=aiohttp.ClientTimeout(total=8)) as response:
                if response.status >= 400:
                    text = await response.text()
                    raise UpdateFailed(f"Error communicating with WLEDashboard API ({response.status}): {text}")
                if response.status == 204:
                    return None
                return await response.json()
        except asyncio.TimeoutError as err:
            raise UpdateFailed(f"Timeout communicating with WLEDashboard at {url}") from err
        except aiohttp.ClientError as err:
            raise UpdateFailed(f"Network error communicating with WLEDashboard: {err}") from err

    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch latest state of all devices, groups, rooms, routines, and weather from WLEDashboard."""
        try:
            async with asyncio.TaskGroup() as tg:
                t_devices = tg.create_task(self.async_request("GET", "/devices"))
                t_groups = tg.create_task(self.async_request("GET", "/groups"))
                t_spatial = tg.create_task(self.async_request("GET", "/spatial/hierarchy"))
                t_routines = tg.create_task(self.async_request("GET", "/automation/routines"))
                t_weather = tg.create_task(self.async_request("GET", "/weather/current"))

            devices = t_devices.result() or []
            groups = t_groups.result() or []
            spatial = t_spatial.result() or []
            routines = t_routines.result() or []
            weather = t_weather.result() or {}

            # Flatten rooms from spatial hierarchy
            rooms = []
            for dwelling in spatial:
                for floor in dwelling.get("floors", []):
                    for room in floor.get("rooms", []):
                        rooms.append({
                            **room,
                            "dwelling_name": dwelling.get("name"),
                            "floor_name": floor.get("name"),
                        })

            return {
                "devices": {d["id"]: d for d in devices},
                "groups": {g["id"]: g for g in groups},
                "rooms": {r["id"]: r for r in rooms},
                "routines": {rt["id"]: rt for rt in routines},
                "weather": weather.get("state", {}),
                "mappings": weather.get("mappings", {}),
            }
        except Exception as err:
            raise UpdateFailed(f"Failed to refresh WLEDashboard data: {err}") from err

    async def async_send_device_command(self, device_id: str, payload: dict[str, Any]) -> None:
        """Send a live command to a specific device."""
        await self.async_request("POST", f"/devices/{device_id}/command", payload)
        await self.async_request_refresh()

    async def async_send_group_command(self, group_id: str, payload: dict[str, Any]) -> None:
        """Send a live command to a group."""
        await self.async_request("POST", f"/groups/{group_id}/command", payload)
        await self.async_request_refresh()

    async def async_send_room_command(self, room_id: str, payload: dict[str, Any]) -> None:
        """Send a live command to all fixtures in a spatial 3D room."""
        room = self.data.get("rooms", {}).get(room_id)
        if not room:
            return
        anchors = room.get("anchors", [])
        tasks = []
        for anchor in anchors:
            dev_id = anchor.get("device_id")
            if dev_id:
                tasks.append(self.async_send_device_command(dev_id, payload))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
            await self.async_request_refresh()

    async def async_execute_routine(self, routine_id: str) -> None:
        """Execute a multi-step timeline routine."""
        await self.async_request("POST", f"/automation/routines/{routine_id}/execute")

    async def async_sync_weather_now(self) -> None:
        """Trigger an instant weather fetch and sync to lights."""
        await self.async_request("POST", "/weather/sync-now")
        await self.async_request_refresh()

    async def async_simulate_weather(self, condition: str) -> None:
        """Simulate a specific weather condition across all sync targets."""
        await self.async_request("POST", "/weather/test", {"condition": condition})
        await self.async_request_refresh()

    async def async_close(self) -> None:
        """Close the underlying aiohttp session."""
        if self._session and not self._session.closed:
            await self._session.close()
