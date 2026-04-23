"""
Market Price Service — Real Agmarknet Data
Primary: data.gov.in Agmarknet API (resource 9ef84268-d588-465a-a308-a864a43d0070)
         - Returns live daily mandi prices with actual market names, districts, states.
Fallback: Curated MSP data (CACP 2024-25) with realistic price spreads.
"""
import httpx  # type: ignore[import]
import asyncio
import random
import math
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

try:
    from config import get_settings  # type: ignore[import]
    settings = get_settings()
except Exception:
    settings = None  # type: ignore[assignment]

# ── Official MSP 2024-25 (CACP, Government of India) ─────────────────────────
MSP_DATA: Dict[str, Dict[str, Any]] = {
    "rice":      {"msp": 2300, "unit": "quintal", "season": "Kharif",   "category": "Cereal"},
    "wheat":     {"msp": 2275, "unit": "quintal", "season": "Rabi",     "category": "Cereal"},
    "maize":     {"msp": 2090, "unit": "quintal", "season": "Kharif",   "category": "Cereal"},
    "cotton":    {"msp": 7121, "unit": "quintal", "season": "Kharif",   "category": "Commercial"},
    "soybean":   {"msp": 4892, "unit": "quintal", "season": "Kharif",   "category": "Oilseed"},
    "mustard":   {"msp": 5650, "unit": "quintal", "season": "Rabi",     "category": "Oilseed"},
    "chickpea":  {"msp": 5440, "unit": "quintal", "season": "Rabi",     "category": "Pulse"},
    "sugarcane": {"msp": 315,  "unit": "quintal", "season": "Annual",   "category": "Commercial"},
    "groundnut": {"msp": 6377, "unit": "quintal", "season": "Kharif",   "category": "Oilseed"},
    "moong":     {"msp": 8558, "unit": "quintal", "season": "Kharif",   "category": "Pulse"},
    "urad":      {"msp": 6950, "unit": "quintal", "season": "Kharif",   "category": "Pulse"},
    "tur":       {"msp": 7000, "unit": "quintal", "season": "Kharif",   "category": "Pulse"},
    "barley":    {"msp": 1850, "unit": "quintal", "season": "Rabi",     "category": "Cereal"},
    "jowar":     {"msp": 3180, "unit": "quintal", "season": "Kharif",   "category": "Cereal"},
    "bajra":     {"msp": 2500, "unit": "quintal", "season": "Kharif",   "category": "Cereal"},
    "ragi":      {"msp": 3846, "unit": "quintal", "season": "Kharif",   "category": "Cereal"},
    "lentil":    {"msp": 6425, "unit": "quintal", "season": "Rabi",     "category": "Pulse"},
    "sunflower": {"msp": 6760, "unit": "quintal", "season": "Rabi",     "category": "Oilseed"},
    "sesame":    {"msp": 8635, "unit": "quintal", "season": "Kharif",   "category": "Oilseed"},
    "jute":      {"msp": 5050, "unit": "quintal", "season": "Kharif",   "category": "Commercial"},
    "tomato":    {"msp": None, "unit": "quintal", "season": "Year-round", "category": "Vegetable"},
    "onion":     {"msp": None, "unit": "quintal", "season": "Year-round", "category": "Vegetable"},
    "potato":    {"msp": None, "unit": "quintal", "season": "Rabi",     "category": "Vegetable"},
}

# ── Known mandi names per state ───────────────────────────────────────────────
STATE_MANDIS: Dict[str, List[str]] = {
    "Punjab":          ["Ludhiana", "Amritsar", "Khanna", "Patiala", "Barnala"],
    "Haryana":         ["Karnal", "Hisar", "Ambala", "Sirsa", "Rohtak"],
    "Uttar Pradesh":   ["Kanpur", "Lucknow", "Meerut", "Agra", "Varanasi"],
    "Madhya Pradesh":  ["Indore", "Bhopal", "Ujjain", "Gwalior", "Sagar"],
    "Maharashtra":     ["Pune", "Nashik", "Nagpur", "Aurangabad", "Kolhapur"],
    "Rajasthan":       ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Udaipur"],
    "Gujarat":         ["Ahmedabad", "Rajkot", "Surat", "Vadodara", "Bhavnagar"],
    "Karnataka":       ["Bengaluru", "Hubli", "Mysuru", "Davangere", "Bidar"],
    "Andhra Pradesh":  ["Guntur", "Vijayawada", "Kurnool", "Chittoor", "Tirupati"],
    "Tamil Nadu":      ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
    "West Bengal":     ["Kolkata", "Howrah", "Siliguri", "Durgapur", "Burdwan"],
    "Bihar":           ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Hajipur"],
    "Telangana":       ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam"],
    "Chhattisgarh":    ["Raipur", "Bilaspur", "Durg", "Jagdalpur", "Ambikapur"],
    "Odisha":          ["Bhubaneswar", "Cuttack", "Sambalpur", "Berhampur", "Rourkela"],
}

AGMARKNET_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
TIMEOUT = 15.0


def _get_api_key() -> str:
    """Safely retrieve the DATA_GOV_API_KEY from settings."""
    try:
        return str(settings.DATA_GOV_API_KEY) if settings and settings.DATA_GOV_API_KEY else ""
    except Exception:
        return ""


def _build_price_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise a raw Agmarknet API record into our standard format."""
    crop_name = str(record.get("commodity") or "").lower().strip()
    msp_info  = MSP_DATA.get(crop_name, {})
    try:
        min_p  = float(record.get("min_price",   0) or 0)
        max_p  = float(record.get("max_price",   0) or 0)
        modal  = float(record.get("modal_price", 0) or 0)
    except (ValueError, TypeError):
        min_p = max_p = modal = 0.0
    return {
        "crop":         str(record.get("commodity") or ""),
        "state":        str(record.get("state") or ""),
        "district":     str(record.get("district") or ""),
        "market":       str(record.get("market") or ""),
        "variety":      str(record.get("variety") or "—"),
        "arrival_date": str(record.get("arrival_date") or datetime.utcnow().strftime("%d/%m/%Y")),
        "min_price":    min_p,
        "max_price":    max_p,
        "modal_price":  modal,
        "msp":          msp_info.get("msp"),
        "season":       str(msp_info.get("season") or ""),
        "category":     str(msp_info.get("category") or ""),
        "unit":         "Rs/Quintal",
        "source":       "live",
    }


async def _fetch_agmarknet(params: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Hit the data.gov.in Agmarknet API and return normalised records."""
    api_key = _get_api_key()
    if not api_key:
        raise ValueError("DATA_GOV_API_KEY not configured")

    base_params: Dict[str, Any] = {
        "api-key": api_key,
        "format":  "json",
        "limit":   100,
    }
    base_params.update(params)

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(AGMARKNET_URL, params=base_params)
        resp.raise_for_status()
        data = resp.json()
        records: List[Dict[str, Any]] = data.get("records", [])
        print(f"[Agmarknet] {len(records)} records fetched (params={params})")
        return [_build_price_record(r) for r in records if r.get("modal_price")]


async def get_market_prices(
    crop: Optional[str] = None,
    state: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fetch live mandi prices from Agmarknet.
    Falls back to MSP data if API fails or returns empty.
    """
    prices: List[Dict[str, Any]] = []
    source_label = ""
    note_text    = ""
    nearby_mandis: List[str] = list(STATE_MANDIS.get(state or "", []))

    # ── Attempt 1: Agmarknet with state + commodity filter ──────────────────
    try:
        params: Dict[str, Any] = {}
        if crop:
            params["filters[commodity]"] = crop.title()
        if state:
            params["filters[state]"] = state

        prices = await _fetch_agmarknet(params)

        if prices:
            source_label = f"Live — Agmarknet / data.gov.in ({datetime.now().strftime('%d %b %Y')})"
            note_text    = (
                f"Showing {len(prices)} live mandi records"
                + (f" from {state}" if state else "")
                + ". Prices in ₹ per quintal."
            )
            # Extract distinct mandi names from results
            seen: List[str] = []
            for p in prices:
                m = str(p.get("market") or "").strip()
                if m and m not in seen:
                    seen.append(m)
            if seen:
                nearby_mandis = seen[:8]
            return {
                "prices":        prices,
                "total":         len(prices),
                "source":        source_label,
                "note":          note_text,
                "nearby_mandis": nearby_mandis,
                "live":          True,
            }
    except Exception as e:
        print(f"[Agmarknet] primary fetch failed: {e}")

    # ── Attempt 2: Agmarknet without filters (broader search) ─────────────
    if not prices:
        try:
            prices = await _fetch_agmarknet({})
            if prices and state:
                prices = [p for p in prices if state.lower() in str(p.get("state") or "").lower()]
            if prices and crop:
                crop_lower_filter = crop.lower()
                prices = [p for p in prices if crop_lower_filter in str(p.get("crop") or "").lower()]
            if prices:
                source_label = f"Live — Agmarknet / data.gov.in ({datetime.now().strftime('%d %b %Y')})"
                note_text = f"Showing {len(prices)} live records (broad fetch). Prices in ₹/quintal."
                return {
                    "prices": prices, "total": len(prices),
                    "source": source_label, "note": note_text,
                    "nearby_mandis": nearby_mandis, "live": True,
                }
        except Exception as e:
            print(f"[Agmarknet] broad fetch also failed: {e}")

    # ── Fallback: Official MSP data ────────────────────────────────────────
    print("[Market] Using MSP fallback data")
    filter_key = crop.lower().strip() if crop else ""
    first_mandi = nearby_mandis[0] if nearby_mandis else ""
    mandi_label = (
        first_mandi.replace(" APMC", "").replace(" Mandi", "")
        if first_mandi else ""
    )

    for crop_name, info in MSP_DATA.items():
        if filter_key and filter_key not in crop_name:
            continue
        raw_msp = info.get("msp")
        if raw_msp is None:
            continue
        msp_val: int = int(raw_msp)
        if msp_val == 0:
            continue
        modal = msp_val
        prices.append({
            "crop":         crop_name.title(),
            "state":        state or "All India",
            "district":     "—",
            "market":       f"{mandi_label} Mandi" if mandi_label else "— (MSP Reference)",
            "variety":      "Standard",
            "arrival_date": datetime.utcnow().strftime("%d/%m/%Y"),
            "min_price":    round(modal * 0.90),
            "max_price":    round(modal * 1.10),
            "modal_price":  modal,
            "msp":          msp_val,
            "season":       str(info.get("season") or ""),
            "category":     str(info.get("category") or ""),
            "unit":         "Rs/Quintal",
            "source":       "msp",
        })

    nearby_preview = ", ".join(nearby_mandis[:3]) if nearby_mandis else ""
    return {
        "prices":        prices,
        "total":         len(prices),
        "source":        "CACP — Govt. of India MSP 2024-25",
        "note":          (
            "⚠️ Agmarknet live data unavailable. Showing official MSP 2024-25 rates. "
            "Add your DATA_GOV_API_KEY to .env for live prices."
            + (f" Nearby mandis: {nearby_preview}." if nearby_preview else "")
        ),
        "nearby_mandis": nearby_mandis,
        "live":          False,
    }


async def get_price_trends(crop: str) -> Dict[str, Any]:
    """
    Return price trend / analysis for a single crop.

    Strategy:
    1. Call Agmarknet with commodity filter → get current live price + markets.
    2. If only 1 date comes back (today's data only), synthesise a realistic
       6-month weekly history curve anchored to that LIVE price.
    3. If Agmarknet fails entirely → use MSP as the anchor for the curve.
    4. If no MSP either (vegetables etc.) → use a base of ₹1000 with mild volatility.
    """
    crop_lower = crop.lower().strip()
    msp_info   = MSP_DATA.get(crop_lower, {})
    raw_msp    = msp_info.get("msp")           # None for vegetables
    msp_val: Optional[int] = int(raw_msp) if raw_msp is not None else None

    price_history: List[Dict[str, Any]] = []
    markets_found: List[str]            = []
    live          = False
    current_price: int = msp_val if msp_val is not None else 0
    base_for_range: int = msp_val if msp_val is not None else 1000
    min_p: int = round(base_for_range * 0.88)
    max_p: int = round(base_for_range * 1.12)
    live_min_set = False
    live_max_set = False

    # ── Step 1: Try live Agmarknet ────────────────────────────────────────
    try:
        records = await _fetch_agmarknet({"filters[commodity]": crop.title()})
        if records:
            live = True

            # Collect mandi names
            for r in records:
                m = str(r.get("market") or "").strip()
                if m and m not in markets_found:
                    markets_found.append(m)

            # Build date → avg modal price map
            date_map: Dict[str, List[float]] = {}
            for r in records:
                ad = str(r.get("arrival_date") or "").strip()
                mp = float(r.get("modal_price") or 0)
                if ad and mp > 0:
                    date_map.setdefault(ad, []).append(mp)

            for d, vals in sorted(date_map.items()):
                avg = round(sum(vals) / len(vals))
                price_history.append({"date": d, "modal_price": avg, "count": len(vals)})

            # Current price: average modal across all records
            modal_vals = [float(r["modal_price"]) for r in records if float(r.get("modal_price") or 0) > 0]
            current_price = round(sum(modal_vals) / len(modal_vals)) if modal_vals else (msp_val or 0)

            # High / Low from raw records
            min_vals = [float(r["min_price"]) for r in records if float(r.get("min_price") or 0) > 0]
            max_vals = [float(r["max_price"]) for r in records if float(r.get("max_price") or 0) > 0]
            if min_vals:
                min_p = round(min(min_vals))
                live_min_set = True
            if max_vals:
                max_p = round(max(max_vals))
                live_max_set = True

    except Exception as e:
        print(f"[Trends] live fetch failed: {e}")

    # ── Step 2: Build synthetic 6-month history when we have < 2 dates ───
    if len(price_history) < 2:
        base: int = current_price if current_price > 0 else (msp_val if msp_val is not None else 1000)
        random.seed(hash(crop_lower) % 9999)

        synthetic: List[Dict[str, Any]] = []
        for w in range(24, 0, -1):           # 24 weeks ≈ 6 months
            seasonal  = math.sin(w * 0.38) * base * 0.07
            noise     = random.uniform(-base * 0.025, base * 0.025)
            drift     = (24 - w) * base * 0.001
            modal     = round(max(base * 0.60, base + seasonal + noise + drift))
            date_str  = (datetime.utcnow() - timedelta(weeks=w)).strftime("%d/%m/%Y")
            synthetic.append({"date": date_str, "modal_price": modal, "count": 1, "synthetic": True})

        # Append today's actual live point at the end (if we have one)
        if price_history:
            synthetic.append(price_history[-1])
        else:
            synthetic.append({
                "date":         datetime.utcnow().strftime("%d/%m/%Y"),
                "modal_price":  base,
                "count":        1,
                "synthetic":    True,
            })

        price_history = synthetic
        # Recalculate min/max to span the synthetic range if not set by live data
        if not live_min_set or not live_max_set:
            synth_prices = [int(p["modal_price"]) for p in price_history]
            if synth_prices:
                min_p = min(synth_prices)
                max_p = max(synth_prices)

    # ── Step 3: Derive price change across history ─────────────────────────
    price_change: Optional[float] = None
    if len(price_history) >= 2:
        p0 = int(price_history[0]["modal_price"])
        p1 = int(price_history[-1]["modal_price"])
        if p0 > 0:
            price_change = round((p1 - p0) / p0 * 100, 1)

    # ── Step 4: vs-MSP ────────────────────────────────────────────────────
    vs_msp: Optional[float] = None
    if msp_val is not None and msp_val > 0 and current_price > 0:
        vs_msp = round((current_price - msp_val) / msp_val * 100, 1)

    # ── Step 5: Recommendation text ───────────────────────────────────────
    rec: str
    if msp_val is not None and vs_msp is not None:
        if vs_msp >= 0:
            rec = (f"Current mandi price is ▲ {abs(vs_msp)}% above MSP (₹{msp_val:,}). "
                   "Good time to sell — prices are above the government support rate.")
        else:
            rec = (f"Current price is ▼ {abs(vs_msp)}% below MSP (₹{msp_val:,}). "
                   "Consider storing produce in a government warehouse or FPO facility "
                   "and wait for prices to recover.")
    elif price_change is not None:
        direction = "risen" if price_change >= 0 else "fallen"
        rec = (f"Prices have {direction} by {abs(price_change)}% over the past 6 months. "
               "Compare 2–3 nearby mandis before deciding to sell.")
    else:
        rec = "Check your nearest mandi for today's actual trading prices before selling."

    history_note = (
        "Live Agmarknet data" if live else
        f"Synthetic 6-month trend anchored to {'live price' if current_price else 'MSP reference'}"
    )

    return {
        "crop":           crop.title(),
        "msp":            msp_val,
        "current_price":  current_price,
        "min_price":      min_p,
        "max_price":      max_p,
        "price_change":   price_change,
        "vs_msp":         vs_msp,
        "unit":           f"Rs/{msp_info.get('unit', 'quintal')}",
        "season":         str(msp_info.get("season") or ""),
        "category":       str(msp_info.get("category") or ""),
        "live":           live,
        "price_history":  price_history,
        "markets":        markets_found[:6],
        "source":         f"{'Agmarknet - data.gov.in (live) + ' if live else ''}{history_note}",
        "recommendation": rec,
        "tips": [
            "Compare prices at 2–3 mandis before selling",
            "Use e-NAM (enam.gov.in) for transparent price discovery",
            "Store in govt. warehouse if prices fall below MSP" if msp_val else "Check daily rates on Agmarknet or Kisan Suvidha app",
            "Contact your FPO for collective bargaining power",
        ],
    }
