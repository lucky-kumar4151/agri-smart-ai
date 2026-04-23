"""
Crop Recommendation Service
============================
Loads the trained 5-Model Ensemble ML model:
  Decision Tree + SVM + KNN + Extra Trees + Naive Bayes (Soft Voting)

Returns top-N crop recommendations based on soil and climate inputs.
Falls back to a rule-based scoring algorithm if the model file is missing.
"""

import os
import json
import numpy as np
from models.prediction import CropPredictionRequest

# ──────────────────────────────────────────────────────────
#  Paths
# ──────────────────────────────────────────────────────────
_BASE = os.path.dirname(__file__)
MODEL_PATH   = os.path.abspath(os.path.join(_BASE, "..", "..", "ml", "crop_model", "crop_model.pkl"))
ENCODER_PATH = os.path.abspath(os.path.join(_BASE, "..", "..", "ml", "crop_model", "label_encoder.pkl"))
METADATA_PATH= os.path.abspath(os.path.join(_BASE, "..", "..", "ml", "crop_model", "model_metadata.json"))


# ──────────────────────────────────────────────────────────
#  Full crop database (22 crops)
#  Used as fallback when model is absent and for rich metadata
# ──────────────────────────────────────────────────────────
CROP_DATABASE = {
    # ── Cereals ──
    "Rice": {
        "N": (60, 120), "P": (30, 70), "K": (30, 60),
        "temp": (20, 35), "humidity": (60, 95), "ph": (5.5, 7.0), "rainfall": (150, 300),
        "season": "Kharif (June - October)",
        "description": (
            "A staple cereal crop ideal for warm, humid conditions with heavy irrigation. "
            "Thrives in low-lying paddy fields with clay or loamy soil that retains water effectively. "
            "Rice is the backbone of Indian food security, accounting for over 40% of total food grain production. "
            "Best cultivated in West Bengal, Punjab, Uttar Pradesh, and Andhra Pradesh."
        )
    },
    "Wheat": {
        "N": (80, 150), "P": (40, 80), "K": (20, 50),
        "temp": (10, 25), "humidity": (40, 70), "ph": (6.0, 7.5), "rainfall": (50, 120),
        "season": "Rabi (November - March)",
        "description": (
            "India's primary Rabi crop and a critical staple grain. Requires cool, dry weather during "
            "the growing phase and moderate moisture. Well-suited for the Indo-Gangetic plains of Punjab, "
            "Haryana, and Uttar Pradesh. Rich in carbohydrates and proteins, fundamental to Indian dietary "
            "patterns and the agrarian economy."
        )
    },
    "Maize": {
        "N": (60, 140), "P": (30, 60), "K": (20, 50),
        "temp": (18, 32), "humidity": (50, 80), "ph": (5.5, 7.5), "rainfall": (60, 150),
        "season": "Kharif / Rabi (Dual Season)",
        "description": (
            "A highly versatile cereal crop cultivated for food, animal fodder, poultry feed, and "
            "industrial starch and ethanol production. Adapts well to diverse climatic zones and soil "
            "types across India. Its dual-season suitability makes it a preferred choice for farmers "
            "seeking year-round productivity."
        )
    },
    "Barley": {
        "N": (60, 120), "P": (30, 60), "K": (20, 40),
        "temp": (7, 20), "humidity": (30, 60), "ph": (6.0, 7.5), "rainfall": (40, 100),
        "season": "Rabi (October - March)",
        "description": (
            "A robust Rabi cereal crop known for its tolerance of poor soil conditions and cold climates. "
            "Widely grown in Rajasthan, Uttar Pradesh, and Haryana. Used extensively for malting, brewing, "
            "food, and livestock feed. Its drought-tolerance makes it a strategic crop for semi-arid "
            "environments where other cereals struggle."
        )
    },
    "Sorghum": {
        "N": (50, 100), "P": (20, 50), "K": (20, 40),
        "temp": (22, 35), "humidity": (30, 70), "ph": (5.5, 7.5), "rainfall": (40, 120),
        "season": "Kharif (June - September)",
        "description": (
            "An exceptional drought-tolerant cereal ideal for dryland and rainfed farming. "
            "Thrives in semi-arid regions of Maharashtra, Karnataka, and Rajasthan. Essential for "
            "food security in low-rainfall zones, serving as both a staple grain and high-quality "
            "livestock fodder. Its deep root system enables efficient water extraction."
        )
    },
    # ── Pulses ──
    "Chickpea": {
        "N": (20, 50), "P": (40, 80), "K": (15, 40),
        "temp": (15, 30), "humidity": (30, 60), "ph": (6.0, 8.0), "rainfall": (40, 100),
        "season": "Rabi (October - March)",
        "description": (
            "The most important pulse crop in India, often called 'Bengal Gram'. A biological nitrogen-fixer "
            "that naturally enriches soil fertility. Drought-tolerant and best suited for rainfed black cotton "
            "soils of Madhya Pradesh, Rajasthan, and Maharashtra. Rich in protein, fiber, and micronutrients, "
            "critical for dietary balance across rural and urban India."
        )
    },
    "Lentil": {
        "N": (15, 40), "P": (30, 60), "K": (15, 35),
        "temp": (12, 25), "humidity": (30, 60), "ph": (6.0, 7.5), "rainfall": (30, 80),
        "season": "Rabi (October - February)",
        "description": (
            "A high-protein pulse crop thriving in cool, dry Rabi conditions. Known for atmospheric nitrogen "
            "fixation (60–90 kg N/ha annually), significantly improving soil health for subsequent crops. "
            "Widely cultivated in Madhya Pradesh, Uttar Pradesh, and Bihar. Its short cycle of 90–110 days "
            "and low water requirement make it economically attractive for smallholder farmers."
        )
    },
    "Moong": {
        "N": (15, 35), "P": (30, 60), "K": (20, 40),
        "temp": (25, 35), "humidity": (55, 80), "ph": (6.0, 7.5), "rainfall": (60, 120),
        "season": "Kharif (June - September)",
        "description": (
            "A short-duration summer pulse (60–70 days) rich in digestible plant protein. Excels in sandy "
            "loam soils with adequate drainage and warm, moderately humid conditions. A valuable intercrop "
            "and rotation crop that naturally replenishes soil nitrogen. Widely grown in Rajasthan, "
            "Maharashtra, and Andhra Pradesh."
        )
    },
    "Pigeonpea": {
        "N": (20, 40), "P": (40, 70), "K": (20, 40),
        "temp": (22, 35), "humidity": (50, 80), "ph": (5.5, 7.5), "rainfall": (60, 150),
        "season": "Kharif (June - October)",
        "description": (
            "A perennial/annual legume and the second-most important pulse in India. Remarkable drought "
            "tolerance from its deep taproot, making it well-adapted to erratic rainfall patterns. "
            "A key crop in peninsular India (Maharashtra, Andhra Pradesh, Karnataka), and an excellent "
            "intercrop with cotton, sorghum, and maize, simultaneously fixing atmospheric nitrogen."
        )
    },
    # ── Oilseeds ──
    "Mustard": {
        "N": (40, 80), "P": (20, 50), "K": (10, 30),
        "temp": (10, 25), "humidity": (30, 60), "ph": (6.0, 7.5), "rainfall": (30, 80),
        "season": "Rabi (October - March)",
        "description": (
            "The most important Rabi oilseed crop in northern India, particularly dominant in Rajasthan, "
            "Haryana, and Uttar Pradesh. Seeds contain 36–48% oil used for cooking, while the oil cake is "
            "a protein-rich cattle feed. Well-adapted to loamy and sandy loam soils, contributing "
            "significantly to India's edible oil self-sufficiency goals."
        )
    },
    "Soybean": {
        "N": (20, 50), "P": (40, 80), "K": (20, 50),
        "temp": (20, 32), "humidity": (50, 80), "ph": (6.0, 7.5), "rainfall": (60, 150),
        "season": "Kharif (June - October)",
        "description": (
            "A dual-purpose crop providing high-protein oilseed and biological nitrogen fixation. "
            "The primary oilseed crop in Madhya Pradesh and Maharashtra — the 'Golden Bean'. Contains "
            "18–22% oil and 38–42% protein, making it the world's most important protein crop. "
            "Thrives in well-drained black (Vertisol) and red soils of central India."
        )
    },
    "Groundnut": {
        "N": (15, 40), "P": (30, 60), "K": (30, 70),
        "temp": (22, 35), "humidity": (50, 80), "ph": (5.5, 7.0), "rainfall": (50, 130),
        "season": "Kharif (June - October)",
        "description": (
            "India's most important oilseed crop by area — a critical source of protein (25–28%) and "
            "edible oil (45–50%). Thrives in well-drained sandy loam or red laterite soils. Dominant in "
            "Andhra Pradesh, Gujarat, Tamil Nadu, and Karnataka. An underground-fruiting legume that fixes "
            "atmospheric nitrogen, improving soil health for subsequent crops."
        )
    },
    "Sunflower": {
        "N": (50, 100), "P": (40, 70), "K": (30, 60),
        "temp": (18, 32), "humidity": (40, 70), "ph": (6.0, 7.5), "rainfall": (50, 120),
        "season": "Kharif / Rabi (Both Seasons)",
        "description": (
            "A high-yielding oilseed crop with remarkable adaptability across diverse soils and climates. "
            "Seeds contain 40–50% light-colored polyunsaturated oil rich in Vitamin E. Its unique "
            "phototropism maximizes photosynthesis efficiency. A strong candidate for double-cropping due "
            "to dual-season suitability in Karnataka, Maharashtra, and Andhra Pradesh."
        )
    },
    # ── Commercial Crops ──
    "Cotton": {
        "N": (90, 150), "P": (30, 60), "K": (30, 60),
        "temp": (25, 38), "humidity": (40, 70), "ph": (6.0, 8.0), "rainfall": (50, 120),
        "season": "Kharif (April - October)",
        "description": (
            "India's most important commercial fiber crop and the backbone of its textile industry. "
            "Best suited for deep black cotton soil (regur/Vertisol). Bt cotton varieties dominate "
            "acreage, offering pest management advantages while delivering improved fiber quality. "
            "Primarily cultivated in Gujarat, Maharashtra, Telangana, and Andhra Pradesh."
        )
    },
    "Sugarcane": {
        "N": (100, 180), "P": (40, 80), "K": (50, 100),
        "temp": (20, 35), "humidity": (60, 90), "ph": (6.0, 8.0), "rainfall": (100, 200),
        "season": "Annual (10-18 months)",
        "description": (
            "A long-duration tropical commercial crop forming the backbone of India's sugar industry — "
            "the world's largest. Produces sucrose-rich stalks used for sugar, jaggery, ethanol, and "
            "bioenergy. Major states: Uttar Pradesh, Maharashtra, Karnataka, and Tamil Nadu. "
            "Bagasse is an important biofuel for co-generation; press mud is a valuable soil amendment."
        )
    },
    "Jute": {
        "N": (60, 100), "P": (25, 50), "K": (30, 60),
        "temp": (24, 35), "humidity": (70, 95), "ph": (5.5, 7.0), "rainfall": (150, 300),
        "season": "Kharif (March - August)",
        "description": (
            "A bast natural fiber crop requiring hot, humid conditions and heavy monsoon rainfall. "
            "Predominantly cultivated in the fertile alluvial soils of West Bengal, Assam, Bihar, and Odisha. "
            "The long-stem fibers are processed through retting for sackcloth and eco-friendly packaging. "
            "A sustainable alternative to synthetic fibers with growing global green market demand."
        )
    },
    # ── Vegetables ──
    "Potato": {
        "N": (80, 150), "P": (40, 80), "K": (60, 120),
        "temp": (12, 22), "humidity": (60, 85), "ph": (5.0, 6.5), "rainfall": (50, 100),
        "season": "Rabi (October - February)",
        "description": (
            "A cool-season vegetable crop and India's third most important food crop — the world's "
            "second-largest producer. Requires well-drained, loose, sandy loam soil rich in organic matter "
            "with temperatures below 22°C for optimal tuber formation. High in carbohydrates, Vitamin C, "
            "and potassium. Vital for food security and the growing processing industry."
        )
    },
    "Tomato": {
        "N": (80, 130), "P": (50, 80), "K": (50, 100),
        "temp": (18, 30), "humidity": (50, 80), "ph": (6.0, 7.0), "rainfall": (40, 100),
        "season": "Year-round (varies by region)",
        "description": (
            "The most widely consumed vegetable in India and a high-value commercial crop. Requires moderate "
            "temperatures (18–30°C), fertile, well-drained soil rich in organic matter. Sensitive to frost "
            "and waterlogging. Rich in lycopene, Vitamin C, and antioxidants. Cultivated year-round across "
            "different agro-climatic zones with appropriate variety selection."
        )
    },
    "Onion": {
        "N": (80, 120), "P": (40, 70), "K": (40, 80),
        "temp": (15, 25), "humidity": (50, 70), "ph": (6.0, 7.0), "rainfall": (50, 100),
        "season": "Rabi (October - February)",
        "description": (
            "An economically critical vegetable with consistent high market demand and export value. "
            "India is the world's second-largest onion producer and a major global exporter. Sensitive "
            "to excess moisture causing bulb rot. Primarily cultivated in Maharashtra, Karnataka, Andhra "
            "Pradesh, and Madhya Pradesh. Rich in quercetin, sulfur compounds, and Vitamin C."
        )
    },
    "Garlic": {
        "N": (80, 130), "P": (40, 70), "K": (60, 100),
        "temp": (12, 22), "humidity": (45, 70), "ph": (6.0, 7.0), "rainfall": (40, 80),
        "season": "Rabi (October - February)",
        "description": (
            "A premium high-value bulb crop with culinary and medicinal significance. Requires cool "
            "temperatures (below 20°C) during vegetative growth for proper bulb differentiation. Grows "
            "best in well-drained sandy loam to clay loam soils with good organic content. Rich in allicin, "
            "flavonoids, and organosulfur compounds with proven antimicrobial and cardiovascular benefits."
        )
    },
    # ── Fruits ──
    "Banana": {
        "N": (100, 200), "P": (50, 100), "K": (80, 150),
        "temp": (22, 35), "humidity": (65, 90), "ph": (5.5, 7.0), "rainfall": (100, 250),
        "season": "Year-round (tropical)",
        "description": (
            "India's highest-produced fruit crop and a nutritionally dense tropical horticultural crop. "
            "Requires warm temperatures, high humidity, abundant water, and deep, well-drained fertile soil. "
            "Grown year-round in Tamil Nadu, Andhra Pradesh, Maharashtra, and Gujarat. Rich in potassium, "
            "Vitamin B6, and natural sugars. Modern tissue culture planting material boosts yield "
            "with superior disease resistance."
        )
    },
    "Mango": {
        "N": (60, 120), "P": (30, 60), "K": (50, 100),
        "temp": (24, 40), "humidity": (50, 80), "ph": (5.5, 7.5), "rainfall": (75, 200),
        "season": "Summer (March - June)",
        "description": (
            "The 'King of Fruits' and India's national fruit — the country's most important commercial fruit "
            "crop with over 1,000 cultivated varieties. Requires a distinct dry season to induce flowering, "
            "followed by warm humid conditions for fruit development. India accounts for over 40% of global "
            "mango production. Alphonso, Dashehari, Langra, and Kesar are premium export-quality cultivars."
        )
    },
}

# ──────────────────────────────────────────────────────────
#  Lazy model loader (module-level cache)
# ──────────────────────────────────────────────────────────
_model   = None
_encoder = None
_metadata= None


def _load_model():
    """Load model from disk once and cache it in memory."""
    global _model, _encoder, _metadata
    if _model is not None:
        return _model, _encoder, _metadata

    try:
        import joblib
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
        _model   = joblib.load(MODEL_PATH)
        _encoder = joblib.load(ENCODER_PATH)
        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH) as f:
                _metadata = json.load(f)
        print(f"[CROP] ✅ Loaded 5-Model Ensemble from {MODEL_PATH}")
        if _metadata:
            print(f"       Model : {_metadata.get('model_type', 'N/A')}")
            print(f"       Accuracy: {_metadata.get('accuracy', 'N/A')} | "
                  f"CV: {_metadata.get('cv_accuracy', 'N/A')} ± {_metadata.get('cv_std', 'N/A')} | "
                  f"Crops: {_metadata.get('n_classes', 'N/A')} | "
                  f"Samples: {_metadata.get('total_samples', 'N/A')}")
    except Exception as exc:
        print(f"[CROP] ⚠️  ML model unavailable — {exc}")
        _model = _encoder = _metadata = None

    return _model, _encoder, _metadata


# ──────────────────────────────────────────────────────────
#  Scoring helper (fallback algorithm)
# ──────────────────────────────────────────────────────────
def _score(value: float, optimal_range: tuple) -> float:
    lo, hi = optimal_range
    if lo <= value <= hi:
        mid      = (lo + hi) / 2.0
        distance = abs(value - mid) / max((hi - lo), 1e-9) * 2
        return max(0.0, 100 - distance * 30)
    elif value < lo:
        diff_pct = (lo - value) / max(lo, 1e-9) * 100
        return max(0.0, 70 - diff_pct)
    else:
        diff_pct = (value - hi) / max(hi, 1e-9) * 100
        return max(0.0, 70 - diff_pct)


def _fallback_predict(req: CropPredictionRequest) -> list:
    results = []
    for name, params in CROP_DATABASE.items():
        scores = [
            _score(req.nitrogen,    params["N"]),
            _score(req.phosphorus,  params["P"]),
            _score(req.potassium,   params["K"]),
            _score(req.temperature, params["temp"]),
            _score(req.humidity,    params["humidity"]),
            _score(req.ph,          params["ph"]),
            _score(req.rainfall,    params["rainfall"]),
        ]
        results.append({
            "name":        name,
            "confidence":  round(sum(scores) / len(scores), 1),
            "season":      params["season"],
            "description": params["description"],
        })
    results.sort(key=lambda x: x["confidence"], reverse=True)
    return results[:6]


# ──────────────────────────────────────────────────────────
#  Public API
# ──────────────────────────────────────────────────────────
def predict_crop(request: CropPredictionRequest) -> dict:
    """
    Returns top crop recommendations.

    Uses the trained 5-Model Ensemble ML model (no external API calls).
    Models: Decision Tree, SVM (RBF), KNN, Extra Trees, Naive Bayes.
    Falls back to rule-based scoring if model file is absent.
    """
    model, le, metadata = _load_model()

    if model is not None and le is not None:
        # ── ML model path ──────────────────────────────────
        X = np.array([[
            request.nitrogen, request.phosphorus, request.potassium,
            request.temperature, request.humidity, request.ph, request.rainfall
        ]], dtype=np.float32)

        proba       = model.predict_proba(X)[0]
        top_indices = np.argsort(proba)[::-1][:6]

        crops = []
        for idx in top_indices:
            raw_name  = le.classes_[idx]          # lowercase from training
            title_name= raw_name.title()           # "rice" → "Rice"
            db_info   = CROP_DATABASE.get(title_name, {})

            # If metadata has richer info, use it
            meta_crop = {}
            if metadata and "crops_config" in metadata:
                meta_crop = metadata["crops_config"].get(raw_name, {})

            crops.append({
                "name":        title_name,
                "confidence":  round(float(proba[idx]) * 100, 1),
                "season":      db_info.get("season", meta_crop.get("season", "")),
                "description": db_info.get("description", meta_crop.get("description", "")),
            })

        model_label = (metadata or {}).get(
            "model_type",
            "5-Model Ensemble (Decision Tree + SVM + KNN + Extra Trees + Naive Bayes)"
        )
        return {
            "crops":      crops,
            "model_used": model_label,
            "tips":       generate_tips(request),
        }

    # ── Fallback: rule-based scoring ───────────────────────
    print("[CROP] Using fallback scoring algorithm.")
    return {
        "crops":      _fallback_predict(request),
        "model_used": "Rule-Based Suitability Scoring (Model unavailable)",
        "tips":       generate_tips(request),
    }


def generate_tips(req: CropPredictionRequest) -> list:
    tips = []

    # pH
    if req.ph < 5.5:
        tips.append("Soil pH is very acidic (< 5.5). Apply agricultural lime at 2–4 t/ha to raise pH.")
    elif req.ph < 6.0:
        tips.append("Soil is mildly acidic. Small lime application (1–2 t/ha) will benefit most crops.")
    elif req.ph > 8.0:
        tips.append("Soil pH is high (alkaline). Apply gypsum or sulfur to lower pH closer to 6.5–7.0.")

    # Nitrogen
    if req.nitrogen < 40:
        tips.append("Nitrogen is low. Apply urea (46% N) at 100–120 kg/ha or use green manuring with legumes.")
    elif req.nitrogen > 150:
        tips.append("Very high nitrogen — risk of lodging and pest build-up. Consider split application.")

    # Phosphorus
    if req.phosphorus < 25:
        tips.append("Phosphorus is below optimal. Apply DAP (Di-Ammonium Phosphate) at 50–75 kg/ha.")

    # Potassium
    if req.potassium < 20:
        tips.append("Potassium is low. Apply Muriate of Potash (MOP) at 40–60 kg/ha.")

    # Rainfall
    if req.rainfall < 50:
        tips.append("Very low rainfall. Choose drought-tolerant crops (sorghum, mustard, chickpea) or invest in drip irrigation.")
    elif req.rainfall < 80:
        tips.append("Limited rainfall. Consider micro-irrigation for water-sensitive crops.")

    # Humidity
    if req.humidity > 85:
        tips.append("High humidity. Monitor for fungal diseases; maintain proper plant spacing and air circulation.")
    elif req.humidity < 35:
        tips.append("Low humidity. Mulching can help retain soil moisture between irrigations.")

    # Temperature
    if req.temperature > 38:
        tips.append("High temperature stress likely. Use heat-tolerant varieties and irrigate during cooler hours.")
    elif req.temperature < 10:
        tips.append("Cold conditions. Choose Rabi crops like wheat, barley, or mustard that tolerate low temperatures.")

    if not tips:
        tips.append("Soil and climate parameters are within good ranges for most crops. Maintain current practices.")

    return tips


def analyze_soil(request: CropPredictionRequest) -> dict:
    analysis = {
        "nitrogen_status":   ("High" if request.nitrogen   > 80  else "Medium" if request.nitrogen   > 40  else "Low"),
        "phosphorus_status": ("High" if request.phosphorus > 60  else "Medium" if request.phosphorus > 25  else "Low"),
        "potassium_status":  ("High" if request.potassium  > 60  else "Medium" if request.potassium  > 20  else "Low"),
        "ph_status":         ("Acidic" if request.ph < 6.0 else "Alkaline" if request.ph > 7.5 else "Neutral"),
        "overall_fertility": "",
        "recommendations":   [],
    }

    score = sum([
        1 if request.nitrogen   > 40  else 0,
        1 if request.phosphorus > 25  else 0,
        1 if request.potassium  > 20  else 0,
        1 if 6.0 <= request.ph <= 7.5 else 0,
    ])
    analysis["overall_fertility"] = "High" if score >= 4 else "Medium" if score >= 2 else "Low"

    if analysis["nitrogen_status"]   == "Low":
        analysis["recommendations"].append("Apply urea (46% N) at 100 kg/ha or FYM at 10 t/ha.")
    if analysis["phosphorus_status"] == "Low":
        analysis["recommendations"].append("Apply DAP at 50–75 kg/ha or bone meal for organic farming.")
    if analysis["potassium_status"]  == "Low":
        analysis["recommendations"].append("Apply MOP at 40–60 kg/ha to improve quality and disease resistance.")
    if analysis["ph_status"] == "Acidic":
        analysis["recommendations"].append("Apply agricultural lime at 2–4 t/ha to correct acidity.")
    elif analysis["ph_status"] == "Alkaline":
        analysis["recommendations"].append("Apply gypsum at 2–5 t/ha and increase organic matter to reduce alkalinity.")

    if not analysis["recommendations"]:
        analysis["recommendations"].append("Soil parameters are within optimal ranges. Maintain current nutrient practices.")

    return analysis
