// Weather forecast for exterior locations (v2.0 §1.10). Uses open-meteo —
// free, keyless, no signup. Degrades gracefully: any failure returns null
// and the UI simply hides the forecast.

export interface DailyForecast {
  date: string // YYYY-MM-DD
  weatherCode: number
  tempMax: number | null
  tempMin: number | null
  precipitationProb: number | null
  sunrise: string | null
  sunset: string | null
}

// WMO weather codes → short label + emoji (open-meteo uses WMO codes)
const WMO: Record<number, { label: string; icon: string }> = {
  0: { label: "Clear", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Drizzle", icon: "🌦️" },
  55: { label: "Heavy drizzle", icon: "🌧️" },
  61: { label: "Light rain", icon: "🌦️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  71: { label: "Light snow", icon: "🌨️" },
  73: { label: "Snow", icon: "❄️" },
  75: { label: "Heavy snow", icon: "❄️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Showers", icon: "🌧️" },
  82: { label: "Violent showers", icon: "⛈️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm + hail", icon: "⛈️" },
  99: { label: "Severe thunderstorm", icon: "⛈️" },
}

export function describeWeather(code: number): { label: string; icon: string } {
  return WMO[code] ?? { label: "—", icon: "❓" }
}

interface OpenMeteoDaily {
  time: string[]
  weathercode: number[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_probability_max: (number | null)[]
  sunrise: string[]
  sunset: string[]
}

// open-meteo forecast reaches ~16 days ahead. Requests outside that window
// yield no rows — we return an empty list rather than erroring.
export async function getForecast(
  lat: number,
  lng: number,
  dates: string[]
): Promise<DailyForecast[] | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || dates.length === 0) return null

  const sorted = [...dates].sort()
  const start = sorted[0]!
  const end = sorted[sorted.length - 1]!

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset` +
    `&timezone=auto&start_date=${start}&end_date=${end}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null
    const json = (await res.json()) as { daily?: OpenMeteoDaily }
    const d = json.daily
    if (!d?.time) return null

    const wanted = new Set(dates)
    const out: DailyForecast[] = []
    d.time.forEach((date, i) => {
      if (!wanted.has(date)) return
      out.push({
        date,
        weatherCode: d.weathercode[i] ?? 0,
        tempMax: d.temperature_2m_max[i] ?? null,
        tempMin: d.temperature_2m_min[i] ?? null,
        precipitationProb: d.precipitation_probability_max[i] ?? null,
        sunrise: d.sunrise[i] ?? null,
        sunset: d.sunset[i] ?? null,
      })
    })
    return out
  } catch {
    return null // network error, abort, bad JSON — all degrade to "no forecast"
  }
}
