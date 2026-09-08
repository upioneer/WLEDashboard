"""Config flow for WLEDashboard integration."""
from __future__ import annotations

import logging
from typing import Any

import aiohttp
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.const import CONF_HOST, CONF_PORT, CONF_SSL
from homeassistant.data_entry_flow import FlowResult
import homeassistant.helpers.config_validation as cv

from .const import CONF_API_TOKEN, DEFAULT_PORT, DOMAIN

_LOGGER = logging.getLogger(__name__)

STEP_USER_DATA_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_HOST, default="localhost"): cv.string,
        vol.Required(CONF_PORT, default=DEFAULT_PORT): cv.port,
        vol.Optional(CONF_API_TOKEN): cv.string,
        vol.Optional(CONF_SSL, default=False): cv.boolean,
    }
)

class WLEDashboardConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for WLEDashboard."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial user step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            host = user_input[CONF_HOST]
            port = user_input[CONF_PORT]
            api_token = user_input.get(CONF_API_TOKEN)
            use_ssl = user_input.get(CONF_SSL, False)

            # Unique ID based on host and port
            await self.async_set_unique_id(f"{host}:{port}")
            self._abort_if_unique_id_configured()

            # Test connection to WLEDashboard API
            proto = "https" if use_ssl else "http"
            url = f"{proto}://{host}:{port}/api/health"
            headers = {}
            if api_token:
                headers["Authorization"] = f"Bearer {api_token}"

            try:
                async with aiohttp.ClientSession(headers=headers) as session:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                        if response.status == 200:
                            return self.async_create_entry(
                                title=f"WLEDashboard ({host}:{port})",
                                data=user_input,
                            )
                        errors["base"] = "invalid_auth" if response.status == 401 else "cannot_connect"
            except aiohttp.ClientConnectorError:
                errors["base"] = "cannot_connect"
            except TimeoutError:
                errors["base"] = "timeout_connect"
            except Exception as ex:  # pylint: disable=broad-except
                _LOGGER.exception("Unexpected exception in WLEDashboard config flow: %s", ex)
                errors["base"] = "unknown"

        return self.async_show_form(
            step_id="user",
            data_schema=STEP_USER_DATA_SCHEMA,
            errors=errors,
        )
