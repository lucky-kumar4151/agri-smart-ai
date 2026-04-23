"""
Weather Service - Open-Meteo API Integration
Free, open-source weather API — NO API key required.
https://open-meteo.com/en/docs
"""
import httpx
import ssl
import certifi
import time
from typing import Optional

# SSL context for production (Render/Railway may have stale CA certs)
try:
    _ssl_ctx = ssl.create_default_context(cafile=certifi.where())
except Exception:
    _ssl_ctx = True  # fallback to default

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL  = "https://api.open-meteo.com/v1/forecast"

# ── Production-grade per-city cache (30-min TTL) ─────────────────────────────
# Technique 1+3: All users share the same cached result per city.
# Even with 10,000 users, Open-Meteo is called at most once per 30 min per city.
_weather_cache: dict = {}   # key: city.lower() → (data, timestamp)
_forecast_cache: dict = {}  # key: city.lower() → (data, timestamp)
_WEATHER_TTL  = 1800  # 30 minutes (was 5 min — increased for production)
_FORECAST_TTL = 1800  # 30 minutes for forecast too

def _get_cache(store: dict, city: str, ttl: int):
    entry = store.get(city.lower())
    if entry and (time.time() - entry[1]) < ttl:
        return entry[0]
    return None

def _set_cache(store: dict, city: str, data: dict):
    store[city.lower()] = (data, time.time())


# ── Built-in coordinates for 80+ major Indian cities ──────────────────────────
# Using these avoids geocoding API calls entirely (no rate-limit risk)
INDIAN_CITIES: dict = {
    # North India
    "delhi":       {"name": "Delhi",       "lat": 28.6139, "lon": 77.2090, "state": "Delhi",          "tz": "Asia/Kolkata"},
    "new delhi":   {"name": "New Delhi",   "lat": 28.6139, "lon": 77.2090, "state": "Delhi",          "tz": "Asia/Kolkata"},
    "noida":       {"name": "Noida",       "lat": 28.5355, "lon": 77.3910, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "gurgaon":     {"name": "Gurgaon",     "lat": 28.4595, "lon": 77.0266, "state": "Haryana",        "tz": "Asia/Kolkata"},
    "gurugram":    {"name": "Gurugram",    "lat": 28.4595, "lon": 77.0266, "state": "Haryana",        "tz": "Asia/Kolkata"},
    "faridabad":   {"name": "Faridabad",   "lat": 28.4089, "lon": 77.3178, "state": "Haryana",        "tz": "Asia/Kolkata"},
    "chandigarh":  {"name": "Chandigarh",  "lat": 30.7333, "lon": 76.7794, "state": "Chandigarh",     "tz": "Asia/Kolkata"},
    "ludhiana":    {"name": "Ludhiana",    "lat": 30.9010, "lon": 75.8573, "state": "Punjab",         "tz": "Asia/Kolkata"},
    "amritsar":    {"name": "Amritsar",    "lat": 31.6340, "lon": 74.8723, "state": "Punjab",         "tz": "Asia/Kolkata"},
    "jalandhar":   {"name": "Jalandhar",   "lat": 31.3260, "lon": 75.5762, "state": "Punjab",         "tz": "Asia/Kolkata"},
    "ambala":      {"name": "Ambala",      "lat": 30.3782, "lon": 76.7767, "state": "Haryana",        "tz": "Asia/Kolkata"},
    "shimla":      {"name": "Shimla",      "lat": 31.1048, "lon": 77.1734, "state": "Himachal Pradesh","tz": "Asia/Kolkata"},
    "dehradun":    {"name": "Dehradun",    "lat": 30.3165, "lon": 78.0322, "state": "Uttarakhand",    "tz": "Asia/Kolkata"},
    "haridwar":    {"name": "Haridwar",    "lat": 29.9457, "lon": 78.1642, "state": "Uttarakhand",    "tz": "Asia/Kolkata"},
    "srinagar":    {"name": "Srinagar",    "lat": 34.0837, "lon": 74.7973, "state": "J&K",            "tz": "Asia/Kolkata"},
    "jammu":       {"name": "Jammu",       "lat": 32.7266, "lon": 74.8570, "state": "J&K",            "tz": "Asia/Kolkata"},
    # UP & Bihar
    "lucknow":     {"name": "Lucknow",     "lat": 26.8467, "lon": 80.9462, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "kanpur":      {"name": "Kanpur",      "lat": 26.4499, "lon": 80.3319, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "agra":        {"name": "Agra",        "lat": 27.1767, "lon": 78.0081, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "varanasi":    {"name": "Varanasi",    "lat": 25.3176, "lon": 82.9739, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "allahabad":   {"name": "Prayagraj",   "lat": 25.4358, "lon": 81.8463, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "prayagraj":   {"name": "Prayagraj",   "lat": 25.4358, "lon": 81.8463, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "meerut":      {"name": "Meerut",      "lat": 28.9845, "lon": 77.7064, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "gorakhpur":   {"name": "Gorakhpur",   "lat": 26.7606, "lon": 83.3732, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "patna":       {"name": "Patna",       "lat": 25.5941, "lon": 85.1376, "state": "Bihar",          "tz": "Asia/Kolkata"},
    "gaya":        {"name": "Gaya",        "lat": 24.7914, "lon": 84.9994, "state": "Bihar",          "tz": "Asia/Kolkata"},
    "muzaffarpur": {"name": "Muzaffarpur", "lat": 26.1209, "lon": 85.3647, "state": "Bihar",          "tz": "Asia/Kolkata"},
    # Rajasthan
    "jaipur":      {"name": "Jaipur",      "lat": 26.9124, "lon": 75.7873, "state": "Rajasthan",      "tz": "Asia/Kolkata"},
    "jodhpur":     {"name": "Jodhpur",     "lat": 26.2389, "lon": 73.0243, "state": "Rajasthan",      "tz": "Asia/Kolkata"},
    "udaipur":     {"name": "Udaipur",     "lat": 24.5854, "lon": 73.7125, "state": "Rajasthan",      "tz": "Asia/Kolkata"},
    "ajmer":       {"name": "Ajmer",       "lat": 26.4499, "lon": 74.6399, "state": "Rajasthan",      "tz": "Asia/Kolkata"},
    "kota":        {"name": "Kota",        "lat": 25.2138, "lon": 75.8648, "state": "Rajasthan",      "tz": "Asia/Kolkata"},
    # Maharashtra & Goa
    "mumbai":      {"name": "Mumbai",      "lat": 19.0760, "lon": 72.8777, "state": "Maharashtra",    "tz": "Asia/Kolkata"},
    "pune":        {"name": "Pune",        "lat": 18.5204, "lon": 73.8567, "state": "Maharashtra",    "tz": "Asia/Kolkata"},
    "nagpur":      {"name": "Nagpur",      "lat": 21.1458, "lon": 79.0882, "state": "Maharashtra",    "tz": "Asia/Kolkata"},
    "nashik":      {"name": "Nashik",      "lat": 19.9975, "lon": 73.7898, "state": "Maharashtra",    "tz": "Asia/Kolkata"},
    "aurangabad":  {"name": "Aurangabad",  "lat": 19.8762, "lon": 75.3433, "state": "Maharashtra",    "tz": "Asia/Kolkata"},
    "solapur":     {"name": "Solapur",     "lat": 17.6854, "lon": 75.9064, "state": "Maharashtra",    "tz": "Asia/Kolkata"},
    "kolhapur":    {"name": "Kolhapur",    "lat": 16.7050, "lon": 74.2433, "state": "Maharashtra",    "tz": "Asia/Kolkata"},
    "goa":         {"name": "Panaji",      "lat": 15.4909, "lon": 73.8278, "state": "Goa",            "tz": "Asia/Kolkata"},
    "panaji":      {"name": "Panaji",      "lat": 15.4909, "lon": 73.8278, "state": "Goa",            "tz": "Asia/Kolkata"},
    # South India
    "bengaluru":   {"name": "Bengaluru",   "lat": 12.9716, "lon": 77.5946, "state": "Karnataka",      "tz": "Asia/Kolkata"},
    "bangalore":   {"name": "Bengaluru",   "lat": 12.9716, "lon": 77.5946, "state": "Karnataka",      "tz": "Asia/Kolkata"},
    "mysuru":      {"name": "Mysuru",      "lat": 12.2958, "lon": 76.6394, "state": "Karnataka",      "tz": "Asia/Kolkata"},
    "mysore":      {"name": "Mysuru",      "lat": 12.2958, "lon": 76.6394, "state": "Karnataka",      "tz": "Asia/Kolkata"},
    "hubli":       {"name": "Hubli",       "lat": 15.3647, "lon": 75.1240, "state": "Karnataka",      "tz": "Asia/Kolkata"},
    "mangalore":   {"name": "Mangalore",   "lat": 12.9141, "lon": 74.8560, "state": "Karnataka",      "tz": "Asia/Kolkata"},
    "hyderabad":   {"name": "Hyderabad",   "lat": 17.3850, "lon": 78.4867, "state": "Telangana",      "tz": "Asia/Kolkata"},
    "warangal":    {"name": "Warangal",    "lat": 17.9689, "lon": 79.5941, "state": "Telangana",      "tz": "Asia/Kolkata"},
    "chennai":     {"name": "Chennai",     "lat": 13.0827, "lon": 80.2707, "state": "Tamil Nadu",     "tz": "Asia/Kolkata"},
    "coimbatore":  {"name": "Coimbatore",  "lat": 11.0168, "lon": 76.9558, "state": "Tamil Nadu",     "tz": "Asia/Kolkata"},
    "madurai":     {"name": "Madurai",     "lat": 9.9252,  "lon": 78.1198, "state": "Tamil Nadu",     "tz": "Asia/Kolkata"},
    "trichy":      {"name": "Tiruchirappalli","lat": 10.7905,"lon": 78.7047,"state": "Tamil Nadu",    "tz": "Asia/Kolkata"},
    "kochi":       {"name": "Kochi",       "lat": 9.9312,  "lon": 76.2673, "state": "Kerala",         "tz": "Asia/Kolkata"},
    "thiruvananthapuram":{"name":"Thiruvananthapuram","lat":8.5241,"lon":76.9366,"state":"Kerala",    "tz": "Asia/Kolkata"},
    "trivandrum":  {"name": "Thiruvananthapuram","lat":8.5241,"lon":76.9366,"state":"Kerala",         "tz": "Asia/Kolkata"},
    "kozhikode":   {"name": "Kozhikode",   "lat": 11.2588, "lon": 75.7804, "state": "Kerala",         "tz": "Asia/Kolkata"},
    "vishakhapatnam":{"name":"Visakhapatnam","lat":17.6868,"lon":83.2185,"state":"Andhra Pradesh",   "tz": "Asia/Kolkata"},
    "visakhapatnam":{"name":"Visakhapatnam","lat":17.6868,"lon":83.2185,"state":"Andhra Pradesh",    "tz": "Asia/Kolkata"},
    "vijayawada":  {"name": "Vijayawada",  "lat": 16.5062, "lon": 80.6480, "state": "Andhra Pradesh", "tz": "Asia/Kolkata"},
    # East India
    "kolkata":     {"name": "Kolkata",     "lat": 22.5726, "lon": 88.3639, "state": "West Bengal",    "tz": "Asia/Kolkata"},
    "calcutta":    {"name": "Kolkata",     "lat": 22.5726, "lon": 88.3639, "state": "West Bengal",    "tz": "Asia/Kolkata"},
    "bhubaneswar": {"name": "Bhubaneswar", "lat": 20.2961, "lon": 85.8245, "state": "Odisha",         "tz": "Asia/Kolkata"},
    "cuttack":     {"name": "Cuttack",     "lat": 20.4625, "lon": 85.8828, "state": "Odisha",         "tz": "Asia/Kolkata"},
    "guwahati":    {"name": "Guwahati",    "lat": 26.1445, "lon": 91.7362, "state": "Assam",          "tz": "Asia/Kolkata"},
    "ranchi":      {"name": "Ranchi",      "lat": 23.3441, "lon": 85.3096, "state": "Jharkhand",      "tz": "Asia/Kolkata"},
    "jamshedpur":  {"name": "Jamshedpur",  "lat": 22.8046, "lon": 86.2029, "state": "Jharkhand",      "tz": "Asia/Kolkata"},
    "raipur":      {"name": "Raipur",      "lat": 21.2514, "lon": 81.6296, "state": "Chhattisgarh",   "tz": "Asia/Kolkata"},
    # Central & West
    "bhopal":      {"name": "Bhopal",      "lat": 23.2599, "lon": 77.4126, "state": "Madhya Pradesh", "tz": "Asia/Kolkata"},
    "indore":      {"name": "Indore",      "lat": 22.7196, "lon": 75.8577, "state": "Madhya Pradesh", "tz": "Asia/Kolkata"},
    "jabalpur":    {"name": "Jabalpur",    "lat": 23.1815, "lon": 79.9864, "state": "Madhya Pradesh", "tz": "Asia/Kolkata"},
    "gwalior":     {"name": "Gwalior",     "lat": 26.2183, "lon": 78.1828, "state": "Madhya Pradesh", "tz": "Asia/Kolkata"},
    "ahmedabad":   {"name": "Ahmedabad",   "lat": 23.0225, "lon": 72.5714, "state": "Gujarat",        "tz": "Asia/Kolkata"},
    "surat":       {"name": "Surat",       "lat": 21.1702, "lon": 72.8311, "state": "Gujarat",        "tz": "Asia/Kolkata"},
    "vadodara":    {"name": "Vadodara",    "lat": 22.3072, "lon": 73.1812, "state": "Gujarat",        "tz": "Asia/Kolkata"},
    "rajkot":      {"name": "Rajkot",      "lat": 22.3039, "lon": 70.8022, "state": "Gujarat",        "tz": "Asia/Kolkata"},
}

def _lookup_city(city: str) -> Optional[dict]:
    """Look up city in built-in dictionary (case-insensitive). Returns geo dict or None."""
    key = city.strip().lower()
    if key in INDIAN_CITIES:
        c = INDIAN_CITIES[key]
        return {
            "name"        : c["name"],
            "latitude"    : c["lat"],
            "longitude"   : c["lon"],
            "country"     : "India",
            "country_code": "IN",
            "admin1"      : c["state"],
            "timezone"    : c["tz"],
        }
    return None


# WMO Weather Interpretation Codes → description & icon mapping
WMO_CODES = {
    0: {"description": "Clear sky", "icon": "☀️"},
    1: {"description": "Mainly clear", "icon": "🌤️"},
    2: {"description": "Partly cloudy", "icon": "⛅"},
    3: {"description": "Overcast", "icon": "☁️"},
    45: {"description": "Fog", "icon": "🌫️"},
    48: {"description": "Depositing rime fog", "icon": "🌫️"},
    51: {"description": "Light drizzle", "icon": "🌦️"},
    53: {"description": "Moderate drizzle", "icon": "🌦️"},
    55: {"description": "Dense drizzle", "icon": "🌧️"},
    56: {"description": "Light freezing drizzle", "icon": "🌨️"},
    57: {"description": "Dense freezing drizzle", "icon": "🌨️"},
    61: {"description": "Slight rain", "icon": "🌧️"},
    63: {"description": "Moderate rain", "icon": "🌧️"},
    65: {"description": "Heavy rain", "icon": "🌧️"},
    66: {"description": "Light freezing rain", "icon": "🌨️"},
    67: {"description": "Heavy freezing rain", "icon": "🌨️"},
    71: {"description": "Slight snowfall", "icon": "🌨️"},
    73: {"description": "Moderate snowfall", "icon": "❄️"},
    75: {"description": "Heavy snowfall", "icon": "❄️"},
    77: {"description": "Snow grains", "icon": "❄️"},
    80: {"description": "Slight rain showers", "icon": "🌦️"},
    81: {"description": "Moderate rain showers", "icon": "🌧️"},
    82: {"description": "Violent rain showers", "icon": "⛈️"},
    85: {"description": "Slight snow showers", "icon": "🌨️"},
    86: {"description": "Heavy snow showers", "icon": "❄️"},
    95: {"description": "Thunderstorm", "icon": "⛈️"},
    96: {"description": "Thunderstorm with slight hail", "icon": "⛈️"},
    99: {"description": "Thunderstorm with heavy hail", "icon": "⛈️"},
}


def _get_wmo_info(code: int) -> dict:
    return WMO_CODES.get(code, {"description": "Unknown", "icon": "🌡️"})


def generate_farming_advice(temp: float, humidity: float, wind: float,
                            description: str, rain: float = 0,
                            uv: float = 0, precip_prob: float = 0) -> dict:
    """Generate comprehensive farmer-specific advisory with activity scores."""
    tips  = []
    warns = []
    desc_lower = description.lower() if description else ""

    # ── Rain & moisture ───────────────────────────────────────────────────────
    if rain > 10:
        warns.append("🚨 Heavy rain today — avoid all field operations. Check drainage channels.")
        warns.append("🌊 Risk of soil erosion and crop lodging. Stake tall crops immediately.")
    elif rain > 3:
        tips.append("🌧️ Moderate rain expected — skip irrigation today, nature does the job!")
        tips.append("🚫 Do NOT spray pesticides or fertilisers — rain will wash them away.")
    elif rain > 0:
        tips.append("🌦️ Light drizzle expected. Good for transplanting seedlings.")
    else:
        if precip_prob < 20:
            tips.append("💧 No rain expected. Check soil moisture and irrigate if needed.")

    # ── Temperature ───────────────────────────────────────────────────────────
    if temp > 42:
        warns.append("🔥 Extreme heat (>42°C). Crops under severe heat stress — irrigate twice today.")
        warns.append("🌿 Apply mulch immediately to protect root zone from heat.")
    elif temp > 35:
        warns.append("☀️ High heat alert. Irrigate early morning (5–7 AM) or after sunset.")
        tips.append("🌾 Avoid transplanting seedlings — wait for cooler evening hours.")
    elif temp < 5:
        warns.append("❄️ Near-freezing temperatures. Cover frost-sensitive crops with nets tonight.")
        warns.append("🚫 Avoid overhead irrigation — wet leaves may freeze and burn.")
    elif temp < 15:
        tips.append("🥶 Cool weather — ideal for Rabi crops (wheat, mustard, chickpea).")
        tips.append("🌙 Avoid night irrigation to prevent cold stress on roots.")
    elif 20 <= temp <= 30:
        tips.append("✅ Optimal temperature range — ideal for most crop activities.")
    elif 30 < temp <= 35:
        tips.append("🌤️ Warm conditions. Irrigate in the evening for best water absorption.")

    # ── Humidity ──────────────────────────────────────────────────────────────
    if humidity > 90:
        warns.append("⚠️ Very high humidity (>90%) — high risk of fungal blight & mildew. Inspect crops.")
        warns.append("🍄 Spray preventive fungicide if conditions persist more than 2 days.")
    elif humidity > 75:
        tips.append("💧 Elevated humidity — monitor for early signs of fungal disease on leaves.")
    elif humidity < 25:
        warns.append("🏜️ Very dry air (<25% humidity). Increase irrigation frequency significantly.")
    elif humidity < 40:
        tips.append("☀️ Low humidity — mulch fields to reduce water evaporation from soil.")

    # ── Wind ──────────────────────────────────────────────────────────────────
    if wind > 40:
        warns.append("🌪️ Strong winds (>40 km/h) — DO NOT spray pesticides. Risk of drift injury.")
        warns.append("🪴 Secure all young plants, stakes, and greenhouse structures immediately.")
    elif wind > 20:
        tips.append("💨 Moderate wind — postpone chemical spraying to calm hours (early morning).")
    elif wind < 8 and humidity > 70:
        tips.append("🌿 Calm & humid — ideal window for pesticide/fungicide application.")

    # ── UV Index ─────────────────────────────────────────────────────────────
    if uv >= 8:
        warns.append("☀️ Very high UV today. Field workers must wear full protection (hat, sleeves, sunscreen).")
    elif uv >= 5:
        tips.append("🧢 High UV between 10 AM–4 PM. Schedule heavy field work for early morning.")

    # ── Condition-specific ────────────────────────────────────────────────────
    if "thunderstorm" in desc_lower:
        warns.append("⚡ Thunderstorm — stop all field operations immediately. Seek shelter.")
    if "fog" in desc_lower:
        tips.append("🌫️ Foggy morning — delay pesticide application until fog clears (mid-morning).")
        tips.append("🌱 Fog provides moisture — reduce irrigation for the day.")
    if "clear" in desc_lower or "sunny" in desc_lower:
        tips.append("☀️ Clear sky — excellent for harvesting, threshing, and drying produce.")

    # ── Field Activity Score (0-100, higher = better for field work) ──────────
    score = 70  # baseline
    if rain > 5:   score -= 40
    elif rain > 0: score -= 15
    if wind > 40:  score -= 30
    elif wind > 20: score -= 10
    if temp > 40 or temp < 5:  score -= 25
    elif temp > 35 or temp < 10: score -= 10
    if humidity > 90: score -= 15
    if "thunderstorm" in desc_lower: score -= 50
    score = max(0, min(100, score))

    if score >= 75: activity_label, activity_color = "Excellent", "#16a34a"
    elif score >= 55: activity_label, activity_color = "Good",      "#2d7a3a"
    elif score >= 35: activity_label, activity_color = "Fair",       "#d97706"
    else:             activity_label, activity_color = "Poor",       "#dc2626"

    # ── Irrigation score ──────────────────────────────────────────────────────
    irrig_needed = max(0, min(100, 80 - (rain * 12) - (humidity * 0.3) - (precip_prob * 0.4)))
    if   irrig_needed >= 70: irrig_label = "High"
    elif irrig_needed >= 40: irrig_label = "Moderate"
    elif irrig_needed >= 20: irrig_label = "Low"
    else:                    irrig_label = "None needed"

    # ── Spray suitability ─────────────────────────────────────────────────────
    spray_ok = (wind < 15 and rain == 0 and precip_prob < 30 and humidity < 80)
    spray_label = "✅ Good window" if spray_ok else "❌ Not suitable"

    if not tips and not warns:
        tips.append("🌾 Conditions are moderate. Continue regular farming activities.")

    return {
        "tips"            : tips,
        "warnings"        : warns,
        "field_score"     : score,
        "field_label"     : activity_label,
        "field_color"     : activity_color,
        "irrigation_score": round(irrig_needed),
        "irrigation_label": irrig_label,
        "spray_suitable"  : spray_ok,
        "spray_label"     : spray_label,
    }


async def _fetch_with_backoff(url: str, params: dict, max_retries: int = 3) -> Optional[dict]:
    """Technique 4: Exponential backoff retry — 2s → 4s → 8s"""
    import asyncio
    delay = 2
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=20.0, verify=_ssl_ctx) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    return resp.json()
                if resp.status_code == 429:
                    print(f"[WARN] Rate limited (429). Retry {attempt+1}/{max_retries} after {delay}s")
                    await asyncio.sleep(delay)
                    delay *= 2   # exponential backoff
                    continue
                # Other error — don't retry
                print(f"[WARN] HTTP {resp.status_code} from {url}")
                return None
        except (httpx.TimeoutException, httpx.ConnectError) as e:
            print(f"[WARN] Request failed (attempt {attempt+1}): {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(delay)
                delay *= 2
        except Exception as e:
            print(f"[ERROR] Unexpected error in _fetch_with_backoff: {type(e).__name__}: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(delay)
                delay *= 2
    return None


async def _fallback_wttr(city: str) -> Optional[dict]:
    """Technique 6: Fallback to wttr.in if Open-Meteo is completely unavailable."""
    try:
        async with httpx.AsyncClient(timeout=15.0, verify=_ssl_ctx) as client:
            resp = await client.get(
                f"https://wttr.in/{city}",
                params={"format": "j1"},
                headers={"User-Agent": "AgriSmart-Weather/1.0"}
            )
            if resp.status_code != 200:
                return None
            d     = resp.json()
            cur   = d["current_condition"][0]
            area  = d["nearest_area"][0]
            cname = area["areaName"][0]["value"]
            state = area.get("region", [{}])[0].get("value", "")
            temp  = float(cur["temp_C"])
            hum   = int(cur["humidity"])
            wind  = float(cur["windspeedKmph"])
            desc  = cur["weatherDesc"][0]["value"]
            adv   = generate_farming_advice(temp, hum, wind, desc)
            return {
                "city"           : cname,
                "country"        : "IN",
                "state"          : state,
                "temperature"    : temp,
                "feels_like"     : float(cur["FeelsLikeC"]),
                "humidity"       : hum,
                "wind_speed"     : wind,
                "description"    : desc,
                "icon"           : "🌡️",
                "farming_advisory": adv,
                "data_source"    : "wttr.in (fallback)",
            }
    except Exception as e:
        print(f"[ERROR] wttr.in fallback failed: {e}")
        return None




async def _geocode_city(city: str) -> Optional[dict]:
    """Convert city name to lat/lon.
    1. Check built-in Indian city dictionary first (no API, no rate-limit)
    2. Fall back to Open-Meteo Geocoding API for unknown cities
    """
    # Step 1: built-in lookup (instant, no API call)
    builtin = _lookup_city(city)
    if builtin:
        return builtin

    # Step 2: geocoding API (only for cities not in our dictionary)
    try:
        async with httpx.AsyncClient(timeout=15.0, verify=_ssl_ctx) as client:
            response = await client.get(
                GEOCODING_URL,
                params={
                    "name": city,
                    "count": 5,
                    "language": "en",
                    "format": "json"
                }
            )

            if response.status_code != 200:
                return None

            data    = response.json()
            results = data.get("results", [])
            if not results:
                return None

            india_match = next((r for r in results if r.get("country_code") == "IN"), None)
            best = india_match or results[0]

            return {
                "name"        : best.get("name", city),
                "latitude"    : best["latitude"],
                "longitude"   : best["longitude"],
                "country"     : best.get("country", ""),
                "country_code": best.get("country_code", ""),
                "admin1"      : best.get("admin1", ""),
                "timezone"    : best.get("timezone", "Asia/Kolkata"),
            }

    except Exception as e:
        print(f"[ERROR] Geocoding failed for '{city}': {e}")
        return None


async def get_weather(city: str) -> dict:
    """Get current weather — Technique 1+2+3: Per-city 30-min server-side cache."""

    # Check 30-min cache first (all users share this)
    cached = _get_cache(_weather_cache, city, _WEATHER_TTL)
    if cached:
        return cached

    # Resolve city → lat/lon (built-in dict first → zero geocoding API calls)
    geo = _lookup_city(city) or await _geocode_city(city)
    if not geo:
        return {"error": True, "msg": f"City '{city}' not found. Try a nearby major city name."}

    params = {
        "latitude"    : geo["latitude"],
        "longitude"   : geo["longitude"],
        "current"     : "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
        "daily"       : "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,rain_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max",
        "timezone"    : geo.get("timezone", "auto"),
        "forecast_days": 1,
    }

    # Technique 4: exponential backoff retry (2s → 4s → 8s)
    data = await _fetch_with_backoff(FORECAST_URL, params)

    # Technique 6: fallback to wttr.in if Open-Meteo fails completely
    if data is None:
        fallback = await _fallback_wttr(city)
        if fallback:
            _set_cache(_weather_cache, city, fallback)
            return fallback
        return {"error": True, "msg": "Weather service unavailable. Please try again in a few minutes."}

    current = data.get("current", {})
    daily   = data.get("daily", {})
    wmo     = _get_wmo_info(current.get("weather_code", 0))

    temp        = round(current.get("temperature_2m", 0), 1)
    humidity    = current.get("relative_humidity_2m", 0)
    wind_speed  = round(current.get("wind_speed_10m", 0), 1)
    rain        = current.get("rain", 0) or 0
    uv_index    = (daily.get("uv_index_max") or [0])[0]
    precip_prob = (daily.get("precipitation_probability_max") or [0])[0]

    weather_data = {
        "city"         : geo["name"],
        "country"      : geo.get("country_code", ""),
        "state"        : geo.get("admin1", ""),
        "latitude"     : geo["latitude"],
        "longitude"    : geo["longitude"],
        "temperature"  : temp,
        "feels_like"   : round(current.get("apparent_temperature", temp), 1),
        "temp_min"     : round((daily.get("temperature_2m_min") or [temp])[0], 1),
        "temp_max"     : round((daily.get("temperature_2m_max") or [temp])[0], 1),
        "humidity"     : humidity,
        "pressure"     : round(current.get("pressure_msl", 1013)),
        "description"  : wmo["description"],
        "icon"         : wmo["icon"],
        "weather_code" : current.get("weather_code", 0),
        "is_day"       : current.get("is_day", 1),
        "wind_speed"   : wind_speed,
        "wind_direction": current.get("wind_direction_10m", 0),
        "wind_gusts"   : round(current.get("wind_gusts_10m", 0), 1),
        "clouds"       : current.get("cloud_cover", 0),
        "rain"         : rain,
        "precipitation": current.get("precipitation", 0),
        "sunrise"      : (daily.get("sunrise") or [""])[0],
        "sunset"       : (daily.get("sunset")  or [""])[0],
        "uv_index"     : uv_index,
        "precip_prob"  : precip_prob,
        "data_source"  : "Open-Meteo (free, no API key)",
        "cached_at"    : int(time.time()),
    }

    # Rich farmer advisory with scores
    weather_data["farming_advisory"] = generate_farming_advice(
        temp, humidity, wind_speed, wmo["description"], rain, uv_index, precip_prob
    )
    # Legacy field for backward compatibility
    weather_data["farming_advice"] = (
        weather_data["farming_advisory"]["warnings"] +
        weather_data["farming_advisory"]["tips"]
    )

    _set_cache(_weather_cache, city, weather_data)   # Cache for 30 min
    return weather_data


async def get_weather_by_coords(lat: float, lon: float) -> dict:
    """Get weather by lat/lon coordinates (from browser geolocation).
    Uses reverse geocoding to find nearest city name."""
    
    # Try reverse geocoding to get city name
    city_name = "Your Location"
    state_name = ""
    timezone = "auto"
    
    # Check if coordinates match any known Indian city (within ~25km)
    for key, c in INDIAN_CITIES.items():
        dlat = abs(c["lat"] - lat)
        dlon = abs(c["lon"] - lon)
        if dlat < 0.25 and dlon < 0.25:  # ~25km radius
            city_name = c["name"]
            state_name = c["state"]
            timezone = c["tz"]
            # Check cache with matched city name
            cached = _get_cache(_weather_cache, city_name, _WEATHER_TTL)
            if cached:
                return cached
            break
    
    # Try Open-Meteo reverse geocoding if no built-in match
    if city_name == "Your Location":
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    "https://nominatim.openstreetmap.org/reverse",
                    params={"lat": lat, "lon": lon, "format": "json", "zoom": 10},
                    headers={"User-Agent": "AgriSmart-Weather/1.0"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    addr = data.get("address", {})
                    city_name = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county") or "Your Location"
                    state_name = addr.get("state", "")
        except Exception as e:
            print(f"[WARN] Reverse geocoding failed: {e}")

    params = {
        "latitude"    : lat,
        "longitude"   : lon,
        "current"     : "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
        "daily"       : "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,rain_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max",
        "timezone"    : timezone,
        "forecast_days": 1,
    }

    data = await _fetch_with_backoff(FORECAST_URL, params)
    if data is None:
        return {"error": True, "msg": "Weather service unavailable. Please try again."}

    current = data.get("current", {})
    daily   = data.get("daily", {})
    wmo     = _get_wmo_info(current.get("weather_code", 0))

    temp        = round(current.get("temperature_2m", 0), 1)
    humidity    = current.get("relative_humidity_2m", 0)
    wind_speed  = round(current.get("wind_speed_10m", 0), 1)
    rain        = current.get("rain", 0) or 0
    uv_index    = (daily.get("uv_index_max") or [0])[0]
    precip_prob = (daily.get("precipitation_probability_max") or [0])[0]

    weather_data = {
        "city"         : city_name,
        "country"      : "IN",
        "state"        : state_name,
        "latitude"     : lat,
        "longitude"    : lon,
        "temperature"  : temp,
        "feels_like"   : round(current.get("apparent_temperature", temp), 1),
        "temp_min"     : round((daily.get("temperature_2m_min") or [temp])[0], 1),
        "temp_max"     : round((daily.get("temperature_2m_max") or [temp])[0], 1),
        "humidity"     : humidity,
        "pressure"     : round(current.get("pressure_msl", 1013)),
        "description"  : wmo["description"],
        "icon"         : wmo["icon"],
        "weather_code" : current.get("weather_code", 0),
        "is_day"       : current.get("is_day", 1),
        "wind_speed"   : wind_speed,
        "wind_direction": current.get("wind_direction_10m", 0),
        "wind_gusts"   : round(current.get("wind_gusts_10m", 0), 1),
        "clouds"       : current.get("cloud_cover", 0),
        "rain"         : rain,
        "precipitation": current.get("precipitation", 0),
        "sunrise"      : (daily.get("sunrise") or [""])[0],
        "sunset"       : (daily.get("sunset")  or [""])[0],
        "uv_index"     : uv_index,
        "precip_prob"  : precip_prob,
        "data_source"  : "Open-Meteo (free, no API key)",
        "cached_at"    : int(time.time()),
    }

    weather_data["farming_advisory"] = generate_farming_advice(
        temp, humidity, wind_speed, wmo["description"], rain, uv_index, precip_prob
    )
    weather_data["farming_advice"] = (
        weather_data["farming_advisory"]["warnings"] +
        weather_data["farming_advisory"]["tips"]
    )

    if city_name != "Your Location":
        _set_cache(_weather_cache, city_name, weather_data)
    return weather_data


async def get_forecast(city: str) -> dict:
    """Get 7-day forecast — cached for 30 min per city."""

    cached = _get_cache(_forecast_cache, city, _FORECAST_TTL)
    if cached:
        return cached

    geo = _lookup_city(city) or await _geocode_city(city)
    if not geo:
        return {"error": True, "msg": f"City '{city}' not found."}

    params = {
        "latitude"    : geo["latitude"],
        "longitude"   : geo["longitude"],
        "hourly"      : "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,visibility",
        "daily"       : "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_sum,rain_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max",
        "timezone"    : geo.get("timezone", "auto"),
        "forecast_days": 7,
    }

    data = await _fetch_with_backoff(FORECAST_URL, params)
    if data is None:
        return {"error": True, "msg": "Forecast service unavailable. Please try again in a few minutes."}

    daily  = data.get("daily", {})
    hourly = data.get("hourly", {})

    # Build daily forecasts with per-day farming advisory
    daily_forecasts = []
    for i, date in enumerate(daily.get("time", [])):
        wc  = (daily.get("weather_code") or [])[i] if i < len(daily.get("weather_code") or []) else 0
        wmo = _get_wmo_info(wc)
        rain_d  = round((daily.get("rain_sum")            or [0])[i], 1)
        wind_d  = round((daily.get("wind_speed_10m_max")  or [0])[i], 1)
        uv_d    =       (daily.get("uv_index_max")        or [0])[i]
        p_prob  =       (daily.get("precipitation_probability_max") or [0])[i]
        tmax    = round((daily.get("temperature_2m_max")  or [0])[i], 1)
        tmin    = round((daily.get("temperature_2m_min")  or [0])[i], 1)

        adv = generate_farming_advice((tmax + tmin) / 2, 60, wind_d, wmo["description"], rain_d, uv_d, p_prob)

        daily_forecasts.append({
            "date"                    : date,
            "weather_code"            : wc,
            "description"             : wmo["description"],
            "icon"                    : wmo["icon"],
            "temp_max"                : tmax,
            "temp_min"                : tmin,
            "feels_max"               : round((daily.get("apparent_temperature_max") or [tmax])[i], 1),
            "feels_min"               : round((daily.get("apparent_temperature_min") or [tmin])[i], 1),
            "precipitation_sum"       : round((daily.get("precipitation_sum")        or [0])[i], 1),
            "rain_sum"                : rain_d,
            "precipitation_hours"     :       (daily.get("precipitation_hours")       or [0])[i],
            "precipitation_probability": p_prob,
            "wind_speed_max"          : wind_d,
            "wind_gusts_max"          : round((daily.get("wind_gusts_10m_max")       or [0])[i], 1),
            "uv_index"                : uv_d,
            "sunrise"                 :       (daily.get("sunrise")                   or [""])[i],
            "sunset"                  :       (daily.get("sunset")                    or [""])[i],
            "field_score"             : adv["field_score"],
            "field_label"             : adv["field_label"],
            "field_color"             : adv["field_color"],
            "spray_suitable"          : adv["spray_suitable"],
        })

    # Build hourly forecasts (next 48 h)
    hourly_forecasts = []
    h_times = hourly.get("time", [])
    for i in range(min(48, len(h_times))):
        wc  = (hourly.get("weather_code") or [0])[i] if i < len(hourly.get("weather_code") or []) else 0
        wmo = _get_wmo_info(wc)
        hourly_forecasts.append({
            "datetime"               : h_times[i],
            "temperature"            : round((hourly.get("temperature_2m")             or [0])[i], 1),
            "humidity"               : (hourly.get("relative_humidity_2m")              or [0])[i],
            "precipitation_probability": (hourly.get("precipitation_probability")       or [0])[i],
            "precipitation"          : round((hourly.get("precipitation")               or [0])[i], 1),
            "weather_code"           : wc,
            "description"            : wmo["description"],
            "icon"                   : wmo["icon"],
            "wind_speed"             : round((hourly.get("wind_speed_10m")              or [0])[i], 1),
            "visibility"             : round(((hourly.get("visibility") or [10000])[i] or 10000) / 1000, 1),
        })

    result = {
        "city"       : geo["name"],
        "country"    : geo.get("country_code", ""),
        "state"      : geo.get("admin1", ""),
        "latitude"   : geo["latitude"],
        "longitude"  : geo["longitude"],
        "daily"      : daily_forecasts,
        "hourly"     : hourly_forecasts,
        "data_source": "Open-Meteo (free, no API key)",
    }
    _set_cache(_forecast_cache, city, result)
    return result
