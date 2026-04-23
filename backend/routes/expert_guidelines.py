"""
Expert Guidelines API Route
=============================
Provides professionally curated expert agricultural guidelines:
  - Disease management protocols
  - Integrated Pest Management (IPM)
  - Soil health & fertility management
  - Weather-based crop advisory
  - Post-harvest handling best practices
  - Organic farming guidelines
  - Irrigation water management
  - Seed selection & crop variety advice

All data is sourced from ICAR, FAO, and state agricultural university publications.
No external API calls — purely knowledge-base driven.
"""
from fastapi import APIRouter, Depends
from middleware.auth import get_current_user

router = APIRouter()


EXPERT_GUIDELINES_DB = {
    "disease_management": {
        "title": "Plant Disease Management Protocols",
        "icon": "🦠",
        "category": "Disease Control",
        "color": "#dc2626",
        "bg": "#fef2f2",
        "border": "#fecaca",
        "priority": "critical",
        "introduction": (
            "Plant diseases cause 20–40% of global crop losses annually. "
            "Early identification and integrated management strategies are essential "
            "for minimizing economic damage and preventing disease spread."
        ),
        "guidelines": [
            {
                "title": "Early Warning Signs & Scouting",
                "steps": [
                    "Conduct field scouting at least twice weekly during the growing season — inspect the lower canopy, leaf undersides, and stem bases.",
                    "Look for colour changes: yellowing (chlorosis), browning (necrosis), water-soaked lesions, or purpling — these indicate different pathogen types.",
                    "Photograph symptoms with a ruler for scale and record GPS coordinates for spatial mapping of disease hotspots.",
                    "Compare symptomatic plants with healthy ones in adjacent rows to establish baseline health benchmarks.",
                    "Use the 10-in-10 rule: assess 10 plants per sub-plot across 10 sub-plots for statistically reliable disease incidence estimation."
                ]
            },
            {
                "title": "Fungal Disease Control Protocol",
                "steps": [
                    "Apply preventive fungicides before conditions favour disease — when relative humidity exceeds 80% for more than 6 consecutive hours.",
                    "Rotate fungicides between different chemical groups (FRAC codes) every 2 sprays to prevent resistance development.",
                    "Use Mancozeb 75% WP (Dithane M-45) @ 2.5 g/L water as a broad-spectrum preventive spray for early blight, late blight, and anthracnose.",
                    "For powdery mildew, apply Sulphur 80% WP @ 3 g/L or Hexaconazole 5% SC (Contaf Plus) @ 2 ml/L.",
                    "Metalaxyl-M + Mancozeb (Ridomil Gold) @ 2.5 g/L is highly effective against Phytophthora and downy mildew — apply before first symptoms appear."
                ]
            },
            {
                "title": "Bacterial Disease Management",
                "steps": [
                    "Bacterial diseases have no cure once established — prevention through copper-based bactericides is paramount.",
                    "Apply Copper Oxychloride 50% WP (Blitox 50) @ 3 g/L water as a preventive spray after rain events.",
                    "Maintain field hygiene: remove and destroy infected plant material — do NOT compost diseased tissue.",
                    "Ensure adequate potassium nutrition (K > 60 kg/ha) to strengthen cell walls and improve bacterial resistance.",
                    "Avoid working in fields when plants are wet — bacterial pathogens spread via water splash, tools, and human contact."
                ]
            },
            {
                "title": "Viral Disease Control",
                "steps": [
                    "Viruses are primarily vector-transmitted (aphids, whiteflies, thrips) — control the insect vector to prevent spread.",
                    "Apply Imidacloprid 70% WG (Confidor) @ 0.5 g/L or Thiamethoxam 25% WG (Actara) @ 0.4 g/L for systemic aphid/whitefly control.",
                    "Use reflective silver mulch to disorient flying vectors and significantly reduce virus incidence in vegetables.",
                    "Rogue out (remove) virus-infected plants immediately — infected plants act as virus reservoirs that re-infect the crop.",
                    "Source certified, virus-indexed planting material from government-approved nurseries for high-value crops."
                ]
            }
        ],
        "quick_tips": [
            "Always add a sticker/spreader (e.g., Sandovit, Triton) to fungicide sprays for better leaf adhesion",
            "Spray in the early morning or late evening to prevent phytotoxicity in high temperatures",
            "Maintain accurate spray records with date, product, dose, and crop stage for regulatory compliance",
            "Never spray pesticides without proper PPE — gloves, mask, goggles, and protective clothing are mandatory"
        ]
    },

    "ipm": {
        "title": "Integrated Pest Management (IPM)",
        "icon": "🐛",
        "category": "Pest Control",
        "color": "#d97706",
        "bg": "#fffbeb",
        "border": "#fde68a",
        "priority": "high",
        "introduction": (
            "Integrated Pest Management (IPM) is a science-based decision-making process that combines "
            "biological, cultural, physical, and chemical tools to minimize economic, health, and "
            "environmental risks. It is mandated under India's National IPM Policy."
        ),
        "guidelines": [
            {
                "title": "Economic Threshold Levels (ETL)",
                "steps": [
                    "Apply pesticides ONLY when pest populations exceed the Economic Threshold Level (ETL) — the pest density at which control measures become economically justified.",
                    "Rice Yellow Stem Borer ETL: 2 egg masses per m² OR 5% dead hearts at vegetative stage, 1% white ear at panicle stage.",
                    "Whitefly ETL in cotton: 4–6 adults per leaf on 25% of plants sampled.",
                    "Aphid ETL in wheat: 10–15 aphids per tiller OR 5–10% tillers infested.",
                    "Record pest counts weekly using standard sweep net (30 sweeps per sample) or sticky trap counts to determine population trends."
                ]
            },
            {
                "title": "Biological Control Agents",
                "steps": [
                    "Release Trichogramma spp. egg parasitoids @ 1 lakh cards/ha to control Lepidopteran pests (borer, armyworm, pod borer).",
                    "Use Nuclear Polyhedrosis Virus (NPV) @ 250 LE/ha for Helicoverpa armigera control in cotton, chickpea, and tomato.",
                    "Apply Beauveria bassiana @ 5 g/L water for soil-dwelling grubs, thrips, and aphid control.",
                    "Maintain 5–10% non-crop flowering borders to support natural enemies (parasitoids and predators).",
                    "Conserve Chrysoperla carnea (lacewing), Coccinellid beetles (ladybird), and Syrphid fly larvae — powerful natural aphid predators."
                ]
            },
            {
                "title": "Cultural & Mechanical Control",
                "steps": [
                    "Deep summer ploughing (June–July) to 30 cm depth exposes soil-dwelling pupae and eggs to desiccation and bird predation.",
                    "Install pheromone traps @ 5/ha with species-specific lures for Spodoptera, Helicoverpa, and Bactrocera monitoring.",
                    "Use yellow sticky traps @ 10/ha to mass-trap winged aphids, whiteflies, and leaf miners.",
                    "Practice intercropping with repellent crops — marigold borders repel nematodes; basil deters aphids and whiteflies.",
                    "Timely harvest prevents crop exposure to post-maturity pest build-up and secondary infections."
                ]
            },
            {
                "title": "Judicious Chemical Control",
                "steps": [
                    "Select pesticides with narrow spectrum, high efficacy, and low mammalian toxicity — preferably WHO Class III or IV.",
                    "Rotate chemical groups: Organophosphates → Pyrethroids → Neonicotinoids → Diamides to prevent resistance.",
                    "Apply Emamectin Benzoate 5% SG (Proclaim) @ 0.4 g/L for armyworm and borer complex — highly effective with low residue.",
                    "For sucking pests, Spiromesifen (Oberon) @ 1 ml/L controls whitefly nymphs without disrupting natural enemies.",
                    "Observe pre-harvest intervals (PHI) strictly — Chlorpyrifos 20% EC: 15 days PHI; Lambda-cyhalothrin: 7 days PHI before harvest."
                ]
            }
        ],
        "quick_tips": [
            "Use pest-resistant or tolerant varieties as the first line of defence — genetic resistance is the most sustainable management strategy",
            "Join the state agriculture department's IPM scouting network for real-time pest alerts and forecasting",
            "Soil solarization (transparent polythene mulch, 4–6 weeks in summer) effectively controls soil-borne pathogens and nematodes",
            "Light traps (8W LED) catch nocturnal moth pests — inspect catches daily and destroy"
        ]
    },

    "soil_health": {
        "title": "Soil Health & Fertility Management",
        "icon": "🌱",
        "category": "Soil Management",
        "color": "#16a34a",
        "bg": "#f0fdf4",
        "border": "#bbf7d0",
        "priority": "high",
        "introduction": (
            "Healthy soil is the foundation of sustainable agriculture. It is a living ecosystem "
            "harbouring billions of microorganisms per gram, driving nutrient cycling, carbon sequestration, "
            "and water regulation. Maintaining soil organic carbon above 0.75% is the single most important "
            "fertility management objective."
        ),
        "guidelines": [
            {
                "title": "Soil Testing & Nutrient Management",
                "steps": [
                    "Conduct comprehensive soil testing every 2–3 years for macro (N, P, K, S) and micro (Zn, B, Fe, Mn) nutrients, pH, and EC.",
                    "Collect soil samples from 0–15 cm depth using a V-shaped stainless steel auger — take 10–15 sub-samples per field and composite.",
                    "Submit samples to the nearest Soil Testing Laboratory (STL) or ICAR-certified private lab for analysis within 48 hours.",
                    "Use the Soil Health Card (SHC) scheme recommendations as the baseline for fertilizer application — government-subsidized testing.",
                    "Apply fertilizers in split doses: basal at planting (40% N, full P, K), first top-dress at 30–35 DAS (30% N), second top-dress at 60–65 DAS (30% N)."
                ]
            },
            {
                "title": "Organic Matter Enhancement",
                "steps": [
                    "Incorporate Farm Yard Manure (FYM) @ 10–15 tonnes/ha every alternate season to maintain soil organic carbon.",
                    "Apply compost (C:N ratio 15:20) @ 3–5 t/ha which provides all 16 essential plant nutrients and beneficial microorganisms.",
                    "Use crop residue incorporation — chop rice straw to < 5 cm length and incorporate with paddy straw decomposer (Trichoderma viride @ 4 kg + FYM 100 kg/ha).",
                    "Grow green manure crops (Dhaincha/Sesbania, Sunhemp) during fallow periods and incorporate at 50% flowering stage.",
                    "Vermicompost @ 2–4 t/ha improves soil porosity, water retention, and provides slow-release balanced nutrition."
                ]
            },
            {
                "title": "pH Correction & Salinity Management",
                "steps": [
                    "Acidic soils (pH < 6.0): Apply agricultural lime (CaCO₃) @ 2–4 t/ha 3–4 weeks before planting and incorporate thoroughly.",
                    "Alkaline soils (pH > 8.5): Apply gypsum (CaSO₄) @ 2–5 t/ha or elemental sulfur @ 0.5–1 t/ha; follow with heavy irrigation to leach salts.",
                    "Saline soils (EC > 4 dS/m): Grow salt-tolerant varieties; apply gypsum 5 t/ha; provide drainage channels; flood and leach before planting.",
                    "Sodic soils (ESP > 15): Apply gypsum @ 50% of Gypsum Requirement (GR) determined by soil test; incorporate organic matter.",
                    "Monitor soil pH annually — target pH 6.5–7.0 as the optimal range for nutrient availability across most crops."
                ]
            },
            {
                "title": "Biofertilizer Application Protocol",
                "steps": [
                    "Apply Rhizobium inoculant to pulses and legumes by seed treatment — mix 200 g inoculant + 200 ml water + 50 g jaggery per 10 kg seeds.",
                    "Use Azospirillum @ 500 g/ha for cereals (rice, maize, sorghum) to fix atmospheric N and produce plant growth hormones.",
                    "Apply Phosphate Solubilizing Bacteria (PSB) @ 500 g/ha as seed or soil treatment to convert fixed insoluble phosphate to plant-available form.",
                    "Zinc Solubilizing Bacteria (ZSB) @ 500 g/ha reduces zinc fertilizer requirement by 25–30% in zinc-deficient soils.",
                    "Biofertilizers must be stored below 25°C and used within 6 months of manufacture date — check viability before use."
                ]
            }
        ],
        "quick_tips": [
            "Never burn crop residue — it destroys soil organic matter and beneficial microbial communities, releasing greenhouse gases",
            "Minimum tillage or zero-tillage conserves soil structure, reduces erosion, and saves diesel costs by 30–40%",
            "Soil temperature above 50°C kills beneficial soil micro-organisms — use shade nets or organic mulch in peak summer",
            "Free Soil Health Card testing is available at every Block Agriculture Office under the GOI Soil Health Card scheme"
        ]
    },

    "water_management": {
        "title": "Irrigation & Water Management",
        "icon": "💧",
        "category": "Water Management",
        "color": "#0284c7",
        "bg": "#f0f9ff",
        "border": "#bae6fd",
        "priority": "high",
        "introduction": (
            "Agriculture consumes 70–80% of India's freshwater resources. Efficient water management "
            "reduces input costs by 30–50%, increases Water Use Efficiency (WUE), prevents waterlogging "
            "and salinity, and is critical for sustainable farming under increasing water scarcity."
        ),
        "guidelines": [
            {
                "title": "Critical Irrigation Stages",
                "steps": [
                    "Rice: Maintain 5 cm standing water at tillering; drain at panicle initiation; flood at flowering — do NOT stress during flag-leaf stage.",
                    "Wheat: Critical stages — Crown Root Initiation (CRI, 21 DAS), Tillering (40 DAS), Jointing (60 DAS), Grain Filling (80 DAS) — total 4–6 irrigations.",
                    "Cotton: First irrigation at 25–30 DAS; critical stages — boll initiation and boll development (avoid water stress during this 45–90 DAS window).",
                    "Maize: Never stress at silking/tasseling stage (55–65 DAS) — a 3-day drought here can cause 30–50% yield loss.",
                    "Pulses (chickpea, lentil): One protective irrigation at pre-flowering (40–45 DAS) and one at pod filling (70 DAS) significantly boosts yield."
                ]
            },
            {
                "title": "Drip Irrigation Setup & Management",
                "steps": [
                    "Design drip system based on crop geometry, soil type, and emitter flow rate — consult IDWM (precision irrigation consultant) for system layout.",
                    "Use 2-LPH pressure-compensating drippers for vegetables; 4-LPH for orchards; 1.6 LPH for polyhouse crops.",
                    "Flush lateral lines weekly and filter system monthly — install 120-mesh disc filters at the main header.",
                    "Fertigation through drip (injecting soluble fertilizers) improves nutrient use efficiency by 30–40% vs. broadcast application.",
                    "Avail subsidy under PM Krishi Sinchayee Yojana (PMKSY) — up to 55% for small/marginal farmers, 45% for others."
                ]
            },
            {
                "title": "Rainwater Harvesting & Conservation",
                "steps": [
                    "Construct farm ponds of 20m × 20m × 3m depth — capacity 1,200 kL sufficient for 1 ha irrigation during 4–5 dry weeks.",
                    "Apply mulching with rice straw, black polythene, or coir — reduces evaporation by 40–60% and controls weeds simultaneously.",
                    "Create contour bunds, field bunds, and check dams in hilly terrain to arrest runoff and enhance groundwater recharge.",
                    "Install weather station or access IMD agro-meteorological data to schedule irrigation based on actual Evapotranspiration (ET).",
                    "Use IrriSat or ICAR Crop Water Requirement calculator apps for science-based irrigation scheduling."
                ]
            }
        ],
        "quick_tips": [
            "Irrigate in early morning or evening — midday irrigation loses 20–30% water to evaporation",
            "Check soil moisture with tensiometer (irrigate at 40–60 centi-bars) or feel method (soil crumbles when squeezed = time to irrigate)",
            "Sprinkler irrigation saves 30–40% water vs. flood; drip saves 50–70% vs. flood with higher yield",
            "Subsidy available for micro-irrigation under PMKSY — apply through the state Horticulture Department"
        ]
    },

    "post_harvest": {
        "title": "Post-Harvest Handling & Storage",
        "icon": "🏪",
        "category": "Post-Harvest",
        "color": "#7c3aed",
        "bg": "#f5f3ff",
        "border": "#ddd6fe",
        "priority": "medium",
        "introduction": (
            "Post-harvest losses in India account for 15–30% of food production annually, "
            "valued at over ₹90,000 crore. Proper handling, storage, and value addition "
            "technologies can reduce these losses by 70–80% and dramatically improve farmer income."
        ),
        "guidelines": [
            {
                "title": "Harvesting at Optimal Maturity",
                "steps": [
                    "Rice: Harvest at 20–22% grain moisture content (25 days after 50% flowering) — delayed harvest causes shattering losses.",
                    "Wheat: Harvest when grain moisture falls to 14–16% (hard dough stage) — avoid harvesting during morning dew.",
                    "Vegetables (tomato, potato): Harvest at physiological maturity — skin set test for potato (skin resists thumbnail scratch).",
                    "Fruits (mango): Harvest when specific gravity > 1.01 or soluble solids content (Brix) > 12° for Alphonso varieties.",
                    "Use sharp, clean harvesting tools — dull blades cause mechanical injury that promotes post-harvest decay."
                ]
            },
            {
                "title": "Grain Storage Best Practices",
                "steps": [
                    "Dry grains to recommended safe moisture levels before storage: Wheat 12%, Rice 14%, Maize 12%, Pulses 10%.",
                    "Fumigate storage structures with Aluminium Phosphide (Celphos) tablets @ 3 tablets/tonne under gas-tight conditions — certified applicator only.",
                    "Use hermetic storage bags (Grain Pro / PICS bags) or metal silos for long-term storage — achieve 2–5 year storage without chemical fumigation.",
                    "Control temperature below 15°C and relative humidity below 65% in scientific warehouses to prevent mould and insect infestation.",
                    "Register with the Warehouse Receipt System (WRS) under WDRA — enables bank loans against stored grain at better rates."
                ]
            },
            {
                "title": "Cold Chain & Perishable Management",
                "steps": [
                    "Pre-cool vegetables within 4 hours of harvest to remove field heat — reduces respiration rate and extends shelf life 3–5 times.",
                    "Store potatoes at 2–4°C with 90–95% RH; onions at 0–2°C with 65–70% RH; tomatoes at 8–10°C (do NOT go below 8°C — chilling injury).",
                    "Use hydro-cooling for leafy vegetables (immerse in ice-cold water 30 minutes) before packing.",
                    "Pack in ventilated crates — never use plastic bags for produce still respiring as CO₂ accumulation causes premature spoilage.",
                    "Apply wax coating (food-grade carnauba wax) on citrus, apple, and mango for longer shelf life and attractive appearance."
                ]
            }
        ],
        "quick_tips": [
            "Contact the nearest APMC/Agricultural Produce Market Committee for market linkage, grading, and warehousing services",
            "Avail subsidy for cold storage unit construction under NHM (National Horticulture Mission) — up to 35% capital subsidy",
            "Join Farmer Producer Organizations (FPOs) for collective marketing, better price discovery, and bulk input procurement",
            "NAFED and e-NAM (National Agriculture Market) provide platform for transparent price discovery across 1,000+ markets"
        ]
    },

    "organic_farming": {
        "title": "Organic Farming & Natural Methods",
        "icon": "🌿",
        "category": "Organic Farming",
        "color": "#059669",
        "bg": "#ecfdf5",
        "border": "#a7f3d0",
        "priority": "medium",
        "introduction": (
            "Organic farming eliminates synthetic chemicals, relies on natural inputs, and produces "
            "premium quality produce commanding 20–40% higher market prices. India has the world's "
            "largest number of organic farmers (3.5 million) and is expanding fast under the "
            "Paramparagat Krishi Vikas Yojana (PKVY) scheme."
        ),
        "guidelines": [
            {
                "title": "Organic Certification Process",
                "steps": [
                    "Register with a NPOP-accredited certification body (Control Union, OneCert, LACON) — obtain application form and fill field history declaration.",
                    "Mandatory 2–3 year conversion period before certification — maintain detailed records of all inputs used throughout.",
                    "Maintain a farm diary with date, input used, quantity, and crop operations — this is audited annually by the certification inspector.",
                    "Group certification available for FPOs (minimum 10 farmers) — reduces per-farmer certification cost from ₹15,000 to ₹2,000–3,000.",
                    "After certification, use the India Organic logo on produce — mandatory for premium pricing in organized retail and export."
                ]
            },
            {
                "title": "Natural Pest & Disease Management",
                "steps": [
                    "Neem-based products: Apply Neem Oil 3% (5 ml/L + emulsifier) or NSKE (Neem Seed Kernel Extract) @ 40 g/L for sucking pests and early fungal control.",
                    "Panchagavya @ 3% (cow dung + urine + milk + curd + ghee ferment) — spray every 14 days as plant immunity booster.",
                    "Jeevamrut (fermented cow dung solution) @ 10% soil drench improves soil biota and suppresses soil-borne pathogens.",
                    "Bordeaux mixture (1:1:100 ratio copper sulphate + lime + water) is an approved organic copper fungicide for foliar diseases.",
                    "Fermented leaf extracts (callipash, datura, neem) function as organic insect repellents — prepare 30-day ferments."
                ]
            },
            {
                "title": "Organic Input Preparation",
                "steps": [
                    "Vermi-compost: Layer cow dung, crop residue, kitchen waste alternately in 15 cm layers; add Eisenia fetida earthworms @ 1 kg/m²; harvest in 60–90 days.",
                    "FYM preparation: Heap 1 tonne cattle dung + 50 kg neem cake + 10 kg rock phosphate; turn monthly; ready in 120 days with 68% nutrient retention.",
                    "Compost tea: Steep 500 g mature compost in 10L water for 24–72 hours with aeration; filter and use as foliar spray — rich in beneficial microbes.",
                    "Dashparni Arka: Ferment 10 plant species leaves (neem, datura, papaya, vitex, etc.) with cow dung and urine for 30 days — potent biopesticide.",
                    "Biodynamic preparations (BD 500, BD 501) enhance soil life and plant growth when applied per biodynamic calendar."
                ]
            }
        ],
        "quick_tips": [
            "PKVY government scheme provides ₹50,000/ha for 3 years to transition to organic farming — apply through state agriculture department",
            "Organic Basmati rice fetches ₹80–120/kg vs ₹30–40/kg conventional — organic premium is highest for rice, spices, and pulses",
            "Zero Budget Natural Farming (ZBNF) eliminates external input costs — learn from Andhra Pradesh government ZBNF programme",
            "PGS-India (Participatory Guarantee System) certification is free and community-verified — ideal for domestic organic markets"
        ]
    },

    "seed_selection": {
        "title": "Seed Selection & Variety Advice",
        "icon": "🌰",
        "category": "Seed Management",
        "color": "#92400e",
        "bg": "#fffbeb",
        "border": "#fde68a",
        "priority": "medium",
        "introduction": (
            "Quality seed is the single highest-impact input in crop production — a good variety with "
            "certified seed can boost yield by 15–25% even without additional inputs. Seed replacement "
            "rate (SRR) below 30% in India results in massive untapped yield potential across all crops."
        ),
        "guidelines": [
            {
                "title": "Certified Seed Selection Criteria",
                "steps": [
                    "Always purchase seeds with a green tag (Foundation Seed) or blue tag (Certified Seed) from state seed corporations, NSC, or IFFCO.",
                    "Check germination percentage on seed packet — minimum standards: Cereals 85%, Pulses 75%, Oilseeds 70% — test germination before sowing.",
                    "Verify variety performance in your agro-climatic zone using the AICRP (All India Coordinated Research Project) variety trial results.",
                    "For kharif crops: order seed by March-April; for rabi: order by August-September — avoid last-minute purchase of adulterated/mislabeled seed.",
                    "Register seed purchase details on the state agriculture portal for input concession eligibility during crop failure."
                ]
            },
            {
                "title": "Seed Treatment Protocol",
                "steps": [
                    "Fungicidal treatment: Treat seed with Thiram 75% WS @ 3 g/kg + Carbendazim 50% WP @ 1 g/kg before sowing to control seed-borne pathogens.",
                    "Imidacloprid 70% WG @ 5 g/kg as seed treatment provides 4–6 week systemic protection against sucking pests.",
                    "Biological seed treatment: Trichoderma viride @ 10 g/kg + Pseudomonas fluorescens @ 10 g/kg for soil-borne disease suppression.",
                    "Rhizobium inoculant for legumes: 200 g + 200 mL water + 50 g jaggery per 10 kg seed — shade dry under tree and sow within 24 hours.",
                    "NEVER mix chemical and biological seed treatments — apply 24 hours apart to preserve biological viability."
                ]
            },
            {
                "title": "Recommended High-Yield Varieties (2024–25)",
                "steps": [
                    "Rice: IR 64 (medium duration, blast tolerant), MTU 7029 (Swarna, flood-tolerant), Pusa Basmati 1121 (premium aroma, export quality).",
                    "Wheat: HD-2967 (heat tolerant, Zinc-fortified), GW-496 (Gujarat/Rajasthan dryland), WH-1105 (Punjab/Haryana, high yield).",
                    "Cotton: MCU 5 (long staple), DHH-11 (hybrid, bollworm tolerant), NHH-44 (Maharashtra, high ginning outturn 38%).",
                    "Soybean: JS 335 (most popular, wide adaptability), JS 9560 (yellow mosaic resistant), RKS 18 (Khandwa adaptation zone).",
                    "Maize: NK 6240 (hybrid, drought tolerant), DKC 9081 (defence against maydis), Kaveri 99 (sweet corn for processing)."
                ]
            }
        ],
        "quick_tips": [
            "Save seed only from open-pollinated varieties (OPV) — never save hybrid seed, as F2 generation shows yield depression of 30–40%",
            "Store seed at < 10°C and < 40% relative humidity using sealed containers with silica gel moisture absorbers",
            "Seed Crop Scheme: Produce certified seed under SSSC/State Seed Corporation contract for premium priceabove MSP",
            "Mini-kit programme distributes free seed of new ICAR-released varieties to select farmers — register at block agriculture office"
        ]
    }
}


@router.get("/")
async def get_all_guidelines(current_user: dict = Depends(get_current_user)):
    """Return all expert guidelines categories with metadata."""
    categories = []
    for key, data in EXPERT_GUIDELINES_DB.items():
        categories.append({
            "id":           key,
            "title":        data["title"],
            "icon":         data["icon"],
            "category":     data["category"],
            "color":        data["color"],
            "bg":           data["bg"],
            "border":       data["border"],
            "priority":     data["priority"],
            "introduction": data["introduction"],
            "topic_count":  len(data["guidelines"]),
            "quick_tip_count": len(data["quick_tips"]),
        })
    return {
        "total":      len(categories),
        "categories": categories,
        "source":     "ICAR, FAO, State Agricultural Universities — AgriSmart Expert Knowledge Base",
        "version":    "2025-Q1"
    }


@router.get("/{guideline_id}")
async def get_guideline_detail(
    guideline_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Return full detail for a specific guideline category."""
    if guideline_id not in EXPERT_GUIDELINES_DB:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Guideline '{guideline_id}' not found.")

    data = EXPERT_GUIDELINES_DB[guideline_id]
    return {
        "id":           guideline_id,
        **data,
        "source":       "AgriSmart Expert Knowledge Base — ICAR / FAO / State AUs",
    }


@router.get("/search/{query}")
async def search_guidelines(
    query: str,
    current_user: dict = Depends(get_current_user)
):
    """Full-text search across all expert guidelines."""
    query_lower = query.lower()
    results = []

    for key, data in EXPERT_GUIDELINES_DB.items():
        matches = []
        # Search in title and guidelines
        if query_lower in data["title"].lower() or query_lower in data["introduction"].lower():
            matches.append({"type": "category", "text": data["introduction"][:200]})

        for guideline in data["guidelines"]:
            if query_lower in guideline["title"].lower():
                matches.append({"type": "topic", "text": guideline["title"]})
            for step in guideline["steps"]:
                if query_lower in step.lower():
                    matches.append({"type": "step", "text": step[:200]})

        for tip in data["quick_tips"]:
            if query_lower in tip.lower():
                matches.append({"type": "tip", "text": tip[:200]})

        if matches:
            results.append({
                "id":       key,
                "title":    data["title"],
                "icon":     data["icon"],
                "category": data["category"],
                "matches":  matches[:5],  # limit to 5 matches per category
            })

    return {
        "query":   query,
        "total":   len(results),
        "results": results,
    }
