/** Sewanee / The Course at Sewanee — Open-Meteo (no API key). */

export const SEWANEE_COORDS = {
  latitude: 35.2042,
  longitude: -85.9214,
  label: "Sewanee, TN",
  timezone: "America/Chicago",
} as const;

export type WeatherSnapshot = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windMph: number;
  weatherCode: number;
  label: string;
  updatedAt: string;
  daily: Array<{
    date: string;
    high: number;
    low: number;
    precipChance: number;
    weatherCode: number;
    label: string;
  }>;
};

/** WMO weather interpretation codes → short label. */
export function weatherCodeLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code >= 96 && code <= 99) return "Storm + hail";
  return "Mixed";
}

type OpenMeteoResponse = {
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};

export async function fetchSewaneeWeather(): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(SEWANEE_COORDS.latitude),
    longitude: String(SEWANEE_COORDS.longitude),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "weather_code",
      "wind_speed_10m",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
    ].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: SEWANEE_COORDS.timezone,
    forecast_days: "4",
  });

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
  );
  if (!res.ok) throw new Error("Weather unavailable");

  const data = (await res.json()) as OpenMeteoResponse;
  const current = data.current;
  if (!current) throw new Error("Weather unavailable");

  const daily = (data.daily?.time ?? []).map((date, i) => {
    const code = data.daily!.weather_code[i] ?? 0;
    return {
      date,
      high: Math.round(data.daily!.temperature_2m_max[i] ?? 0),
      low: Math.round(data.daily!.temperature_2m_min[i] ?? 0),
      precipChance: data.daily!.precipitation_probability_max[i] ?? 0,
      weatherCode: code,
      label: weatherCodeLabel(code),
    };
  });

  return {
    temperature: Math.round(current.temperature_2m),
    feelsLike: Math.round(current.apparent_temperature),
    humidity: current.relative_humidity_2m,
    windMph: Math.round(current.wind_speed_10m),
    weatherCode: current.weather_code,
    label: weatherCodeLabel(current.weather_code),
    updatedAt: current.time,
    daily,
  };
}

export function formatForecastDay(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
