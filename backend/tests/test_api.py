"""
AgriSmart API Tests - Comprehensive Test Suite
Run: python -m pytest tests/test_api.py -v
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from unittest.mock import patch, AsyncMock

# Test the service layer directly (no DB needed)
from services.crop_service import predict_crop, analyze_soil
from services.disease_service import detect_disease
from services.chat_service import classify_intent, get_kb_response, get_suggestions
from models.prediction import CropPredictionRequest


# ============================================================
# CROP SERVICE TESTS
# ============================================================
class TestCropService:
    """Test crop recommendation service"""

    def test_predict_rice_conditions(self):
        req = CropPredictionRequest(
            nitrogen=90, phosphorus=48, potassium=40,
            temperature=28, humidity=80, ph=6.5, rainfall=200
        )
        result = predict_crop(req)
        assert "crops" in result
        assert len(result["crops"]) > 0
        crop_names = [c["name"].lower() for c in result["crops"]]
        assert any("rice" in name for name in crop_names)

    def test_predict_wheat_conditions(self):
        req = CropPredictionRequest(
            nitrogen=100, phosphorus=55, potassium=35,
            temperature=18, humidity=55, ph=7.0, rainfall=80
        )
        result = predict_crop(req)
        assert len(result["crops"]) > 0
        crop_names = [c["name"].lower() for c in result["crops"]]
        assert any("wheat" in name for name in crop_names)

    def test_predict_cotton_conditions(self):
        req = CropPredictionRequest(
            nitrogen=120, phosphorus=45, potassium=50,
            temperature=30, humidity=50, ph=7.2, rainfall=70
        )
        result = predict_crop(req)
        assert len(result["crops"]) > 0

    def test_predict_returns_tips(self):
        req = CropPredictionRequest(
            nitrogen=80, phosphorus=40, potassium=40,
            temperature=25, humidity=60, ph=6.5, rainfall=100
        )
        result = predict_crop(req)
        assert "tips" in result
        assert len(result["tips"]) > 0

    def test_predict_returns_model_used(self):
        req = CropPredictionRequest(
            nitrogen=80, phosphorus=40, potassium=40,
            temperature=25, humidity=60, ph=6.5, rainfall=100
        )
        result = predict_crop(req)
        assert "model_used" in result
        assert len(result["model_used"]) > 0

    def test_predict_confidence_in_range(self):
        req = CropPredictionRequest(
            nitrogen=50, phosphorus=30, potassium=30,
            temperature=25, humidity=60, ph=6.5, rainfall=100
        )
        result = predict_crop(req)
        for crop in result["crops"]:
            assert 0 <= crop["confidence"] <= 100

    def test_predict_returns_crop_details(self):
        req = CropPredictionRequest(
            nitrogen=80, phosphorus=40, potassium=40,
            temperature=25, humidity=60, ph=6.5, rainfall=100
        )
        result = predict_crop(req)
        for crop in result["crops"]:
            assert "name" in crop
            assert "confidence" in crop
            assert "season" in crop
            assert "description" in crop

    def test_predict_max_crops_limited(self):
        req = CropPredictionRequest(
            nitrogen=80, phosphorus=40, potassium=40,
            temperature=25, humidity=60, ph=6.5, rainfall=100
        )
        result = predict_crop(req)
        assert len(result["crops"]) <= 12

    def test_predict_extreme_low_values(self):
        req = CropPredictionRequest(
            nitrogen=0, phosphorus=0, potassium=0,
            temperature=5, humidity=10, ph=3.0, rainfall=5
        )
        result = predict_crop(req)
        assert "crops" in result
        assert "tips" in result

    def test_predict_extreme_high_values(self):
        req = CropPredictionRequest(
            nitrogen=200, phosphorus=200, potassium=200,
            temperature=50, humidity=100, ph=14.0, rainfall=500
        )
        result = predict_crop(req)
        assert "crops" in result


# ============================================================
# SOIL ANALYSIS TESTS
# ============================================================
class TestSoilAnalysis:
    """Test soil analysis service"""

    def test_soil_analysis_low_nitrogen(self):
        req = CropPredictionRequest(
            nitrogen=20, phosphorus=30, potassium=30,
            temperature=25, humidity=60, ph=6.5, rainfall=100
        )
        analysis = analyze_soil(req)
        assert analysis["nitrogen_status"] == "Low"
        assert any("nitrogen" in r.lower() or "urea" in r.lower()
                    for r in analysis["recommendations"])

    def test_soil_analysis_high_nitrogen(self):
        req = CropPredictionRequest(
            nitrogen=150, phosphorus=30, potassium=30,
            temperature=25, humidity=60, ph=6.5, rainfall=100
        )
        analysis = analyze_soil(req)
        assert analysis["nitrogen_status"] == "High"

    def test_soil_analysis_acidic(self):
        req = CropPredictionRequest(
            nitrogen=80, phosphorus=50, potassium=40,
            temperature=25, humidity=60, ph=4.5, rainfall=100
        )
        analysis = analyze_soil(req)
        assert analysis["ph_status"] == "Acidic"

    def test_soil_analysis_alkaline(self):
        req = CropPredictionRequest(
            nitrogen=80, phosphorus=50, potassium=40,
            temperature=25, humidity=60, ph=8.5, rainfall=100
        )
        analysis = analyze_soil(req)
        assert analysis["ph_status"] == "Alkaline"

    def test_soil_analysis_neutral(self):
        req = CropPredictionRequest(
            nitrogen=80, phosphorus=50, potassium=40,
            temperature=25, humidity=60, ph=6.8, rainfall=100
        )
        analysis = analyze_soil(req)
        assert analysis["ph_status"] == "Neutral"

    def test_soil_analysis_fertility_score(self):
        req = CropPredictionRequest(
            nitrogen=80, phosphorus=50, potassium=40,
            temperature=25, humidity=60, ph=6.8, rainfall=100
        )
        analysis = analyze_soil(req)
        assert analysis["overall_fertility"] in ["High", "Medium", "Low"]

    def test_soil_analysis_has_recommendations(self):
        req = CropPredictionRequest(
            nitrogen=10, phosphorus=10, potassium=10,
            temperature=25, humidity=60, ph=4.0, rainfall=100
        )
        analysis = analyze_soil(req)
        assert len(analysis["recommendations"]) > 0


# ============================================================
# DISEASE SERVICE TESTS
# ============================================================
class TestDiseaseService:
    """Test disease detection service"""

    def _make_image(self, r, g, b):
        from PIL import Image
        import io
        img = Image.new('RGB', (224, 224), color=(r, g, b))
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        return buffer.getvalue()

    def test_detect_returns_valid_structure(self):
        result = detect_disease(self._make_image(50, 150, 50))
        assert "disease_name" in result
        assert "confidence" in result
        assert "treatment" in result
        assert "pesticide" in result
        assert "prevention" in result
        assert "description" in result
        assert "crop_type" in result

    def test_detect_healthy_plant(self):
        result = detect_disease(self._make_image(30, 180, 30))
        assert result["disease_name"] == "Healthy Plant"

    def test_detect_confidence_range(self):
        result = detect_disease(self._make_image(180, 80, 30))
        assert 0 <= result["confidence"] <= 100

    def test_detect_invalid_image(self):
        result = detect_disease(b"not an image at all")
        assert "disease_name" in result

    def test_detect_treatment_not_empty(self):
        result = detect_disease(self._make_image(160, 60, 40))
        assert len(result["treatment"]) > 0

    def test_detect_prevention_not_empty(self):
        result = detect_disease(self._make_image(100, 100, 100))
        assert len(result["prevention"]) > 0

    def test_detect_analysis_method(self):
        result = detect_disease(self._make_image(50, 150, 50))
        assert "analysis_method" in result


# ============================================================
# CHAT SERVICE TESTS
# ============================================================
class TestChatIntentClassification:
    """Test chat intent classification"""

    def test_classify_crop_intent(self):
        assert classify_intent("What crop should I grow?") == "crop_recommendation"

    def test_classify_disease_intent(self):
        assert classify_intent("My plant has yellow spots") == "disease"

    def test_classify_policy_intent(self):
        assert classify_intent("Tell me about PM-KISAN scheme") == "government_policy"

    def test_classify_weather_intent(self):
        assert classify_intent("What is the weather forecast?") == "weather"

    def test_classify_market_intent(self):
        assert classify_intent("What is the current price of wheat?") == "market"

    def test_classify_soil_intent(self):
        assert classify_intent("How to improve soil fertility?") == "soil"

    def test_classify_irrigation_intent(self):
        assert classify_intent("Best irrigation method for rice") == "irrigation"

    def test_classify_general_intent(self):
        assert classify_intent("Hello there!") == "general"

    def test_classify_multiple_keywords(self):
        result = classify_intent("What crop grows well in monsoon rain weather?")
        assert result in ["crop_recommendation", "weather"]

    def test_classify_empty_string(self):
        assert classify_intent("") == "general"


# ============================================================
# KNOWLEDGE BASE TESTS
# ============================================================
class TestKBResponse:
    """Test knowledge base responses"""

    def test_policy_response_has_schemes(self):
        response = get_kb_response("government_policy", "government schemes")
        assert "PM-KISAN" in response
        assert "KCC" in response or "Credit" in response

    def test_crop_response_for_rice(self):
        response = get_kb_response("crop_recommendation", "tell me about rice farming")
        assert "rice" in response.lower()

    def test_crop_response_for_wheat(self):
        response = get_kb_response("crop_recommendation", "wheat farming guide")
        assert "wheat" in response.lower()

    def test_general_response_has_features(self):
        response = get_kb_response("general", "hello")
        assert "Crop" in response
        assert "Disease" in response

    def test_disease_response(self):
        response = get_kb_response("disease", "my plant is wilting")
        assert "disease" in response.lower() or "Disease" in response

    def test_soil_response_nitrogen(self):
        response = get_kb_response("soil", "low nitrogen levels")
        assert "nitrogen" in response.lower()

    def test_irrigation_response(self):
        response = get_kb_response("irrigation", "drip irrigation")
        assert "irrigation" in response.lower()

    def test_market_response(self):
        response = get_kb_response("market", "wheat price")
        assert "market" in response.lower() or "price" in response.lower()

    def test_weather_response(self):
        response = get_kb_response("weather", "rain forecast")
        assert "weather" in response.lower()


# ============================================================
# SUGGESTIONS TESTS
# ============================================================
class TestSuggestions:
    """Test suggestion generation"""

    def test_suggestions_for_crop(self):
        result = get_suggestions("crop_recommendation")
        assert len(result) > 0
        assert isinstance(result, list)

    def test_suggestions_for_disease(self):
        result = get_suggestions("disease")
        assert len(result) > 0

    def test_suggestions_for_unknown(self):
        result = get_suggestions("unknown_intent")
        assert len(result) > 0

    def test_suggestions_are_strings(self):
        for intent in ["crop_recommendation", "disease", "soil", "weather", "market"]:
            result = get_suggestions(intent)
            for s in result:
                assert isinstance(s, str)


# ============================================================
# MARKET SERVICE TESTS
# ============================================================
class TestMarketService:
    """Test market price service"""

    @pytest.mark.asyncio
    async def test_get_market_prices_all(self):
        from services.market_service import get_market_prices
        result = await get_market_prices()
        assert "prices" in result
        assert "total" in result
        assert "source" in result
        assert result["total"] > 0

    @pytest.mark.asyncio
    async def test_get_market_prices_filtered(self):
        from services.market_service import get_market_prices
        result = await get_market_prices(crop="rice")
        assert "prices" in result

    @pytest.mark.asyncio
    async def test_get_price_trends(self):
        from services.market_service import get_price_trends
        result = await get_price_trends("wheat")
        assert "crop" in result
        assert "msp" in result
        assert "tips" in result

    @pytest.mark.asyncio
    async def test_get_price_trends_unknown_crop(self):
        from services.market_service import get_price_trends
        result = await get_price_trends("unknowncrop123")
        assert "error" in result


# ============================================================
# WEATHER SERVICE TESTS
# ============================================================
class TestWeatherService:
    """Test weather advisory generation"""

    def test_farming_advice_high_temp(self):
        from services.weather_service import generate_farming_advice
        advice = generate_farming_advice(temp=40, humidity=50, wind=10, description="clear sky")
        assert len(advice) > 0
        assert any("temperature" in a.lower() or "heat" in a.lower() or "irrigat" in a.lower() for a in advice)

    def test_farming_advice_heavy_rain(self):
        from services.weather_service import generate_farming_advice
        advice = generate_farming_advice(temp=25, humidity=90, wind=10, description="rain", rain=10)
        assert any("rain" in a.lower() or "drainage" in a.lower() for a in advice)

    def test_farming_advice_clear(self):
        from services.weather_service import generate_farming_advice
        advice = generate_farming_advice(temp=25, humidity=50, wind=5, description="clear sky")
        assert any("clear" in a.lower() or "harvest" in a.lower() for a in advice)

    def test_farming_advice_strong_wind(self):
        from services.weather_service import generate_farming_advice
        advice = generate_farming_advice(temp=25, humidity=50, wind=30, description="windy")
        assert any("wind" in a.lower() for a in advice)

    def test_farming_advice_high_humidity(self):
        from services.weather_service import generate_farming_advice
        advice = generate_farming_advice(temp=25, humidity=90, wind=5, description="cloudy")
        assert any("humidity" in a.lower() or "fungal" in a.lower() for a in advice)


# ============================================================
# MODEL VALIDATION TESTS
# ============================================================
class TestModelValidation:
    """Test Pydantic model validation"""

    def test_crop_request_valid(self):
        req = CropPredictionRequest(
            nitrogen=80, phosphorus=40, potassium=40,
            temperature=25, humidity=60, ph=6.5, rainfall=100
        )
        assert req.nitrogen == 80

    def test_crop_request_boundary(self):
        req = CropPredictionRequest(
            nitrogen=0, phosphorus=0, potassium=0,
            temperature=-10, humidity=0, ph=0, rainfall=0
        )
        assert req.temperature == -10

    def test_crop_request_max_boundary(self):
        req = CropPredictionRequest(
            nitrogen=200, phosphorus=200, potassium=200,
            temperature=60, humidity=100, ph=14, rainfall=500
        )
        assert req.nitrogen == 200

    def test_crop_request_invalid_nitrogen(self):
        with pytest.raises(Exception):
            CropPredictionRequest(
                nitrogen=300, phosphorus=40, potassium=40,
                temperature=25, humidity=60, ph=6.5, rainfall=100
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
