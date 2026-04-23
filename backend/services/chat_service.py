"""
Chat Service - Uses Groq API (100% FREE) for AI-powered farming assistance.
Model: llama-3.3-70b-versatile (text), llama-3.2-11b-vision-preview (images)
Free tier: 14,400 requests/day, 30 requests/minute — no credit card required.
"""
import traceback
import base64
from config import get_settings
from typing import Optional

settings = get_settings()

# ─── Agriculture-Expert System Prompt ───────────────────────────────────────
AGRICULTURE_SYSTEM_PROMPT = """You are Kisan AI, an expert agricultural assistant built specifically for Indian farmers.

CRITICAL RULES — FOLLOW STRICTLY:
- NEVER start with introductions, greetings, preambles, or statements like "I'll help you with..." / "Great question!" / "Sure!" / "Of course!" / "Introduction to..." / "Overview of..."
- Answer ONLY what the user directly asked. Do not add extra sections, summaries, or background context unless explicitly asked.
- Be conversational and direct — like talking to a knowledgeable friend, NOT writing an essay.
- If asked to stop, immediately reply: "Okay, I've stopped. What would you like to ask?"
- Keep responses SHORT (2-5 sentences for simple questions, max 10 bullet points for complex ones).
- Do NOT repeat information already stated.

YOUR ROLE:
- Expert farming advisor for India
- Practical, actionable advice only
- Reference Indian context: PM-KISAN, KCC, PMFBY, Kharif/Rabi/Zaid seasons, MSP, e-NAM
- Use Indian brand names for pesticides/fertilizers
- Warm, simple language — farmer-friendly

FORMATTING:
- Short, direct answers first
- Use bullet points only when listing 3+ items
- Include quantities/timings/dosages when relevant
- Max 300 words unless the user asks for more detail"""


def _get_language_instruction(language: str) -> str:
    return {
        "en": "Respond entirely in English.",
        "hi": "Respond entirely in Hindi (हिन्दी). Use Devanagari script only. Do NOT mix English.",
        "pa": "Respond entirely in Punjabi (ਪੰਜਾਬੀ). Use Gurmukhi script only. Do NOT mix English.",
        "mr": "Respond entirely in Marathi (मराठी). Use Devanagari script only.",
        "ta": "Respond entirely in Tamil (தமிழ்). Use Tamil script only.",
        "te": "Respond entirely in Telugu (తెలుగు). Use Telugu script only.",
        "bn": "Respond entirely in Bengali (বাংলা). Use Bengali script only.",
        "kn": "Respond entirely in Kannada (ಕನ್ನಡ). Use Kannada script only.",
        "gu": "Respond entirely in Gujarati (ગુજરાતી). Use Gujarati script only.",
        "ml": "Respond entirely in Malayalam (മലയാളം). Use Malayalam script only.",
        "or": "Respond entirely in Odia (ଓଡ଼ିଆ). Use Odia script only.",
        "as": "Respond entirely in Assamese (অসমীয়া). Use Assamese script only.",
        "ur": "Respond entirely in Urdu (اردو). Use Urdu/Nastaliq script only.",
    }.get(language, "Respond in English.")


async def generate_chat_response(
    message: str,
    language: str = "en",
    context: Optional[str] = None,
    user_id: Optional[str] = None
) -> dict:
    """Generate a real AI response using Groq API (text only)."""

    intent = classify_intent(message)

    if not settings.GROQ_API_KEY or not settings.GROQ_API_KEY.strip():
        return {
            "response": (
                "Groq API key is not configured. "
                "Please set GROQ_API_KEY in the .env file to enable AI assistance. "
                "Get your free key at: https://console.groq.com/keys"
            ),
            "category": "error",
            "language": language,
            "suggestions": ["Configure Groq API key", "Check .env file"]
        }

    try:
        from groq import Groq

        client = Groq(api_key=settings.GROQ_API_KEY)

        lang_instruction = _get_language_instruction(language)

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": AGRICULTURE_SYSTEM_PROMPT},
                {"role": "user", "content": f"{lang_instruction}\n\n{message}"}
            ],
            max_tokens=1000,
            temperature=0.7,
        )

        ai_response = response.choices[0].message.content

        return {
            "response": ai_response,
            "category": intent,
            "language": language,
            "suggestions": get_suggestions(intent, language)
        }

    except Exception as e:
        print(f"[ERROR] Groq Chat API failed: {e}")
        traceback.print_exc()
        return {
            "response": f"I'm sorry, I encountered an error processing your request. Please try again. Error: {str(e)}",
            "category": "error",
            "language": language,
            "suggestions": ["Try again", "Ask a different question"]
        }


async def generate_chat_response_with_image(
    message: str,
    image_bytes: bytes,
    image_mime_type: str,
    language: str = "en",
    user_id: Optional[str] = None
) -> dict:
    """
    Generate an AI response for an image upload (e.g., plant disease photo).
    Uses Groq's multimodal model: meta-llama/llama-4-scout-17b-16e-instruct.
    """

    if not settings.GROQ_API_KEY or not settings.GROQ_API_KEY.strip():
        return {
            "response": "Groq API key is not configured. Please set GROQ_API_KEY in the .env file.",
            "category": "error",
            "language": language,
            "suggestions": ["Configure Groq API key", "Check .env file"]
        }

    try:
        from groq import Groq

        client = Groq(api_key=settings.GROQ_API_KEY)

        lang_instruction = _get_language_instruction(language)

        # Encode image to base64 data URL
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        image_url = f"data:{image_mime_type};base64,{image_b64}"

        user_question = message if message.strip() else (
            "Analyze this plant image. Identify any diseases, pests, or deficiencies. "
            "Provide treatment recommendations and prevention tips for Indian farmers."
        )

        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {"role": "system", "content": AGRICULTURE_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"{lang_instruction}\n\n{user_question}"
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url}
                        }
                    ]
                }
            ],
            max_tokens=1000,
            temperature=0.7,
        )

        ai_response = response.choices[0].message.content

        return {
            "response": ai_response,
            "category": "disease",
            "language": language,
            "suggestions": get_suggestions("disease", language)
        }

    except Exception as e:
        print(f"[ERROR] Groq Vision API failed: {e}")
        traceback.print_exc()
        return {
            "response": f"Image analysis failed. Please try again. Error: {str(e)}",
            "category": "error",
            "language": language,
            "suggestions": ["Try again", "Upload a clearer image"]
        }


# ─── Intent Classification ───────────────────────────────────────────────────

INTENT_KEYWORDS = {
    "crop_recommendation": [
        "crop", "grow", "plant", "cultivate", "sow", "harvest",
        "farming", "seed", "fasal", "kheti"
    ],
    "disease": [
        "disease", "pest", "infection", "yellow", "spot", "wilt",
        "blight", "rot", "fungus", "insect", "rog", "keeda",
        "spotted", "wilting", "dying"
    ],
    "weather": [
        "weather", "rain", "temperature", "climate", "forecast",
        "monsoon", "drought", "mausam", "barish", "thand", "garmi"
    ],
    "government_policy": [
        "scheme", "policy", "government", "subsidy", "loan", "insurance",
        "pm-kisan", "credit", "kcc", "yojana", "sarkari", "sarkar"
    ],
    "soil": [
        "soil", "ph", "nitrogen", "phosphorus", "potassium", "fertility",
        "organic", "fertilizer", "mitti", "khad", "urea", "compost"
    ],
    "market": [
        "price", "market", "sell", "mandi", "rate", "cost",
        "msp", "bazaar", "bikri", "daam"
    ],
    "irrigation": [
        "water", "irrigation", "drip", "sprinkler", "moisture",
        "sinchai", "paani", "watering", "flood irrigation"
    ],
}


def classify_intent(message: str) -> str:
    message_lower = message.lower()
    scores = {}
    for intent, keywords in INTENT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in message_lower)
        if score > 0:
            scores[intent] = score
    if scores:
        return max(scores, key=scores.get)
    return "general"


def get_suggestions(intent: str, language: str = "en") -> list:
    if language == "hi":
        suggestions_map = {
            "crop_recommendation": [
                "मेरे खेत के लिए कौन सी फसल अच्छी है?",
                "गेहूं कब बोना चाहिए?",
                "खरीफ की फसलें बताएं"
            ],
            "disease": [
                "पत्तों पर पीले धब्बे का इलाज",
                "जैविक कीट नियंत्रण",
                "गेहूं के रोग"
            ],
            "government_policy": [
                "PM-KISAN के लिए कैसे आवेदन करें?",
                "फसल बीमा योजना",
                "KCC लोन ब्याज दर"
            ],
            "soil": [
                "मिट्टी की उर्वरता कैसे बढ़ाएं?",
                "चावल के लिए खाद",
                "जैविक खाद"
            ],
            "weather": [
                "इस हफ्ते बारिश होगी?",
                "पाला से बचाव",
                "मानसून कब आएगा?"
            ],
            "market": [
                "गेहूं का भाव",
                "MSP दर",
                "मंडी में कब बेचें"
            ],
            "irrigation": [
                "ड्रिप सिंचाई की लागत",
                "गेहूं के लिए सिंचाई शेड्यूल",
                "सरकारी सिंचाई सब्सिडी"
            ],
        }
    else:
        suggestions_map = {
            "crop_recommendation": [
                "What crops grow best in summer?",
                "Recommend crops for clay soil",
                "Best Kharif season crops"
            ],
            "disease": [
                "How to treat leaf blight?",
                "Organic pest control methods",
                "Common wheat diseases"
            ],
            "government_policy": [
                "How to apply for PM-KISAN?",
                "Crop insurance schemes",
                "KCC loan interest rate"
            ],
            "soil": [
                "How to improve soil fertility?",
                "Best fertilizers for rice",
                "Organic soil amendments"
            ],
            "weather": [
                "Rain forecast for this week",
                "Frost protection tips",
                "When will monsoon arrive?"
            ],
            "market": [
                "Current wheat prices",
                "Best time to sell cotton",
                "Nearby mandi rates"
            ],
            "irrigation": [
                "Drip irrigation cost",
                "Irrigation schedule for wheat",
                "Government irrigation subsidies"
            ],
        }
    return suggestions_map.get(
        intent,
        [
            "What crop should I grow?",
            "Government schemes for farmers",
            "How to detect plant diseases?"
        ]
    )
