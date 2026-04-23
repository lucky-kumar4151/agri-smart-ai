"""
Crop Recommendation Model Training Script
=========================================
5-Model Ensemble: Decision Tree + SVM + KNN + Extra Trees + Naive Bayes
Dataset:  Synthetic high-fidelity agronomic data  (6,600 records, 22 crops)

Features  : N, P, K, temperature, humidity, ph, rainfall
Target    : crop label (22 classes)

Run:
    python ml/crop_model/train_crop_model.py
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import ExtraTreesClassifier, VotingClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, accuracy_score
from sklearn.utils import shuffle
import joblib
import os
import json

# ──────────────────────────────────────────────────────────
#  Configuration
# ──────────────────────────────────────────────────────────
MODEL_DIR      = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH     = os.path.join(MODEL_DIR, "crop_model.pkl")
ENCODER_PATH   = os.path.join(MODEL_DIR, "label_encoder.pkl")
METADATA_PATH  = os.path.join(MODEL_DIR, "model_metadata.json")

# ──────────────────────────────────────────────────────────
#  Crop Agronomic Profiles
#  Each entry: (min, max) for N, P, K, temp, humidity, ph, rainfall
# ──────────────────────────────────────────────────────────
CROPS_CONFIG = {
    # ── Cereals ──────────────────────────────────────────
    "rice": {
        "N": (60, 120), "P": (30, 70), "K": (30, 60),
        "temp": (20, 35), "hum": (60, 95), "ph": (5.5, 7.0), "rain": (150, 300),
        "season": "Kharif (June - October)",
        "description": (
            "A staple cereal crop ideal for warm, humid conditions with heavy irrigation. "
            "Thrives in low-lying paddy fields with clay or loamy soil that retains water effectively. "
            "Rice is the backbone of Indian food security, accounting for over 40% of total food grain production. "
            "Best cultivated in states like West Bengal, Punjab, Uttar Pradesh, and Andhra Pradesh."
        )
    },
    "wheat": {
        "N": (80, 150), "P": (40, 80), "K": (20, 50),
        "temp": (10, 25), "hum": (40, 70), "ph": (6.0, 7.5), "rain": (50, 120),
        "season": "Rabi (November - March)",
        "description": (
            "India's primary Rabi crop and a critical staple grain. Requires cool, dry weather during "
            "the growing phase and moderate moisture. Well-suited for the Indo-Gangetic plains of Punjab, "
            "Haryana, and Uttar Pradesh. Rich in carbohydrates and proteins, it is fundamental to Indian "
            "dietary patterns and the agrarian economy."
        )
    },
    "maize": {
        "N": (60, 140), "P": (30, 60), "K": (20, 50),
        "temp": (18, 32), "hum": (50, 80), "ph": (5.5, 7.5), "rain": (60, 150),
        "season": "Kharif / Rabi (Dual Season)",
        "description": (
            "A highly versatile cereal crop cultivated for food, animal fodder, poultry feed, and "
            "industrial starch and ethanol production. Adapts well to diverse climatic zones and soil "
            "types across India. Its dual-season suitability makes it a preferred choice for farmers "
            "seeking year-round productivity in states like Karnataka, Andhra Pradesh, and Rajasthan."
        )
    },
    "barley": {
        "N": (60, 120), "P": (30, 60), "K": (20, 40),
        "temp": (7, 20), "hum": (30, 60), "ph": (6.0, 7.5), "rain": (40, 100),
        "season": "Rabi (October - March)",
        "description": (
            "A robust Rabi cereal crop known for its tolerance of poor soil conditions and cold climates. "
            "Widely grown in Rajasthan, Uttar Pradesh, Madhya Pradesh, and Haryana. Used extensively "
            "for malting, brewing, food, and livestock feed. Its drought-tolerance makes it a strategic "
            "crop for semi-arid environments where other cereals struggle."
        )
    },
    "sorghum": {
        "N": (50, 100), "P": (20, 50), "K": (20, 40),
        "temp": (22, 35), "hum": (30, 70), "ph": (5.5, 7.5), "rain": (40, 120),
        "season": "Kharif (June - September)",
        "description": (
            "An exceptional drought-tolerant cereal ideal for dryland and rainfed farming systems. "
            "Thrives in semi-arid regions of Maharashtra, Karnataka, and Rajasthan where water availability "
            "is limited. Essential for food security in low-rainfall zones, serving as both a staple grain "
            "and high-quality livestock fodder. Its deep root system enables efficient water extraction."
        )
    },
    # ── Pulses ───────────────────────────────────────────
    "chickpea": {
        "N": (20, 50), "P": (40, 80), "K": (15, 40),
        "temp": (15, 30), "hum": (30, 60), "ph": (6.0, 8.0), "rain": (40, 100),
        "season": "Rabi (October - March)",
        "description": (
            "The most important pulse crop in India, often called 'Bengal Gram'. A biological nitrogen-fixer "
            "that naturally enriches soil fertility, reducing the need for synthetic fertilizers. "
            "Drought-tolerant and best suited for rainfed black cotton soils of Madhya Pradesh, Rajasthan, "
            "and Maharashtra. Rich in protein, fiber, and micronutrients, it is critical for dietary balance "
            "in rural and urban India."
        )
    },
    "lentil": {
        "N": (15, 40), "P": (30, 60), "K": (15, 35),
        "temp": (12, 25), "hum": (30, 60), "ph": (6.0, 7.5), "rain": (30, 80),
        "season": "Rabi (October - February)",
        "description": (
            "A high-protein pulse crop thriving in cool, dry weather during the Rabi season. Known for "
            "atmospheric nitrogen fixation (60–90 kg N/ha annually), significantly improving soil health "
            "for subsequent crops. Widely cultivated in Madhya Pradesh, Uttar Pradesh, and Bihar. "
            "Its short crop cycle of 90–110 days and low water requirement make it economically attractive "
            "for resource-limited farmers."
        )
    },
    "moong": {
        "N": (15, 35), "P": (30, 60), "K": (20, 40),
        "temp": (25, 35), "hum": (55, 80), "ph": (6.0, 7.5), "rain": (60, 120),
        "season": "Kharif (June - September)",
        "description": (
            "A short-duration summer pulse (60–70 days) rich in digestible plant protein and essential "
            "amino acids. Excels in sandy loam soils with adequate drainage and warm, moderately humid "
            "conditions. A valuable intercrop and rotation crop that naturally replenishes soil nitrogen. "
            "Widely grown in Rajasthan, Maharashtra, and Andhra Pradesh. Highly demanded by consumers "
            "for its culinary versatility and nutritional profile."
        )
    },
    "pigeonpea": {
        "N": (20, 40), "P": (40, 70), "K": (20, 40),
        "temp": (22, 35), "hum": (50, 80), "ph": (5.5, 7.5), "rain": (60, 150),
        "season": "Kharif (June - October)",
        "description": (
            "A perennial/annual legume and the second-most important pulse in India after chickpea. "
            "Remarkable drought tolerance owing to its deep taproot system, making it well-adapted to "
            "erratic rainfall. A key crop in the peninsular Indian states of Maharashtra, Andhra Pradesh, "
            "and Karnataka. Functions as an excellent intercrop with cotton, sorghum, and maize, while "
            "simultaneously fixing atmospheric nitrogen to restore soil fertility."
        )
    },
    # ── Oilseeds ─────────────────────────────────────────
    "mustard": {
        "N": (40, 80), "P": (20, 50), "K": (10, 30),
        "temp": (10, 25), "hum": (30, 60), "ph": (6.0, 7.5), "rain": (30, 80),
        "season": "Rabi (October - March)",
        "description": (
            "The most important Rabi oilseed crop in northern India, particularly dominant in Rajasthan, "
            "Haryana, and Uttar Pradesh. Requires cool dry weather during vegetative growth with moderate "
            "temperatures for seed filling and maturation. The seeds contain 36–48% oil used for cooking, "
            "and the oil cake is a protein-rich cattle feed. Well-adapted to loamy and sandy loam soils, "
            "contributing significantly to India's edible oil self-sufficiency goals."
        )
    },
    "soybean": {
        "N": (20, 50), "P": (40, 80), "K": (20, 50),
        "temp": (20, 32), "hum": (50, 80), "ph": (6.0, 7.5), "rain": (60, 150),
        "season": "Kharif (June - October)",
        "description": (
            "A dual-purpose crop providing high-protein oilseed and nitrogen from biological fixation. "
            "The primary oilseed crop in Madhya Pradesh and Maharashtra, often called the 'Golden Bean'. "
            "Contains 18–22% oil and 38–42% protein, making it the world's most important protein crop. "
            "Thrives in well-drained black (Vertisol) and red soils characteristic of central India. "
            "The oil cake is a premium ingredient in poultry, fish, and livestock feed formulations."
        )
    },
    "groundnut": {
        "N": (15, 40), "P": (30, 60), "K": (30, 70),
        "temp": (22, 35), "hum": (50, 80), "ph": (5.5, 7.0), "rain": (50, 130),
        "season": "Kharif (June - October)",
        "description": (
            "India's most important oilseed crop by area and a critical source of protein (25–28%) and edible "
            "oil (45–50%). Thrives in well-drained sandy loam or red laterite soils with abundant sunshine. "
            "Dominant in Andhra Pradesh, Gujarat, Tamil Nadu, and Karnataka. An underground-fruiting legume "
            "that fixes atmospheric nitrogen, improving soil health for subsequent crops. The oil cake is "
            "an excellent livestock feed supplement high in protein."
        )
    },
    "sunflower": {
        "N": (50, 100), "P": (40, 70), "K": (30, 60),
        "temp": (18, 32), "hum": (40, 70), "ph": (6.0, 7.5), "rain": (50, 120),
        "season": "Kharif / Rabi (Both Seasons)",
        "description": (
            "A high-yielding oilseed crop with remarkable adaptability across diverse soils and climates. "
            "The seeds contain 40–50% light-colored, health-promoting polyunsaturated oil rich in Vitamin E. "
            "Its unique phototropism — ability to track sunlight — maximizes photosynthesis efficiency. "
            "A strong candidate for double-cropping due to dual-season suitability in Karnataka, Maharashtra, "
            "and Andhra Pradesh. The stalks and heads serve as valuable livestock fodder after harvest."
        )
    },
    # ── Commercial Crops ──────────────────────────────────
    "cotton": {
        "N": (90, 150), "P": (30, 60), "K": (30, 60),
        "temp": (25, 38), "hum": (40, 70), "ph": (6.0, 8.0), "rain": (50, 120),
        "season": "Kharif (April - October)",
        "description": (
            "India's most important commercial fiber crop and the backbone of its textile industry. "
            "Best suited for deep black cotton soil (regur/Vertisol), which retains moisture efficiently. "
            "Requires a long warm growing season with adequate sunshine for boll development. Cultivated "
            "primarily in Gujarat, Maharashtra, Telangana, and Andhra Pradesh. Bt cotton varieties now "
            "dominate acreage, offering integrated pest management advantages against bollworm complexes "
            "while delivering improved fiber quality and higher lint yields."
        )
    },
    "sugarcane": {
        "N": (100, 180), "P": (40, 80), "K": (50, 100),
        "temp": (20, 35), "hum": (60, 90), "ph": (6.0, 8.0), "rain": (100, 200),
        "season": "Annual (10-18 months)",
        "description": (
            "A long-duration tropical commercial crop forming the backbone of India's sugar industry — "
            "the world's largest. Produces sucrose-rich stalks used for sugar, jaggery, ethanol, and "
            "bioenergy. Requires tropical to subtropical climate with abundant water supply through "
            "irrigation or high rainfall. Major cultivating states include Uttar Pradesh, Maharashtra, "
            "Karnataka, and Tamil Nadu. The crop residue (bagasse) is an important biofuel for sugar "
            "mill co-generation, and press mud is a valuable organic soil amendment."
        )
    },
    "jute": {
        "N": (60, 100), "P": (25, 50), "K": (30, 60),
        "temp": (24, 35), "hum": (70, 95), "ph": (5.5, 7.0), "rain": (150, 300),
        "season": "Kharif (March - August)",
        "description": (
            "A bast natural fiber crop requiring hot, humid conditions and heavy monsoon rainfall. "
            "Predominantly cultivated in the fertile alluvial soils of West Bengal, Assam, Bihar, and "
            "Odisha along the Gangetic delta. The long-stem fibers are extracted through retting — "
            "soaking in water — producing golden, lustrous fibers used for sackcloth, hessian, and "
            "eco-friendly packaging. It biodegrades rapidly and serves as an environmentally sustainable "
            "alternative to synthetic fibers, with growing demand in global green markets."
        )
    },
    # ── Vegetables ────────────────────────────────────────
    "potato": {
        "N": (80, 150), "P": (40, 80), "K": (60, 120),
        "temp": (12, 22), "hum": (60, 85), "ph": (5.0, 6.5), "rain": (50, 100),
        "season": "Rabi (October - February)",
        "description": (
            "A cool-season vegetable crop and India's third most important food crop. India is the "
            "world's second-largest potato producer. Requires well-drained, loose, sandy loam to loamy "
            "soil rich in organic matter, with temperatures below 22°C for optimal tuber formation. "
            "Cultivated primarily in Uttar Pradesh, West Bengal, Bihar, and Gujarat. High in carbohydrates, "
            "Vitamin C, and potassium. A vital crop for food security, processing industry (chips, starch), "
            "and cold chain logistics development in rural India."
        )
    },
    "tomato": {
        "N": (80, 130), "P": (50, 80), "K": (50, 100),
        "temp": (18, 30), "hum": (50, 80), "ph": (6.0, 7.0), "rain": (40, 100),
        "season": "Year-round (varies by region)",
        "description": (
            "The most widely consumed vegetable in India and a high-value commercial crop. Requires "
            "moderate temperatures (18–30°C), adequate fertility, and well-drained soil rich in organic "
            "matter. Sensitive to frost and waterlogging. Major producing states include Andhra Pradesh, "
            "Madhya Pradesh, Maharashtra, and Karnataka. Rich in lycopene, Vitamin C, and antioxidants. "
            "Cultivated year-round across different agro-climatic zones with appropriate variety selection, "
            "making it economically rewarding for progressive farmers."
        )
    },
    "onion": {
        "N": (80, 120), "P": (40, 70), "K": (40, 80),
        "temp": (15, 25), "hum": (50, 70), "ph": (6.0, 7.0), "rain": (50, 100),
        "season": "Rabi (October - February)",
        "description": (
            "An economically critical vegetable crop with consistent high market demand and export value. "
            "India is the world's second-largest onion producer and a major global exporter. Prefers "
            "loamy, well-drained soils with moderate fertility. Sensitive to excess moisture and heavy "
            "rainfall, which causes bulb rot. Primarily cultivated in Maharashtra, Karnataka, Andhra Pradesh, "
            "and Madhya Pradesh. Rich in quercetin, sulfur compounds, and Vitamin C. Price volatility makes "
            "it both a high-risk and high-reward crop for farmer income."
        )
    },
    "garlic": {
        "N": (80, 130), "P": (40, 70), "K": (60, 100),
        "temp": (12, 22), "hum": (45, 70), "ph": (6.0, 7.0), "rain": (40, 80),
        "season": "Rabi (October - February)",
        "description": (
            "A premium high-value bulb crop with both culinary and medicinal significance. Requires "
            "cool temperatures (below 20°C) during the vegetative phase for proper bulb differentiation "
            "and a warm, dry period for bulb curing. Grows best in well-drained sandy loam to clay loam "
            "soils with good organic content. Major cultivation zones include Madhya Pradesh, Gujarat, "
            "Rajasthan, and Uttar Pradesh. Rich in allicin, flavonoids, and organosulfur compounds with "
            "proven antimicrobial and cardiovascular health benefits, commanding premium commodity prices."
        )
    },
    # ── Fruits ───────────────────────────────────────────
    "banana": {
        "N": (100, 200), "P": (50, 100), "K": (80, 150),
        "temp": (22, 35), "hum": (65, 90), "ph": (5.5, 7.0), "rain": (100, 250),
        "season": "Year-round (tropical)",
        "description": (
            "India's highest-produced fruit crop and a nutritionally dense tropical horticultural crop. "
            "Requires warm temperatures, high humidity, abundant water, and deep, well-drained fertile "
            "alluvial or loamy soils. Grown year-round in Tamil Nadu, Andhra Pradesh, Maharashtra, "
            "and Gujarat. Provides significant income to smallholder farmers due to high market value "
            "and continuous bearing nature. Rich in potassium, Vitamin B6, and natural sugars. Modern "
            "tissue culture planting material significantly boosts yield with superior disease resistance."
        )
    },
    "mango": {
        "N": (60, 120), "P": (30, 60), "K": (50, 100),
        "temp": (24, 40), "hum": (50, 80), "ph": (5.5, 7.5), "rain": (75, 200),
        "season": "Summer (March - June)",
        "description": (
            "The 'King of Fruits' and India's national fruit — the country's most important commercial "
            "fruit crop with over 1,000 cultivated varieties. Requires a distinct dry season to induce "
            "flowering, followed by warm humid conditions for fruit development. Thrives in deep, "
            "well-drained alluvial or lateritic loamy soils. Dominant in Uttar Pradesh, Andhra Pradesh, "
            "Maharashtra, and Karnataka. India accounts for over 40% of global mango production. Alphonso, "
            "Dashehari, Langra, and Kesar are premium export-quality cultivars commanding premium prices."
        )
    },
}

# ──────────────────────────────────────────────────────────
#  Season labels for classification
# ──────────────────────────────────────────────────────────
SEASON_MAP = {
    "rice":      "Kharif",
    "wheat":     "Rabi",
    "maize":     "Dual",
    "barley":    "Rabi",
    "sorghum":   "Kharif",
    "chickpea":  "Rabi",
    "lentil":    "Rabi",
    "moong":     "Kharif",
    "pigeonpea": "Kharif",
    "mustard":   "Rabi",
    "soybean":   "Kharif",
    "groundnut": "Kharif",
    "sunflower": "Dual",
    "cotton":    "Kharif",
    "sugarcane": "Annual",
    "jute":      "Kharif",
    "potato":    "Rabi",
    "tomato":    "Annual",
    "onion":     "Rabi",
    "garlic":    "Rabi",
    "banana":    "Annual",
    "mango":     "Annual",
}


# ──────────────────────────────────────────────────────────
#  Data Generation
# ──────────────────────────────────────────────────────────
def generate_training_data(n_samples: int = 6600) -> pd.DataFrame:
    """
    Generates high-fidelity synthetic agronomic dataset.
    n_samples is distributed equally across all 22 crops.
    Uses multiple noise levels to simulate real-world variability.
    """
    np.random.seed(42)
    n_crops = len(CROPS_CONFIG)
    spc = n_samples // n_crops          # samples per crop
    data = []

    for crop, params in CROPS_CONFIG.items():
        # Core samples — tight distribution around optimal range
        for _ in range(int(spc * 0.70)):
            row = {
                "N":           np.random.uniform(*params["N"]),
                "P":           np.random.uniform(*params["P"]),
                "K":           np.random.uniform(*params["K"]),
                "temperature": np.random.uniform(*params["temp"]),
                "humidity":    np.random.uniform(*params["hum"]),
                "ph":          np.random.uniform(*params["ph"]),
                "rainfall":    np.random.uniform(*params["rain"]),
                "label":       crop,
                "season":      SEASON_MAP[crop],
            }
            data.append(row)

        # Edge-case samples — near boundaries (harder examples for model)
        for _ in range(int(spc * 0.20)):
            row = {}
            for feat, key in [("N","N"),("P","P"),("K","K"),("temperature","temp"),
                               ("humidity","hum"),("ph","ph"),("rainfall","rain")]:
                lo, hi = params[key]
                boundary = lo if np.random.random() < 0.5 else hi
                noise = np.random.uniform(-0.05, 0.05) * (hi - lo)
                row[feat] = np.clip(boundary + noise, lo * 0.85, hi * 1.15)
            row["label"]  = crop
            row["season"] = SEASON_MAP[crop]
            data.append(row)

        # Slight-out-of-range samples (model must still learn, but with lower confidence)
        for _ in range(int(spc * 0.10)):
            row = {}
            for feat, key in [("N","N"),("P","P"),("K","K"),("temperature","temp"),
                               ("humidity","hum"),("ph","ph"),("rainfall","rain")]:
                lo, hi = params[key]
                span = hi - lo
                row[feat] = np.random.uniform(max(0, lo - span * 0.10), hi + span * 0.10)
            row["label"]  = crop
            row["season"] = SEASON_MAP[crop]
            data.append(row)

    df = pd.DataFrame(data)
    df = shuffle(df, random_state=42).reset_index(drop=True)
    print(f"   Dataset size : {len(df):,} samples")
    print(f"   Crops        : {df['label'].nunique()} ({', '.join(sorted(df['label'].unique()))})")
    print(f"   Seasons      : {df['season'].nunique()} ({', '.join(sorted(df['season'].unique()))})")
    return df


# ──────────────────────────────────────────────────────────
#  Model Training — 5-Model Ensemble
# ──────────────────────────────────────────────────────────
def train_model():
    print("=" * 70)
    print("  AgriSmart — Crop Recommendation Model Training")
    print("  22 Crops | 6600 Samples | 5-Model Ensemble Classifier")
    print("  Models: Decision Tree | SVM | KNN | Extra Trees | Naive Bayes")
    print("=" * 70)

    # ── Generate data ──────────────────────────────────────
    print("\n[DATA] Generating training data…")
    df = generate_training_data(6600)

    features = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    X = df[features].values.astype(np.float32)
    y = df["label"].values

    # ── Encode labels ──────────────────────────────────────
    le = LabelEncoder()
    y_enc = le.fit_transform(y)
    print(f"   Classes ({len(le.classes_)}): {list(le.classes_)}")

    # ── Train / test split ─────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.20, random_state=42, stratify=y_enc
    )
    print(f"   Train: {len(X_train):,}  |  Test: {len(X_test):,}")

    # ── Model 1: Decision Tree ─────────────────────────────
    print("\n[TRAIN] 1/5 — Training Decision Tree Classifier…")
    dt = DecisionTreeClassifier(
        max_depth=20,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced",
        criterion="gini",
        random_state=42,
    )
    dt.fit(X_train, y_train)
    dt_acc = accuracy_score(y_test, dt.predict(X_test))
    print(f"   Decision Tree Accuracy : {dt_acc*100:.2f}%")

    # ── Model 2: SVM (with scaling pipeline) ───────────────
    print("[TRAIN] 2/5 — Training SVM Classifier (RBF Kernel)…")
    svm_pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("svm", SVC(
            kernel="rbf",
            C=15.0,
            gamma="scale",
            probability=True,
            class_weight="balanced",
            random_state=42,
        ))
    ])
    svm_pipe.fit(X_train, y_train)
    svm_acc = accuracy_score(y_test, svm_pipe.predict(X_test))
    print(f"   SVM Accuracy           : {svm_acc*100:.2f}%")

    # ── Model 3: KNN (with scaling pipeline) ───────────────
    print("[TRAIN] 3/5 — Training KNN Classifier…")
    knn_pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("knn", KNeighborsClassifier(
            n_neighbors=7,
            weights="distance",
            metric="euclidean",
            algorithm="auto",
            n_jobs=-1,
        ))
    ])
    knn_pipe.fit(X_train, y_train)
    knn_acc = accuracy_score(y_test, knn_pipe.predict(X_test))
    print(f"   KNN Accuracy           : {knn_acc*100:.2f}%")

    # ── Model 4: Extra Trees ────────────────────────────────
    print("[TRAIN] 4/5 — Training Extra Trees Classifier…")
    et = ExtraTreesClassifier(
        n_estimators=200,
        max_depth=22,
        min_samples_split=3,
        min_samples_leaf=1,
        max_features="sqrt",
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    et.fit(X_train, y_train)
    et_acc = accuracy_score(y_test, et.predict(X_test))
    print(f"   Extra Trees Accuracy   : {et_acc*100:.2f}%")

    # ── Model 5: Gaussian Naive Bayes ──────────────────────
    print("[TRAIN] 5/5 — Training Gaussian Naive Bayes…")
    # Use scaling for NB too
    nb_pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("nb", GaussianNB(var_smoothing=1e-8))
    ])
    nb_pipe.fit(X_train, y_train)
    nb_acc = accuracy_score(y_test, nb_pipe.predict(X_test))
    print(f"   Naive Bayes Accuracy   : {nb_acc*100:.2f}%")

    # ── 5-Model Ensemble (soft voting) ─────────────────────
    print("\n[TRAIN] Building 5-Model Ensemble (Soft Voting)…")
    print("   Weights: DT=1, SVM=3, KNN=2, ET=3, NB=1")
    ensemble = VotingClassifier(
        estimators=[
            ("dt",  dt),
            ("svm", svm_pipe),
            ("knn", knn_pipe),
            ("et",  et),
            ("nb",  nb_pipe),
        ],
        voting="soft",
        weights=[1, 3, 2, 3, 1],   # SVM and ET get higher weights (better performers)
        n_jobs=-1,
    )
    ensemble.fit(X_train, y_train)

    # ── Evaluate ───────────────────────────────────────────
    y_pred   = ensemble.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n{'='*70}")
    print(f"  ✅ 5-Model Ensemble Accuracy : {accuracy * 100:.2f}%")
    print(f"  Individual: DT={dt_acc*100:.1f}% | SVM={svm_acc*100:.1f}% | KNN={knn_acc*100:.1f}% | ET={et_acc*100:.1f}% | NB={nb_acc*100:.1f}%")
    print(f"{'='*70}")
    print("\n[REPORT] Per-class Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_, zero_division=0))

    # ── Cross-validation (5-fold) on Extra Trees ──────────
    print("[CV] Running 5-fold Stratified Cross-Validation on Extra Trees…")
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(et, X, y_enc, cv=skf, scoring="accuracy", n_jobs=-1)
    print(f"   CV Accuracy : {cv_scores.mean()*100:.2f}% ± {cv_scores.std()*100:.2f}%")

    # ── Feature importance (from Extra Trees + Decision Tree) ──
    importances_et = dict(zip(features, et.feature_importances_))
    importances_dt = dict(zip(features, dt.feature_importances_))
    # Average both tree-based importances
    importances = {f: round((importances_et[f] + importances_dt[f]) / 2, 4) for f in features}
    print("\n[FEATURES] Averaged Feature Importance (Extra Trees + Decision Tree):")
    for feat, imp in sorted(importances.items(), key=lambda x: x[1], reverse=True):
        bar = "█" * int(imp * 60)
        print(f"   {feat:15s}: {imp:.4f}  {bar}")

    # ── Save model ─────────────────────────────────────────
    print(f"\n[SAVE] Saving 5-model ensemble → {MODEL_PATH}")
    joblib.dump(ensemble, MODEL_PATH, compress=3)
    joblib.dump(le, ENCODER_PATH)

    # ── Save metadata ──────────────────────────────────────
    metadata = {
        "model_type":         "5-Model Ensemble (Decision Tree + SVM + KNN + Extra Trees + Naive Bayes)",
        "models": {
            "decision_tree":  {"accuracy": round(dt_acc, 4), "params": {"max_depth": 20, "criterion": "gini", "class_weight": "balanced"}},
            "svm":            {"accuracy": round(svm_acc, 4), "params": {"kernel": "rbf", "C": 15.0, "gamma": "scale", "probability": True}},
            "knn":            {"accuracy": round(knn_acc, 4), "params": {"n_neighbors": 7, "weights": "distance", "metric": "euclidean"}},
            "extra_trees":    {"accuracy": round(et_acc,  4), "params": {"n_estimators": 200, "max_depth": 22, "class_weight": "balanced"}},
            "naive_bayes":    {"accuracy": round(nb_acc,  4), "params": {"var_smoothing": 1e-8, "type": "Gaussian"}},
        },
        "ensemble_weights":   {"dt": 1, "svm": 3, "knn": 2, "et": 3, "nb": 1},
        "voting_strategy":    "soft",
        "accuracy":           round(accuracy, 4),
        "cv_accuracy":        round(cv_scores.mean(), 4),
        "cv_std":             round(cv_scores.std(), 4),
        "features":           features,
        "classes":            list(le.classes_),
        "n_classes":          len(le.classes_),
        "crops_config":       {
            crop: {
                "season":      CROPS_CONFIG[crop]["season"],
                "description": CROPS_CONFIG[crop]["description"],
            }
            for crop in le.classes_
        },
        "feature_importance": importances,
        "training_samples":   len(X_train),
        "test_samples":       len(X_test),
        "total_samples":      len(df),
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print("[DONE] 5-Model ensemble + metadata saved successfully.")
    return ensemble, le


# ──────────────────────────────────────────────────────────
#  Inference helper
# ──────────────────────────────────────────────────────────
def predict(model, le, nitrogen, phosphorus, potassium,
            temperature, humidity, ph, rainfall):
    X = np.array([[nitrogen, phosphorus, potassium,
                   temperature, humidity, ph, rainfall]], dtype=np.float32)
    proba       = model.predict_proba(X)[0]
    top_indices = np.argsort(proba)[::-1][:5]
    return [
        {"crop": le.classes_[i], "confidence": round(proba[i] * 100, 1)}
        for i in top_indices
    ]


# ──────────────────────────────────────────────────────────
#  Entry point
# ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    model, le = train_model()

    print("\n" + "=" * 70)
    print("  Test Predictions")
    print("=" * 70)

    test_cases = [
        {"label": "Rice field  ", "n": 90,  "p": 48, "k": 40, "t": 28, "h": 82, "ph": 6.5, "r": 200},
        {"label": "Wheat field ", "n": 110, "p": 55, "k": 32, "t": 18, "h": 55, "ph": 7.0, "r": 80},
        {"label": "Cotton farm ", "n": 120, "p": 45, "k": 50, "t": 30, "h": 55, "ph": 7.2, "r": 70},
        {"label": "Banana crop ", "n": 150, "p": 70, "k": 120,"t": 28, "h": 80, "ph": 6.2, "r": 180},
        {"label": "Mustard area", "n": 55,  "p": 35, "k": 20, "t": 18, "h": 45, "ph": 6.8, "r": 55},
    ]
    for tc in test_cases:
        results = predict(model, le, tc["n"], tc["p"], tc["k"], tc["t"], tc["h"], tc["ph"], tc["r"])
        top3 = ", ".join(f"{r['crop']} ({r['confidence']}%)" for r in results[:3])
        print(f"\n  {tc['label']} →  {top3}")

    print("\n✅ 5-Model Ensemble training complete! Model is ready for AgriSmart backend.\n")
