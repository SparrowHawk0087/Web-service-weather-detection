import io
import unittest
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

import main


def make_upload() -> UploadFile:
    return UploadFile(
        filename="sample.png",
        file=io.BytesIO(b"fake image bytes"),
        headers=Headers({"content-type": "image/png"}),
    )


class MockPredictionTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        main._requests_seen = 0

    async def test_fixed_weather_scenario_returns_deterministic_class(self):
        with patch.object(main, "MOCK_SCENARIO", "rain"), patch.object(
            main, "MOCK_DELAY_SECONDS", 0
        ):
            response = await main.predict_weather(make_upload(), "vision-v1")

        self.assertEqual(response["prediction"]["class"], "rain")
        self.assertEqual(response["prediction"]["label"], "Дождь")
        self.assertEqual(response["model_used"], "vision-v1")

    async def test_invalid_image_scenario_returns_bad_request(self):
        with patch.object(main, "MOCK_SCENARIO", "invalid_image"), patch.object(
            main, "MOCK_DELAY_SECONDS", 0
        ):
            with self.assertRaises(HTTPException) as error:
                await main.predict_weather(make_upload(), "vision-v1")

        self.assertEqual(error.exception.status_code, 400)

    async def test_unavailable_scenario_returns_service_unavailable(self):
        with patch.object(main, "MOCK_SCENARIO", "unavailable"), patch.object(
            main, "MOCK_DELAY_SECONDS", 0
        ):
            with self.assertRaises(HTTPException) as error:
                await main.predict_weather(make_upload(), "vision-v1")

        self.assertEqual(error.exception.status_code, 503)

    async def test_internal_error_scenario_returns_server_error(self):
        with patch.object(main, "MOCK_SCENARIO", "internal_error"), patch.object(
            main, "MOCK_DELAY_SECONDS", 0
        ):
            with self.assertRaises(HTTPException) as error:
                await main.predict_weather(make_upload(), "vision-v1")

        self.assertEqual(error.exception.status_code, 500)

    async def test_first_n_failures_then_success(self):
        with (
            patch.object(main, "MOCK_SCENARIO", "snow"),
            patch.object(main, "MOCK_DELAY_SECONDS", 0),
            patch.object(main, "MOCK_FAIL_FIRST_N_REQUESTS", 1),
        ):
            with self.assertRaises(HTTPException) as error:
                await main.predict_weather(make_upload(), "vision-v1")

            self.assertEqual(error.exception.status_code, 503)

            response = await main.predict_weather(make_upload(), "vision-v1")

        self.assertEqual(response["prediction"]["class"], "snow")


if __name__ == "__main__":
    unittest.main()
