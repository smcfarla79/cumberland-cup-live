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
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export type WeatherSceneKind =
  | "clear"
  | "partly"
  | "overcast"
  | "fog"
  | "rain"
  | "snow"
  | "storm";

export type WeatherSceneTheme = {
  kind: WeatherSceneKind;
  /** Full CSS background for the weather card */
  background: string;
  heading: string;
  body: string;
  muted: string;
  chipBg: string;
  chipBorder: string;
};

/** Visual theme for the Home weather card from a WMO code. */
export function weatherSceneTheme(code: number): WeatherSceneTheme {
  if (code === 0 || code === 1) {
    return {
      kind: "clear",
      background:
        "radial-gradient(ellipse 80% 60% at 85% 15%, #fff6c8 0%, transparent 45%), linear-gradient(165deg, #5eb0e8 0%, #87ceeb 45%, #c8e8f8 100%)",
      heading: "#16352a",
      body: "#14201b",
      muted: "#3d5a4c",
      chipBg: "rgba(255,255,255,0.45)",
      chipBorder: "rgba(20,32,27,0.12)",
    };
  }
  if (code === 2) {
    return {
      kind: "partly",
      background:
        "radial-gradient(ellipse 55% 45% at 80% 18%, #ffe9a8 0%, transparent 50%), linear-gradient(165deg, #6aa8d8 0%, #9bc4e0 40%, #d0e4f0 100%)",
      heading: "#16352a",
      body: "#14201b",
      muted: "#3d5a4c",
      chipBg: "rgba(255,255,255,0.5)",
      chipBorder: "rgba(20,32,27,0.12)",
    };
  }
  if (code === 3) {
    return {
      kind: "overcast",
      background: "linear-gradient(165deg, #7a8a98 0%, #9aa8b4 50%, #b8c4cc 100%)",
      heading: "#14201b",
      body: "#14201b",
      muted: "#3a4a52",
      chipBg: "rgba(255,255,255,0.4)",
      chipBorder: "rgba(20,32,27,0.14)",
    };
  }
  if (code === 45 || code === 48) {
    return {
      kind: "fog",
      background: "linear-gradient(165deg, #9aa6ae 0%, #c5ced4 55%, #e0e6ea 100%)",
      heading: "#14201b",
      body: "#14201b",
      muted: "#4a565e",
      chipBg: "rgba(255,255,255,0.45)",
      chipBorder: "rgba(20,32,27,0.12)",
    };
  }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return {
      kind: "snow",
      background: "linear-gradient(165deg, #8aa9b8 0%, #c5d0dc 50%, #e8eef4 100%)",
      heading: "#14201b",
      body: "#14201b",
      muted: "#3d4a55",
      chipBg: "rgba(255,255,255,0.5)",
      chipBorder: "rgba(20,32,27,0.12)",
    };
  }
  if (code === 95 || code >= 96) {
    return {
      kind: "storm",
      background:
        "radial-gradient(ellipse 50% 40% at 70% 20%, #5a6a88 0%, transparent 55%), linear-gradient(165deg, #2a3344 0%, #3d4a5c 45%, #5a6878 100%)",
      heading: "#f3f6f4",
      body: "#f3f6f4",
      muted: "rgba(243,246,244,0.75)",
      chipBg: "rgba(255,255,255,0.12)",
      chipBorder: "rgba(255,255,255,0.2)",
    };
  }
  // drizzle, rain, showers
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82)
  ) {
    return {
      kind: "rain",
      background:
        "linear-gradient(165deg, #5a6e82 0%, #7a8fa0 40%, #9aafbc 100%)",
      heading: "#14201b",
      body: "#14201b",
      muted: "#2f3d48",
      chipBg: "rgba(255,255,255,0.4)",
      chipBorder: "rgba(20,32,27,0.14)",
    };
  }
  return {
    kind: "partly",
    background: "linear-gradient(165deg, #6aa8d8 0%, #b8d4e8 100%)",
    heading: "#16352a",
    body: "#14201b",
    muted: "#3d5a4c",
    chipBg: "rgba(255,255,255,0.45)",
    chipBorder: "rgba(20,32,27,0.12)",
  };
}
