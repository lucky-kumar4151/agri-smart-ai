from fastapi import APIRouter, Depends, Query
from datetime import datetime
from database import get_database
from middleware.auth import get_current_user
from services.weather_service import get_weather, get_forecast, get_weather_by_coords
from services.market_service import get_market_prices, get_price_trends

router = APIRouter()


@router.get("/weather")
async def weather_current(
    city: str = Query(default="Delhi", description="City name"),
    current_user: dict = Depends(get_current_user)
):
    weather_data = await get_weather(city=city)

    db = get_database()
    if db is not None:
        try:
            await db.search_history.insert_one({
                "user_id": current_user["user_id"],
                "query": f"Weather: {city}",
                "type": "weather",
                "result": {"city": city, "temp": weather_data.get("temperature")},
                "timestamp": datetime.utcnow().isoformat()
            })
        except Exception:
            pass

    return weather_data


@router.get("/weather/bylocation")
async def weather_by_location(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    current_user: dict = Depends(get_current_user)
):
    """Get weather data using browser geolocation coordinates."""
    weather_data = await get_weather_by_coords(lat, lon)

    db = get_database()
    if db is not None:
        try:
            await db.search_history.insert_one({
                "user_id": current_user["user_id"],
                "query": f"Weather: Lat {lat:.2f}, Lon {lon:.2f}",
                "type": "weather",
                "result": {"lat": lat, "lon": lon, "temp": weather_data.get("temperature")},
                "timestamp": datetime.utcnow().isoformat()
            })
        except Exception:
            pass

    return weather_data


@router.get("/weather/forecast")
async def weather_forecast(
    city: str = Query(default="Delhi", description="City name"),
    current_user: dict = Depends(get_current_user)
):
    return await get_forecast(city=city)


@router.get("/market-prices")
async def market_prices(
    crop: str = Query(default=None, description="Crop name"),
    state: str = Query(default=None, description="State name"),
    current_user: dict = Depends(get_current_user)
):
    prices = await get_market_prices(crop=crop, state=state)

    db = get_database()
    if db is not None:
        try:
            await db.search_history.insert_one({
                "user_id": current_user["user_id"],
                "query": f"Market prices: {crop or 'all'} in {state or 'all'}",
                "type": "market",
                "result": {"crop": crop, "state": state},
                "timestamp": datetime.utcnow().isoformat()
            })
        except Exception:
            pass

    return prices


@router.get("/market-prices/trends")
async def market_trends(
    crop: str = Query(..., description="Crop name"),
    current_user: dict = Depends(get_current_user)
):
    return await get_price_trends(crop=crop)


# ── Government Policies Endpoint ──
GOV_POLICIES = [
    {
        "id": "pm-kisan",
        "name": "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "category": "Income Support",
        "icon": "💰",
        "description": "Direct income support of ₹6,000 per year to all landholding farmer families, paid in three equal installments of ₹2,000 each.",
        "eligibility": "All landholding farmer families with cultivable land",
        "benefits": ["₹6,000/year direct bank transfer", "Three installments of ₹2,000 each", "No intermediaries — direct DBT"],
        "how_to_apply": "Visit pmkisan.gov.in or contact your local Agriculture Office / Common Service Centre (CSC).",
        "website": "https://pmkisan.gov.in",
        "status": "Active",
    },
    {
        "id": "pmfby",
        "name": "PMFBY (Pradhan Mantri Fasal Bima Yojana)",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "category": "Crop Insurance",
        "icon": "🛡️",
        "description": "Comprehensive crop insurance scheme covering losses due to natural calamities, pests, and diseases at very low premiums.",
        "eligibility": "All farmers growing notified crops in notified areas",
        "benefits": ["Low premium: 2% for Kharif, 1.5% for Rabi, 5% for horticulture", "Full sum insured for crop loss", "Covers prevented sowing, mid-season adversity, post-harvest losses"],
        "how_to_apply": "Apply through your bank, CSC, or the PMFBY portal before the season deadline.",
        "website": "https://pmfby.gov.in",
        "status": "Active",
    },
    {
        "id": "pm-ksmy",
        "name": "PM-KUSUM (Kisan Urja Suraksha evam Utthan Mahabhiyan)",
        "ministry": "Ministry of New and Renewable Energy",
        "category": "Solar Energy",
        "icon": "☀️",
        "description": "Promotes solar energy in the agriculture sector — solar pumps, grid-connected solar plants on farmland.",
        "eligibility": "Individual farmers, FPOs, cooperatives, panchayats with suitable land",
        "benefits": ["Up to 60% subsidy on solar pumps", "Additional income from selling surplus solar power", "Reduced electricity bills and diesel dependence"],
        "how_to_apply": "Apply through your state's MNRE portal or contact the District Agriculture Office.",
        "website": "https://mnre.gov.in/kusum",
        "status": "Active",
    },
    {
        "id": "e-nam",
        "name": "e-NAM (National Agriculture Market)",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "category": "Market Access",
        "icon": "📊",
        "description": "Online trading platform unifying agriculture markets across India for transparent price discovery and better returns.",
        "eligibility": "All farmers, traders, buyers registered at e-NAM mandis",
        "benefits": ["Transparent pricing and competitive bidding", "Access to buyers across India", "Reduced market intermediaries", "Online payment directly to bank account"],
        "how_to_apply": "Register at enam.gov.in with Aadhaar and bank details. Contact your nearest e-NAM mandi.",
        "website": "https://enam.gov.in",
        "status": "Active",
    },
    {
        "id": "soil-health",
        "name": "Soil Health Card Scheme",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "category": "Soil Health",
        "icon": "🧪",
        "description": "Provides soil health cards to farmers with crop-wise nutrient recommendations for improving productivity.",
        "eligibility": "All farmers across India",
        "benefits": ["Free soil testing every 2 years", "Crop-wise fertilizer recommendations", "Improved soil health and productivity", "Reduced fertilizer costs"],
        "how_to_apply": "Contact your nearest Krishi Vigyan Kendra (KVK) or state agriculture department.",
        "website": "https://soilhealth.dac.gov.in",
        "status": "Active",
    },
    {
        "id": "kcc",
        "name": "Kisan Credit Card (KCC)",
        "ministry": "Ministry of Finance",
        "category": "Credit & Finance",
        "icon": "💳",
        "description": "Provides affordable credit to farmers for agriculture and allied activities at subsidized interest rates.",
        "eligibility": "All farmers, tenant farmers, sharecroppers, SHGs, joint liability groups",
        "benefits": ["Interest rate as low as 4% (with subvention)", "Credit limit up to ₹3 lakh", "Covers crop production, post-harvest, maintenance of farm assets", "Insurance coverage included"],
        "how_to_apply": "Apply at any commercial, cooperative, or regional rural bank with land records and ID proof.",
        "website": "https://www.pmkisan.gov.in",
        "status": "Active",
    },
    {
        "id": "pkvy",
        "name": "Paramparagat Krishi Vikas Yojana (PKVY)",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "category": "Organic Farming",
        "icon": "🌿",
        "description": "Promotes organic farming through cluster approach and Participatory Guarantee System (PGS) certification.",
        "eligibility": "Farmer groups/clusters of 50+ farmers with minimum 50 acres",
        "benefits": ["₹50,000 per hectare over 3 years", "Free PGS organic certification", "Direct marketing support", "Training and capacity building"],
        "how_to_apply": "Form a cluster of 50 farmers and apply through the District Agriculture Office.",
        "website": "https://pgsindia-ncof.gov.in",
        "status": "Active",
    },
    {
        "id": "nfsm",
        "name": "National Food Security Mission (NFSM)",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "category": "Food Security",
        "icon": "🌾",
        "description": "Aims to increase production of rice, wheat, pulses, coarse cereals, and commercial crops through area expansion and productivity enhancement.",
        "eligibility": "Farmers in identified districts growing target crops",
        "benefits": ["Subsidized seeds, fertilizers, and farm machinery", "Demonstration and training programs", "Cluster-based approach for better yields", "50% subsidy on farm implements"],
        "how_to_apply": "Contact your District Agriculture Officer or state agriculture department.",
        "website": "https://nfsm.gov.in",
        "status": "Active",
    },
    {
        "id": "pmkmy",
        "name": "PM Kisan Maandhan Yojana",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "category": "Pension",
        "icon": "🏦",
        "description": "Pension scheme for small and marginal farmers. After age 60, beneficiaries receive ₹3,000/month pension.",
        "eligibility": "Small and marginal farmers aged 18-40 with less than 2 hectares of land",
        "benefits": ["₹3,000/month pension after age 60", "Low monthly contribution (₹55-200 based on age)", "Government matches the contribution equally", "Spouse also eligible separately"],
        "how_to_apply": "Visit your nearest CSC or register at maandhan.in with Aadhaar and bank details.",
        "website": "https://maandhan.in",
        "status": "Active",
    },
    {
        "id": "agri-infra",
        "name": "Agriculture Infrastructure Fund (AIF)",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "category": "Infrastructure",
        "icon": "🏗️",
        "description": "₹1 lakh crore financing facility for post-harvest management infrastructure and community farming assets.",
        "eligibility": "Farmers, FPOs, PACS, agri-entrepreneurs, startups, and state agencies",
        "benefits": ["Interest subvention of 3% per annum on loans up to ₹2 crore", "Credit guarantee support for eligible borrowers", "Covers cold storage, warehousing, processing units, sorting/grading", "Long repayment period"],
        "how_to_apply": "Apply online at agriinfra.dac.gov.in through participating banks and NBFCs.",
        "website": "https://agriinfra.dac.gov.in",
        "status": "Active",
    },
]


@router.get("/gov-policies")
async def get_gov_policies(
    category: str = Query(default=None, description="Filter by category"),
    current_user: dict = Depends(get_current_user)
):
    """Get Indian Government agriculture policies and schemes."""
    policies = GOV_POLICIES
    if category:
        policies = [p for p in policies if p["category"].lower() == category.lower()]

    categories = list(set(p["category"] for p in GOV_POLICIES))

    return {
        "policies": policies,
        "total": len(policies),
        "categories": sorted(categories),
        "source": "Government of India - Ministry of Agriculture & Farmers Welfare",
        "last_updated": "2025-2026",
    }
