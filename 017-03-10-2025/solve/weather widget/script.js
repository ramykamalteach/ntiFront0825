// Basic config
const API_KEY = '545d7bf8-a056-11f0-bfe4-0242ac130006-545d7ca2-a056-11f0-bfe4-0242ac130006';
const API_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Elements
const form = document.getElementById('searchForm');
const input = document.getElementById('cityInput');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const cityNameEl = document.getElementById('cityName');
const conditionTextEl = document.getElementById('conditionText');
const tempValueEl = document.getElementById('tempValue');
const feelsLikeEl = document.getElementById('feelsLike');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');
const pressureEl = document.getElementById('pressure');
const iconImg = document.getElementById('iconImg');
const themeToggle = document.getElementById('themeToggle');
const keyBtn = document.getElementById('keyBtn');

// Utilities
function setStatus(msg, isError = false) {
  statusEl.textContent = msg || '';
  statusEl.style.color = isError ? '#ef4444' : 'var(--muted)';
}

// ---------- Open-Meteo Fallback (no API key) ----------
async function geocodeCityOpenMeteo(city) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', city);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status} ${res.statusText}`);
  const json = await res.json();
  const first = json.results && json.results[0];
  if (!first) throw new Error('City not found');
  return {
    name: first.name,
    country: first.country_code || first.country || '',
    lat: first.latitude,
    lon: first.longitude,
  };
}

function mapOpenMeteoToOwmIcon(code, isDay) {
  const d = isDay ? 'd' : 'n';
  if (code === 0) return `01${d}`; // Clear
  if ([1].includes(code)) return `02${d}`; // Mainly clear
  if ([2].includes(code)) return `03${d}`; // Partly cloudy
  if ([3].includes(code)) return `04${d}`; // Overcast
  if ([45, 48].includes(code)) return `50${d}`; // Fog
  if ([51, 53, 55, 56, 57].includes(code)) return `09${d}`; // Drizzle
  if ([61, 63, 65, 80, 81, 82].includes(code)) return `10${d}`; // Rain
  if ([71, 73, 75, 77, 85, 86].includes(code)) return `13${d}`; // Snow
  if ([95, 96, 97, 98, 99].includes(code)) return `11${d}`; // Thunder
  return `01${d}`;
}

function mapOpenMeteoCodeToText(code) {
  const map = {
    0: 'Clear',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing Rime Fog',
    51: 'Light Drizzle',
    53: 'Moderate Drizzle',
    55: 'Dense Drizzle',
    56: 'Freezing Drizzle',
    57: 'Freezing Drizzle',
    61: 'Slight Rain',
    63: 'Moderate Rain',
    65: 'Heavy Rain',
    71: 'Slight Snow',
    73: 'Moderate Snow',
    75: 'Heavy Snow',
    77: 'Snow Grains',
    80: 'Rain Showers',
    81: 'Moderate Showers',
    82: 'Violent Showers',
    85: 'Slight Snow Showers',
    86: 'Heavy Snow Showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with Hail',
    99: 'Thunderstorm with Hail',
  };
  return map[code] || 'Unknown';
}

async function fetchWeatherOpenMeteo(city) {
  const place = await geocodeCityOpenMeteo(city);
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', place.lat);
  url.searchParams.set('longitude', place.lon);
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,pressure_msl');
  url.searchParams.set('timezone', 'auto');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Fallback weather failed: ${res.status} ${res.statusText}`);
  const j = await res.json();
  const cur = j.current || {};
  const code = cur.weather_code;
  const text = mapOpenMeteoCodeToText(code);
  const iconCode = mapOpenMeteoToOwmIcon(code, !!cur.is_day);
  return {
    name: `${place.name}`,
    sys: { country: place.country },
    weather: [{ main: text, description: text, icon: iconCode }],
    main: {
      temp: typeof cur.temperature_2m === 'number' ? cur.temperature_2m : undefined,
      feels_like: typeof cur.apparent_temperature === 'number' ? cur.apparent_temperature : undefined,
      humidity: typeof cur.relative_humidity_2m === 'number' ? cur.relative_humidity_2m : undefined,
      pressure: typeof cur.pressure_msl === 'number' ? Math.round(cur.pressure_msl) : undefined,
    },
    wind: { speed: typeof cur.wind_speed_10m === 'number' ? cur.wind_speed_10m : undefined },
    _provider: 'open-meteo',
  };
}

function saveLastCity(city) {
  try {
    localStorage.setItem('lastCity', city);
  } catch {}
}

function getLastCity() {
  try {
    return localStorage.getItem('lastCity') || '';
  } catch { return ''; }
}

function setTheme(theme) {
  const cls = document.documentElement.classList;
  if (theme === 'light') cls.add('light'); else cls.remove('light');
  try { localStorage.setItem('theme', theme); } catch {}
}

function initTheme() {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') setTheme('light');
  } catch {}
}

function isLikelyOWMKey(key) {
  // Typical OpenWeatherMap keys are 32 hex chars. This is a heuristic only.
  return /^[a-f0-9]{32}$/i.test((key || '').trim());
}

// API key management
function setStoredApiKey(key) {
  try { localStorage.setItem('owm_api_key', key.trim()); } catch {}
}

function getStoredApiKey() {
  try { return localStorage.getItem('owm_api_key') || ''; } catch { return ''; }
}

function mapIcon(iconCode) {
  // Prefer OpenWeather icon asset for accuracy
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

async function fetchWeather(city) {
  const effectiveKey = (getStoredApiKey() || API_KEY).trim();
  if (!effectiveKey) {
    const e = new Error('No API key set. Click the key icon to add your OpenWeatherMap key.');
    e.status = 401;
    throw e;
  }
  if (!isLikelyOWMKey(effectiveKey)) {
    // Non-blocking warning; OWM may still accept some formats, but likely not.
    console.warn('API key format looks unusual for OpenWeatherMap.');
  }
  const url = new URL(API_URL);
  url.searchParams.set('q', city);
  url.searchParams.set('appid', effectiveKey);
  url.searchParams.set('units', 'metric');

  const res = await fetch(url.toString());
  if (!res.ok) {
    let message = res.statusText;
    try {
      const errBody = await res.json();
      if (errBody && (errBody.message || errBody.cod)) {
        message = errBody.message || `${res.statusText}`;
      }
    } catch {
      try {
        const text = await res.text();
        if (text) message = text;
      } catch {}
    }
    if (res.status === 401) {
      message += ' — Click the key icon to set a valid API key from https://home.openweathermap.org/api_keys';
    }
    const e = new Error(`Error ${res.status}: ${message}`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

function render(data) {
  const name = `${data.name}, ${data.sys?.country ?? ''}`.replace(/, \s*$/, '');
  const weather = data.weather?.[0];
  const temp = Math.round(data.main?.temp);
  const feels = Math.round(data.main?.feels_like);
  const humidity = data.main?.humidity;
  const wind = data.wind?.speed;
  const pressure = data.main?.pressure;

  cityNameEl.textContent = name || '—';
  conditionTextEl.textContent = weather?.main || '—';
  tempValueEl.textContent = Number.isFinite(temp) ? `${temp}°` : '—°';
  feelsLikeEl.textContent = Number.isFinite(feels) ? `Feels like ${feels}°` : 'Feels like —°';
  humidityEl.textContent = humidity != null ? `${humidity}%` : '—%';
  windEl.textContent = wind != null ? `${wind} m/s` : '— m/s';
  pressureEl.textContent = pressure != null ? `${pressure} hPa` : '— hPa';

  if (weather?.icon) {
    const src = mapIcon(weather.icon);
    iconImg.src = src;
    iconImg.alt = weather.description || weather.main || 'Weather icon';
  } else {
    iconImg.removeAttribute('src');
    iconImg.alt = '';
  }

  resultEl.classList.remove('hidden');
}

async function handleSearch(city) {
  const q = city?.trim();
  if (!q) {
    setStatus('Please enter a city.');
    return;
  }

  setStatus('Loading…');
  resultEl.classList.add('hidden');

  try {
    let data;
    try {
      data = await fetchWeather(q);
    } catch (err1) {
      if (err1?.status === 401 || /401|Invalid API key|No API key/i.test(err1?.message || '')) {
        // Fallback
        try {
          data = await fetchWeatherOpenMeteo(q);
          setStatus('', false);
        } catch (err2) {
          throw err2;
        }
      } else {
        throw err1;
      }
    }
    render(data);
    if (!data._provider) setStatus('');
    saveLastCity(q);
  } catch (err) {
    console.error(err);
    setStatus(err?.message || 'Could not fetch weather. Check the city name or API key.', true);
  }
}

// Events
form.addEventListener('submit', (e) => {
  e.preventDefault();
  handleSearch(input.value);
});

themeToggle?.addEventListener('click', () => {
  const isLight = document.documentElement.classList.contains('light');
  setTheme(isLight ? 'dark' : 'light');
});

keyBtn?.addEventListener('click', () => {
  const current = getStoredApiKey() || API_KEY || '';
  const next = prompt('Enter your OpenWeatherMap API key (stored locally in this browser):', current);
  if (next != null) {
    setStoredApiKey(next);
    if (isLikelyOWMKey(next)) {
      setStatus('API key saved. Try a search.', false);
    } else {
      setStatus('API key saved, but the format looks unusual. If you get 401, generate a new key.', false);
    }
  }
});

// Init
initTheme();
const effectiveKeyAtStart = (getStoredApiKey() || API_KEY).trim();
if (!effectiveKeyAtStart) {
  setStatus('No API key set. Click the key icon to add your OpenWeatherMap key.', false);
} else if (!isLikelyOWMKey(effectiveKeyAtStart)) {
  setStatus('Heads up: The API key format looks unusual for OpenWeatherMap. If you get 401, open the key menu and set a valid key.', false);
}
const last = getLastCity();
if (last) {
  input.value = last;
  handleSearch(last);
}
