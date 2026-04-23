"""
Plant Disease Detection Model Training Script
Uses YOLOv8 (Ultralytics) for leaf disease image classification

Dataset: PlantVillage Dataset (Kaggle)
Architecture: YOLOv8-cls (Classification variant)

Classes (38 from PlantVillage):
  Apple___Apple_scab, Apple___Black_rot, Apple___Cedar_apple_rust, Apple___healthy,
  Blueberry___healthy, Cherry___Powdery_mildew, Cherry___healthy,
  Corn___Cercospora_leaf_spot, Corn___Common_rust, Corn___Northern_Leaf_Blight, Corn___healthy,
  Grape___Black_rot, Grape___Esca, Grape___Leaf_blight, Grape___healthy,
  Orange___Haunglongbing, Peach___Bacterial_spot, Peach___healthy,
  Pepper___Bacterial_spot, Pepper___healthy,
  Potato___Early_blight, Potato___Late_blight, Potato___healthy,
  Raspberry___healthy, Soybean___healthy,
  Squash___Powdery_mildew, Strawberry___Leaf_scorch, Strawberry___healthy,
  Tomato___Bacterial_spot, Tomato___Early_blight, Tomato___Late_blight,
  Tomato___Leaf_Mold, Tomato___Septoria_leaf_spot,
  Tomato___Spider_mites, Tomato___Target_Spot,
  Tomato___Tomato_Yellow_Leaf_Curl_Virus, Tomato___Tomato_mosaic_virus, Tomato___healthy

How to train:
  1. pip install ultralytics torch torchvision
  2. Download PlantVillage dataset from Kaggle
  3. Organize into: dataset/train/<class_name>/*.jpg and dataset/val/<class_name>/*.jpg
  4. Run: python train_disease_model.py
"""

import os
import json

# ─── Configuration ───
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "disease_model_yolo.pt")
CLASSES_PATH = os.path.join(MODEL_DIR, "disease_classes.json")

# PlantVillage 38 classes
DISEASE_CLASSES = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]

# Human-readable disease info for display
DISEASE_INFO = {
    "Apple___Apple_scab": {
        "disease_name": "Apple Scab",
        "crop_type": "Apple",
        "description": "Apple scab is a fungal disease caused by Venturia inaequalis. It produces dark, scaly lesions on leaves and fruit.",
        "treatment": [
            "Apply fungicide sprays like Mancozeb or Captan at green-tip stage",
            "Remove and destroy fallen infected leaves",
            "Prune trees to improve air circulation"
        ],
        "pesticide": ["Mancozeb 75% WP", "Captan 50% WP", "Myclobutanil"],
        "prevention": [
            "Plant scab-resistant apple varieties",
            "Maintain proper spacing between trees",
            "Apply dormant copper sprays before bud break"
        ]
    },
    "Apple___Black_rot": {
        "disease_name": "Apple Black Rot",
        "crop_type": "Apple",
        "description": "Black rot is caused by the fungus Botryosphaeria obtusa. It causes leaf spots, fruit rot, and cankers on branches.",
        "treatment": [
            "Prune and remove dead or cankered branches",
            "Apply Captan or Thiophanate-methyl fungicide",
            "Remove mummified fruits from the tree"
        ],
        "pesticide": ["Captan 50% WP", "Thiophanate-methyl", "Copper fungicide"],
        "prevention": [
            "Maintain good tree hygiene by removing dead wood",
            "Ensure proper drainage around trees",
            "Apply protective fungicide during growing season"
        ]
    },
    "Apple___Cedar_apple_rust": {
        "disease_name": "Cedar Apple Rust",
        "crop_type": "Apple",
        "description": "Cedar apple rust is caused by Gymnosporangium juniperi-virginianae. Causes yellow-orange spots on leaves.",
        "treatment": [
            "Apply Myclobutanil or Triadimefon fungicide",
            "Remove nearby cedar/juniper trees if possible",
            "Spray at bloom and petal fall stages"
        ],
        "pesticide": ["Myclobutanil", "Triadimefon", "Mancozeb 75% WP"],
        "prevention": [
            "Plant rust-resistant apple cultivars",
            "Remove cedar trees within 1-2 miles",
            "Apply preventive fungicide in spring"
        ]
    },
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": {
        "disease_name": "Cercospora Leaf Spot (Gray Leaf Spot)",
        "crop_type": "Corn/Maize",
        "description": "Gray leaf spot is caused by Cercospora zeae-maydis. It causes rectangular gray-tan lesions between leaf veins.",
        "treatment": [
            "Apply foliar fungicide like Azoxystrobin or Propiconazole",
            "Rotate crops to non-host crops for 1-2 years",
            "Till crop residue to reduce inoculum"
        ],
        "pesticide": ["Azoxystrobin (Amistar)", "Propiconazole (Tilt)", "Mancozeb 75% WP"],
        "prevention": [
            "Use resistant hybrid varieties",
            "Practice crop rotation with non-cereal crops",
            "Avoid continuous corn planting"
        ]
    },
    "Corn_(maize)___Common_rust_": {
        "disease_name": "Common Rust",
        "crop_type": "Corn/Maize",
        "description": "Common rust is caused by Puccinia sorghi. Small, circular to elongated brown pustules appear on both leaf surfaces.",
        "treatment": [
            "Apply fungicide like Mancozeb or Propiconazole if severe",
            "Remove heavily infected plant debris",
            "Apply foliar spray at first sign of pustules"
        ],
        "pesticide": ["Mancozeb 75% WP", "Propiconazole", "Tebuconazole"],
        "prevention": [
            "Plant resistant corn varieties",
            "Early planting to avoid peak rust season",
            "Monitor regularly during warm, humid weather"
        ]
    },
    "Corn_(maize)___Northern_Leaf_Blight": {
        "disease_name": "Northern Leaf Blight",
        "crop_type": "Corn/Maize",
        "description": "Northern leaf blight (NLB) is caused by Exserohilum turcicum. It produces long, cigar-shaped gray-green lesions on leaves.",
        "treatment": [
            "Apply Propiconazole or Azoxystrobin fungicide",
            "Remove and destroy infected crop debris",
            "Spray at tasselling stage for best results"
        ],
        "pesticide": ["Propiconazole (Tilt)", "Azoxystrobin", "Mancozeb 75% WP"],
        "prevention": [
            "Plant NLB-resistant hybrids",
            "Practice 2-year crop rotation",
            "Manage crop residue through tillage"
        ]
    },
    "Grape___Black_rot": {
        "disease_name": "Grape Black Rot",
        "crop_type": "Grape",
        "description": "Black rot is caused by Guignardia bidwellii. Causes brown circular leaf lesions and shriveled black fruit mummies.",
        "treatment": [
            "Apply Mancozeb or Myclobutanil fungicide",
            "Remove mummified berries and infected canes",
            "Spray from bud break through fruit set"
        ],
        "pesticide": ["Mancozeb 75% WP", "Myclobutanil", "Captan 50% WP"],
        "prevention": [
            "Remove all mummies before spring",
            "Improve air circulation through pruning",
            "Apply preventive sprays early in season"
        ]
    },
    "Potato___Early_blight": {
        "disease_name": "Early Blight",
        "crop_type": "Potato",
        "description": "Early blight caused by Alternaria solani. Creates dark brown spots with concentric rings (target-like) on lower leaves.",
        "treatment": [
            "Apply Mancozeb or Chlorothalonil fungicide spray",
            "Remove and destroy infected plant debris",
            "Apply fungicide every 7-10 days during humid weather"
        ],
        "pesticide": ["Mancozeb 75% WP (Dithane M-45)", "Chlorothalonil (Kavach)", "Azoxystrobin (Amistar)"],
        "prevention": [
            "Use certified disease-free seed potatoes",
            "Practice 2-3 year crop rotation",
            "Maintain adequate plant spacing for air flow",
            "Apply balanced NPK fertilizer — avoid excess nitrogen"
        ]
    },
    "Potato___Late_blight": {
        "disease_name": "Late Blight",
        "crop_type": "Potato",
        "description": "Late blight is caused by Phytophthora infestans. Causes dark water-soaked lesions on leaves that spread rapidly in wet conditions.",
        "treatment": [
            "Apply Metalaxyl + Mancozeb (Ridomil Gold) immediately",
            "Spray Cymoxanil + Mancozeb on affected areas",
            "Destroy severely infected plants to stop spread"
        ],
        "pesticide": ["Metalaxyl + Mancozeb (Ridomil Gold)", "Cymoxanil + Mancozeb", "Copper Oxychloride"],
        "prevention": [
            "Use blight-resistant varieties (Kufri Jyoti, Kufri Giriraj)",
            "Avoid overhead irrigation during humid weather",
            "Rotate crops and avoid planting near previous potato fields",
            "Monitor weather forecasts — spray preventively before rains"
        ]
    },
    "Tomato___Bacterial_spot": {
        "disease_name": "Bacterial Spot",
        "crop_type": "Tomato",
        "description": "Bacterial spot caused by Xanthomonas species. Causes small dark raised spots on leaves, stems, and fruit.",
        "treatment": [
            "Apply Copper-based bactericide (Copper Oxychloride)",
            "Use Streptocycline (200 ppm) spray",
            "Remove and destroy infected plants"
        ],
        "pesticide": ["Copper Oxychloride (Blitox)", "Streptocycline", "Kasugamycin"],
        "prevention": [
            "Use disease-free certified seeds",
            "Avoid overhead watering",
            "Practice crop rotation",
            "Disinfect tools and seeds before planting"
        ]
    },
    "Tomato___Early_blight": {
        "disease_name": "Early Blight",
        "crop_type": "Tomato",
        "description": "Early blight caused by Alternaria solani. Creates dark brown spots with concentric rings (target spots) on lower leaves first.",
        "treatment": [
            "Apply Mancozeb 75% WP (Dithane M-45) at 2.5g/L",
            "Spray Chlorothalonil (Kavach) at 2g/L",
            "Remove infected lower leaves promptly"
        ],
        "pesticide": ["Mancozeb 75% WP (Dithane M-45)", "Chlorothalonil (Kavach)", "Azoxystrobin (Amistar)"],
        "prevention": [
            "Maintain adequate plant spacing (60x45 cm)",
            "Use mulch to prevent soil splash",
            "Stake plants for better air circulation",
            "Apply balanced fertilizer - avoid excess nitrogen"
        ]
    },
    "Tomato___Late_blight": {
        "disease_name": "Late Blight",
        "crop_type": "Tomato",
        "description": "Late blight caused by Phytophthora infestans. Causes large water-soaked lesions on leaves and fruit, especially in cool wet conditions.",
        "treatment": [
            "Apply Metalaxyl + Mancozeb (Ridomil Gold MZ) at 2.5g/L",
            "Spray Cymoxanil + Mancozeb early in outbreak",
            "Remove and destroy all infected plant parts"
        ],
        "pesticide": ["Metalaxyl + Mancozeb (Ridomil Gold)", "Cymoxanil + Mancozeb (Curzate)", "Dimethomorph"],
        "prevention": [
            "Use resistant varieties (e.g., Arka Rakshak)",
            "Avoid dense planting in humid areas",
            "Monitor closely during rainy/foggy weather",
            "Ensure good drainage in field"
        ]
    },
    "Tomato___Leaf_Mold": {
        "disease_name": "Leaf Mold",
        "crop_type": "Tomato",
        "description": "Leaf mold caused by Passalora fulva (Cladosporium fulvum). Causes pale green to yellow spots on upper leaf surface with olive-green mold below.",
        "treatment": [
            "Apply Mancozeb or Chlorothalonil fungicide",
            "Improve ventilation in greenhouse",
            "Remove severely affected leaves"
        ],
        "pesticide": ["Mancozeb 75% WP", "Chlorothalonil", "Copper fungicide"],
        "prevention": [
            "Maintain greenhouse humidity below 85%",
            "Use resistant tomato varieties",
            "Space plants adequately for airflow",
            "Avoid wetting foliage during irrigation"
        ]
    },
    "Tomato___Septoria_leaf_spot": {
        "disease_name": "Septoria Leaf Spot",
        "crop_type": "Tomato",
        "description": "Septoria leaf spot caused by Septoria lycopersici. Creates small round spots with dark borders and gray centers on lower leaves.",
        "treatment": [
            "Apply Mancozeb or Chlorothalonil fungicide",
            "Remove and destroy infected lower leaves",
            "Spray every 7-10 days during wet weather"
        ],
        "pesticide": ["Mancozeb 75% WP", "Chlorothalonil (Kavach)", "Copper Oxychloride"],
        "prevention": [
            "Use disease-free transplants",
            "Mulch around plants to reduce splash",
            "Practice 3-year crop rotation",
            "Avoid overhead irrigation"
        ]
    },
    "Tomato___Spider_mites Two-spotted_spider_mite": {
        "disease_name": "Spider Mites (Two-spotted)",
        "crop_type": "Tomato",
        "description": "Two-spotted spider mites (Tetranychus urticae) cause stippling and bronzing of leaves. Fine webs visible under leaves in severe infestation.",
        "treatment": [
            "Spray Dicofol or Abamectin (Vertimec) at recommended dose",
            "Use neem oil (Azadirachtin) 3ml/L as organic option",
            "Wash plants with strong water jet to dislodge mites"
        ],
        "pesticide": ["Dicofol 18.5% EC", "Abamectin (Vertimec)", "Spiromesifen (Oberon)"],
        "prevention": [
            "Monitor regularly with hand lens under leaves",
            "Maintain adequate moisture — mites thrive in dry conditions",
            "Introduce predatory mites (Phytoseiulus persimilis)",
            "Avoid excessive nitrogen which promotes mite growth"
        ]
    },
    "Tomato___Target_Spot": {
        "disease_name": "Target Spot",
        "crop_type": "Tomato",
        "description": "Target spot caused by Corynespora cassiicola. Creates large circular spots with concentric rings on leaves, stems, and fruit.",
        "treatment": [
            "Apply Chlorothalonil or Mancozeb fungicide",
            "Remove infected plant parts",
            "Spray Azoxystrobin for severe infections"
        ],
        "pesticide": ["Chlorothalonil", "Mancozeb 75% WP", "Azoxystrobin"],
        "prevention": [
            "Maintain proper plant spacing",
            "Avoid wetting leaves during irrigation",
            "Remove crop residue after harvest",
            "Practice crop rotation"
        ]
    },
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {
        "disease_name": "Tomato Yellow Leaf Curl Virus (TYLCV)",
        "crop_type": "Tomato",
        "description": "TYLCV is transmitted by whiteflies (Bemisia tabaci). Causes severe leaf curling, yellowing, and stunted growth.",
        "treatment": [
            "Control whitefly vector with Imidacloprid (Confidor) 0.5ml/L",
            "Remove and destroy infected plants immediately",
            "Use yellow sticky traps to monitor whitefly population"
        ],
        "pesticide": ["Imidacloprid (Confidor)", "Thiamethoxam (Actara)", "Spiromesifen (Oberon)"],
        "prevention": [
            "Use TYLCV-resistant varieties (Arka Ananya, TH-1)",
            "Install 40-mesh nylon nets in nurseries",
            "Avoid planting near old infected fields",
            "Maintain weed-free surroundings"
        ]
    },
    "Tomato___Tomato_mosaic_virus": {
        "disease_name": "Tomato Mosaic Virus (ToMV)",
        "crop_type": "Tomato",
        "description": "ToMV causes mosaic patterns of light and dark green on leaves, leaf distortion, and reduced yields.",
        "treatment": [
            "No chemical cure available — remove infected plants",
            "Disinfect all tools with 10% trisodium phosphate",
            "Wash hands with soap before handling plants"
        ],
        "pesticide": ["No chemical treatment effective", "Neem oil for vector control"],
        "prevention": [
            "Use resistant tomato varieties",
            "Treat seeds with trisodium phosphate before planting",
            "Avoid tobacco use near plants (TMV cross-infection)",
            "Practice strict hygiene in nursery and field"
        ]
    },
    "Squash___Powdery_mildew": {
        "disease_name": "Powdery Mildew",
        "crop_type": "Squash",
        "description": "Powdery mildew caused by Podosphaera xanthii. Creates white powdery coating on leaf surfaces, causing yellowing and decline.",
        "treatment": [
            "Spray Karathane (Dinocap) at 1ml/L",
            "Apply Sulphur-based fungicide (Wettable Sulphur) at 3g/L",
            "Use Trifloxystrobin + Tebuconazole for severe cases"
        ],
        "pesticide": ["Dinocap (Karathane)", "Wettable Sulphur", "Trifloxystrobin"],
        "prevention": [
            "Plant resistant varieties",
            "Maintain adequate spacing for air circulation",
            "Avoid overhead sprinkler irrigation",
            "Remove and destroy infected leaves"
        ]
    },
    "Cherry_(including_sour)___Powdery_mildew": {
        "disease_name": "Powdery Mildew",
        "crop_type": "Cherry",
        "description": "Powdery mildew caused by Podosphaera clandestina. Creates white fungal growth on leaves and new shoots.",
        "treatment": [
            "Apply Myclobutanil or sulfur-based fungicide",
            "Prune infected shoots and improve air circulation",
            "Spray at first sign of white powdery patches"
        ],
        "pesticide": ["Myclobutanil", "Wettable Sulphur", "Triforine"],
        "prevention": [
            "Select resistant cherry varieties",
            "Maintain open canopy through pruning",
            "Avoid excessive nitrogen fertilization"
        ]
    },
    "Grape___Esca_(Black_Measles)": {
        "disease_name": "Esca (Black Measles)",
        "crop_type": "Grape",
        "description": "Esca/Black Measles is a complex wood disease causing tiger-stripe patterns on leaves and dark spots on berries.",
        "treatment": [
            "No complete cure — manage by removing dead wood",
            "Protect pruning wounds with paste fungicide",
            "Apply Trichoderma-based biocontrol on wounds"
        ],
        "pesticide": ["Trichoderma viride", "Copper fungicide for wounds"],
        "prevention": [
            "Make clean pruning cuts and protect wounds",
            "Remove and destroy dead vine wood",
            "Avoid large pruning wounds",
            "Use certified disease-free planting material"
        ]
    },
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": {
        "disease_name": "Leaf Blight (Isariopsis)",
        "crop_type": "Grape",
        "description": "Isariopsis leaf spot creates angular brown-black spots on grape leaves, causing defoliation in severe cases.",
        "treatment": [
            "Apply Mancozeb 75% WP at 2.5g/L",
            "Spray Copper Oxychloride at 3g/L",
            "Remove infected leaves to reduce spread"
        ],
        "pesticide": ["Mancozeb 75% WP", "Copper Oxychloride", "Carbendazim"],
        "prevention": [
            "Maintain canopy management for ventilation",
            "Practice clean cultivation",
            "Remove fallen debris from vineyard"
        ]
    },
    "Orange___Haunglongbing_(Citrus_greening)": {
        "disease_name": "Huanglongbing (Citrus Greening)",
        "crop_type": "Orange/Citrus",
        "description": "HLB is caused by bacteria Candidatus Liberibacter, spread by Asian citrus psyllid. Causes yellowing, misshapen fruit, and tree decline.",
        "treatment": [
            "No cure — remove and destroy infected trees",
            "Control Asian Citrus Psyllid with Imidacloprid",
            "Apply nutrition sprays to prolong tree life"
        ],
        "pesticide": ["Imidacloprid (Confidor)", "Dimethoate", "Thiamethoxam (Actara)"],
        "prevention": [
            "Use certified disease-free nursery plants",
            "Monitor and control psyllid populations",
            "Maintain tree nutrition with micronutrient sprays",
            "Survey and remove symptomatic trees promptly"
        ]
    },
    "Peach___Bacterial_spot": {
        "disease_name": "Bacterial Spot",
        "crop_type": "Peach",
        "description": "Bacterial spot caused by Xanthomonas arboricola pv. pruni. Causes angular, water-soaked spots on leaves and cracked spots on fruit.",
        "treatment": [
            "Apply Copper-based bactericide during early season",
            "Use Oxytetracycline sprays for active infections",
            "Remove severely infected branches"
        ],
        "pesticide": ["Copper Oxychloride", "Oxytetracycline", "Streptocycline"],
        "prevention": [
            "Plant resistant peach varieties",
            "Avoid overhead irrigation",
            "Maintain proper plant nutrition",
            "Prune for air circulation"
        ]
    },
    "Pepper,_bell___Bacterial_spot": {
        "disease_name": "Bacterial Spot",
        "crop_type": "Bell Pepper",
        "description": "Bacterial spot caused by Xanthomonas campestris. Creates small raised dark spots on leaves and fruit, leading to defoliation.",
        "treatment": [
            "Spray Copper Oxychloride (Blitox) at 3g/L",
            "Apply Streptocycline at 200 ppm",
            "Remove and destroy infected plant debris"
        ],
        "pesticide": ["Copper Oxychloride (Blitox)", "Streptocycline", "Kasugamycin"],
        "prevention": [
            "Use treated, disease-free seeds",
            "Rotate crops for 2-3 years",
            "Avoid field work when plants are wet",
            "Space plants for good air circulation"
        ]
    },
    "Strawberry___Leaf_scorch": {
        "disease_name": "Leaf Scorch",
        "crop_type": "Strawberry",
        "description": "Leaf scorch caused by Diplocarpon earlianum. Creates small irregular dark purple spots on leaves that coalesce.",
        "treatment": [
            "Apply Captan or Thiophanate-methyl fungicide",
            "Remove and destroy infected leaves",
            "Improve air circulation between plants"
        ],
        "pesticide": ["Captan 50% WP", "Thiophanate-methyl", "Mancozeb 75% WP"],
        "prevention": [
            "Plant resistant strawberry varieties",
            "Renovate beds after harvest",
            "Remove old leaves in spring",
            "Use drip irrigation instead of overhead"
        ]
    },
}

# Treatment info for healthy plants
HEALTHY_INFO = {
    "disease_name": "Healthy Plant",
    "description": "No disease detected. The plant appears healthy with normal leaf coloration and texture.",
    "treatment": ["No treatment needed — plant is healthy!"],
    "pesticide": [],
    "prevention": [
        "Continue regular watering and fertilization schedule",
        "Monitor regularly for early signs of disease",
        "Maintain proper plant spacing for air circulation",
        "Practice crop rotation to prevent soil-borne diseases"
    ]
}

IMG_SIZE = 224
EPOCHS = 50
BATCH_SIZE = 64


def train():
    """Full YOLOv8 classification training pipeline"""
    print("\n" + "=" * 60)
    print("  AgriSmart - Plant Disease Detection Training (YOLOv8)")
    print("=" * 60)

    # Save class info
    with open(CLASSES_PATH, "w") as f:
        json.dump({
            "classes": DISEASE_CLASSES,
            "num_classes": len(DISEASE_CLASSES),
            "img_size": IMG_SIZE,
            "model_type": "YOLOv8-cls",
            "architecture": "Ultralytics YOLOv8 Classification",
            "training_config": {
                "epochs": EPOCHS,
                "batch_size": BATCH_SIZE,
                "img_size": IMG_SIZE,
                "optimizer": "AdamW",
                "pretrained": True,
                "augmentation": {
                    "hsv_h": 0.015,
                    "hsv_s": 0.7,
                    "hsv_v": 0.4,
                    "degrees": 15.0,
                    "translate": 0.1,
                    "scale": 0.5,
                    "fliplr": 0.5,
                    "mosaic": 0.0
                }
            }
        }, f, indent=2)

    print(f"\n[CLASSES] {len(DISEASE_CLASSES)} Disease Classes:")
    for i, cls in enumerate(DISEASE_CLASSES):
        print(f"   {i:2d}: {cls}")

    print(f"\n[SAVE] Class metadata saved to {CLASSES_PATH}")

    # ─── YOLOv8 Training ───
    try:
        from ultralytics import YOLO

        # Check for dataset directory
        dataset_dir = os.path.join(MODEL_DIR, "dataset")
        if not os.path.exists(dataset_dir):
            print(f"\n[ERROR] Dataset directory not found: {dataset_dir}")
            print_instructions()
            return

        train_dir = os.path.join(dataset_dir, "train")
        if not os.path.exists(train_dir):
            print(f"\n[ERROR] Training data not found: {train_dir}")
            print_instructions()
            return

        # Load YOLOv8 classification model (pretrained on ImageNet)
        print("\n[MODEL] Loading YOLOv8-cls base model (pretrained)...")
        model = YOLO("yolov8n-cls.pt")  # nano variant for faster training; use yolov8m-cls for higher accuracy

        # Train
        print(f"\n[TRAIN] Starting training for {EPOCHS} epochs...")
        results = model.train(
            data=dataset_dir,
            epochs=EPOCHS,
            imgsz=IMG_SIZE,
            batch=BATCH_SIZE,
            patience=10,
            save=True,
            project=MODEL_DIR,
            name="training_run",
            exist_ok=True,
            pretrained=True,
            optimizer="AdamW",
            lr0=0.001,
            lrf=0.01,
            weight_decay=0.0005,
            warmup_epochs=3,
            hsv_h=0.015,
            hsv_s=0.7,
            hsv_v=0.4,
            degrees=15.0,
            translate=0.1,
            scale=0.5,
            fliplr=0.5,
            mosaic=0.0,
            verbose=True,
        )

        # Copy best model
        best_model_path = os.path.join(MODEL_DIR, "training_run", "weights", "best.pt")
        if os.path.exists(best_model_path):
            import shutil
            shutil.copy2(best_model_path, MODEL_PATH)
            print(f"\n[SAVE] Best model saved to {MODEL_PATH}")

        # Evaluate
        print("\n[EVAL] Evaluating on validation set...")
        metrics = model.val()
        print(f"   Top-1 Accuracy: {metrics.top1:.4f}")
        print(f"   Top-5 Accuracy: {metrics.top5:.4f}")

        print("\n[DONE] Training complete!")

    except ImportError:
        print("\n[WARN] Ultralytics not installed.")
        print_instructions()

    except Exception as e:
        print(f"\n[ERROR] Training failed: {e}")
        print_instructions()


def print_instructions():
    """Print setup instructions"""
    print("\n" + "=" * 60)
    print("  Training Instructions")
    print("=" * 60)
    print("""
    To train the YOLOv8 disease detection model:

    1. Install dependencies:
       pip install ultralytics torch torchvision

    2. Download PlantVillage dataset:
       https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset

    3. Organize dataset structure:
       ml/disease_model/dataset/
       ├── train/
       │   ├── Apple___Apple_scab/
       │   │   ├── img001.jpg
       │   │   └── ...
       │   ├── Apple___Black_rot/
       │   └── ... (all 38 classes)
       └── val/
           ├── Apple___Apple_scab/
           └── ...

    4. Run: python train_disease_model.py

    The trained model will be saved as 'disease_model_yolo.pt'
    """)


def predict_single(image_path: str):
    """Test prediction on a single image"""
    try:
        from ultralytics import YOLO

        if not os.path.exists(MODEL_PATH):
            print(f"[ERROR] Model not found at {MODEL_PATH}")
            return None

        model = YOLO(MODEL_PATH)
        results = model(image_path, imgsz=IMG_SIZE)

        if results and len(results) > 0:
            result = results[0]
            probs = result.probs
            top5_indices = probs.top5
            top5_confs = probs.top5conf.tolist()

            predictions = []
            for idx, conf in zip(top5_indices, top5_confs):
                class_name = DISEASE_CLASSES[idx] if idx < len(DISEASE_CLASSES) else result.names[idx]
                predictions.append({
                    "class": class_name,
                    "confidence": round(conf * 100, 2)
                })
            return predictions

    except Exception as e:
        print(f"[ERROR] Prediction failed: {e}")
    return None


if __name__ == "__main__":
    train()
