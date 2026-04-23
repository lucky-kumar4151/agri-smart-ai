# AgriSmart - AI-Based Decision Support and Chatbot System for Farmers

A production-ready, full-stack AI-powered agricultural advisory platform that provides Indian farmers with intelligent decision support through conversational AI, machine learning predictions, and real-time data.

## Table of Contents

- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Running Locally](#running-locally)
- [Docker Deployment](#docker-deployment)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [ML Models](#ml-models)
- [Deployment Guide](#deployment-guide)
- [Testing](#testing)
- [Environment Variables](#environment-variables)

---

## Project Overview

AgriSmart is a capstone project that addresses real-world challenges faced by Indian farmers through AI-powered tools:

- **AI Chatbot**: Conversational assistant with voice and multilingual support
- **Crop Recommendation**: ML-based crop suggestions using soil and climate data
- **Disease Detection**: CNN-based plant disease identification from leaf images
- **Weather Advisory**: Real-time weather with farming-specific recommendations
- **Market Prices**: Live mandi prices and official MSP data from Government of India
- **Analytics Dashboard**: Track farming decisions and query history

---

## System Architecture

```
+-------------------+     +-------------------+     +-------------------+
|   Frontend Layer  |     |    API Layer       |     |  Database Layer   |
|   React + Vite    |---->|    FastAPI         |---->|    MongoDB        |
|   Tailwind CSS    |     |    REST APIs       |     |    Atlas/Local    |
+-------------------+     +-------------------+     +-------------------+
                                |        |
                    +-----------+        +-----------+
                    |                                |
          +-------------------+            +-------------------+
          |   AI/NLP Layer    |            |    ML Layer       |
          |   OpenAI API      |            |   Random Forest   |
          |   Intent Classify |            |   InceptionV3 CNN |
          +-------------------+            +-------------------+
```

---

## Tech Stack

| Layer      | Technology                                |
|------------|-------------------------------------------|
| Frontend   | React.js (Vite), Tailwind CSS             |
| Backend    | FastAPI (Python), Async Architecture       |
| Database   | MongoDB (Motor async driver)               |
| AI/NLP     | OpenAI API, Intent Classification          |
| ML Models  | Random Forest (Crop), InceptionV3 (Disease)|
| Voice      | Web Speech API (STT + TTS)                 |
| Auth       | JWT (python-jose), bcrypt                  |
| Cache      | Redis (optional)                           |
| Deploy     | Docker, Vercel, Render                     |

---

## Features

### User Module
- Registration with role selection (Farmer / User)
- JWT-based authentication
- Profile with location, farm details, and preferences

### Chatbot Module
- Intent classification (crop, disease, soil, weather, policy, market, irrigation)
- Knowledge base with agriculture data
- OpenAI integration for advanced responses
- Voice input (Speech-to-Text) and output (Text-to-Speech)
- Multilingual support (English, Hindi, Punjabi)
- Context-aware suggestions

### Crop Recommendation Module
- Random Forest Classifier trained on soil and climate parameters
- Input: N, P, K, Temperature, Humidity, pH, Rainfall
- Returns: Top crops with confidence scores, soil analysis, farming tips
- Official crop database with seasonal information

### Disease Detection Module
- Image upload with drag-and-drop
- CNN analysis (InceptionV3 integration ready)
- Color histogram heuristic fallback
- Returns: Disease name, confidence, treatment, pesticides, prevention
- Database of 7+ common Indian crop diseases

### Weather Advisory Module
- Real-time data from OpenWeatherMap API
- 5-day forecast with tabular display
- Farming-specific advice based on conditions
- Temperature, humidity, wind, rain analysis

### Market Price Module
- Live mandi prices from data.gov.in Agmarknet API
- Official MSP data for 20+ crops (CACP, Government of India)
- Price comparison with MSP indicators
- Crop trend details with e-NAM tips

### Admin Panel
- System status monitoring
- Database collection overview
- User and query statistics
- API documentation quick links

### Voice Assistant
- Browser Speech Recognition API
- Text-to-Speech for responses
- Language-aware (English, Hindi, Punjabi)

---

## Project Structure

```
Capstone/
|-- backend/
|   |-- main.py              # FastAPI application entry point
|   |-- config.py             # Pydantic settings configuration
|   |-- database.py           # MongoDB connection management
|   |-- requirements.txt      # Python dependencies
|   |-- Dockerfile            # Backend container
|   |-- render.yaml           # Render deployment config
|   |-- .env                  # Environment variables
|   |-- .env.example          # Environment template
|   |-- models/
|   |   |-- user.py           # User, Location, FarmDetails schemas
|   |   |-- chat.py           # Chat request/response schemas
|   |   |-- prediction.py     # Crop/Disease prediction schemas
|   |-- routes/
|   |   |-- auth.py           # Authentication endpoints
|   |   |-- chat.py           # Chatbot endpoints
|   |   |-- predict.py        # Prediction endpoints
|   |   |-- weather_market.py # Weather and market endpoints
|   |   |-- dashboard.py      # Dashboard and admin endpoints
|   |-- services/
|   |   |-- chat_service.py   # Chatbot logic, KB, OpenAI
|   |   |-- crop_service.py   # Crop recommendation engine
|   |   |-- disease_service.py# Disease detection engine
|   |   |-- weather_service.py# Weather API integration
|   |   |-- market_service.py # Market price integration
|   |-- middleware/
|   |   |-- auth.py           # JWT middleware, password hashing
|   |-- tests/
|       |-- test_api.py       # API test suite
|
|-- frontend/
|   |-- index.html            # HTML entry point
|   |-- package.json          # Node dependencies
|   |-- vite.config.js        # Vite configuration
|   |-- vercel.json           # Vercel deployment config
|   |-- Dockerfile            # Frontend container
|   |-- nginx.conf            # Nginx configuration
|   |-- .env                  # Frontend environment variables
|   |-- .env.production       # Production environment
|   |-- src/
|       |-- App.jsx           # Route definitions
|       |-- main.jsx          # React entry point
|       |-- index.css         # Design system and global styles
|       |-- contexts/
|       |   |-- AuthContext.jsx
|       |-- components/
|       |   |-- Layout.jsx
|       |   |-- Sidebar.jsx
|       |   |-- ProtectedRoute.jsx
|       |-- pages/
|       |   |-- LandingPage.jsx
|       |   |-- LoginPage.jsx
|       |   |-- RegisterPage.jsx
|       |   |-- DashboardPage.jsx
|       |   |-- ChatbotPage.jsx
|       |   |-- CropRecommendationPage.jsx
|       |   |-- DiseaseDetectionPage.jsx
|       |   |-- WeatherPage.jsx
|       |   |-- MarketPage.jsx
|       |   |-- AdminPage.jsx
|       |-- services/
|           |-- api.js        # Axios API client
|
|-- ml/
|   |-- crop_model/
|   |   |-- train_crop_model.py
|   |-- disease_model/
|       |-- train_disease_model.py
|
|-- docker-compose.yml        # Full stack Docker orchestration
|-- .gitignore
|-- README.md
```

---

## Installation

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB 7.0+ (local or Atlas)
- Git

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env with your API keys
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment
cp .env .env.local
```

---

## Running Locally

### Start MongoDB

```bash
# If installed locally
mongod --dbpath /data/db

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:7.0
```

### Start Backend

```bash
cd backend
venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at: http://localhost:8000
API docs at: http://localhost:8000/docs

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at: http://localhost:3000

---

## Docker Deployment

### Run Everything with Docker Compose

```bash
# From project root
docker compose up --build

# Or in background
docker compose up -d --build
```

This starts:
- MongoDB on port 27017
- Redis on port 6379
- Backend API on port 8000
- Frontend on port 80

Access the application at: http://localhost

---

## API Documentation

Interactive API documentation is auto-generated at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Core Endpoints

| Method | Endpoint              | Description                    |
|--------|-----------------------|-------------------------------|
| POST   | /api/auth/register    | Register new user              |
| POST   | /api/auth/login       | Login and get JWT token        |
| GET    | /api/auth/me          | Get current user profile       |
| PUT    | /api/auth/profile     | Update user profile            |
| POST   | /api/chat/query       | Send message to AI chatbot     |
| GET    | /api/chat/history     | Get chat history               |
| DELETE | /api/chat/history     | Clear chat history             |
| POST   | /api/predict/crop     | Get crop recommendations       |
| POST   | /api/predict/disease  | Detect plant disease           |
| GET    | /api/predict/history  | Get prediction history         |
| GET    | /api/weather          | Get current weather            |
| GET    | /api/weather/forecast | Get 5-day forecast             |
| GET    | /api/market-prices    | Get crop market prices         |
| GET    | /api/market-prices/trends | Get price trends           |
| GET    | /api/dashboard/stats  | Get user dashboard stats       |
| GET    | /api/dashboard/activity | Get activity timeline        |
| GET    | /api/dashboard/analytics | Get analytics data          |
| GET    | /api/health           | API health check               |

---

## Database Schema

### Collections

**users**
- name, email, password (hashed), phone, role, language
- location (state, district, city, latitude, longitude)
- farm_details (farm_size, farm_size_unit, crops, soil_type, irrigation_type)
- created_at, updated_at

**chat_history**
- user_id, message, response, category, language, created_at

**predictions**
- user_id, prediction_type (crop/disease), input_data, result, created_at

**search_history**
- user_id, query, type, result, timestamp

**weather_logs**
- user_id, city, data, timestamp

**feedback**
- user_id, type, content, rating, timestamp

### Indexes
- users.email (unique)
- chat_history.user_id, chat_history.created_at
- predictions.user_id, predictions.created_at
- search_history.user_id, search_history.timestamp

---

## ML Models

### Crop Recommendation Model

- **Algorithm**: Random Forest Classifier
- **Features**: N, P, K, Temperature, Humidity, pH, Rainfall
- **Training Script**: `ml/crop_model/train_crop_model.py`
- **Output**: crop_model.pkl, label_encoder.pkl

```bash
cd ml/crop_model
python train_crop_model.py
```

### Disease Detection Model

- **Architecture**: InceptionV3 (Transfer Learning)
- **Input**: 224x224 RGB leaf images
- **Training Script**: `ml/disease_model/train_disease_model.py`
- **Dataset**: PlantVillage dataset (download separately)
- **Fallback**: Color histogram analysis

---

## Deployment Guide

### Frontend on Vercel

1. Push frontend code to GitHub
2. Connect repository to Vercel
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com`

### Backend on Render

1. Push backend code to GitHub
2. Create new Web Service on Render
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `.env.example`

### Database on MongoDB Atlas

1. Create free cluster at mongodb.com/atlas
2. Get connection string
3. Set `MONGODB_URL` in backend environment

---

## Testing

```bash
cd backend
python -m pytest tests/ -v
```

Tests cover:
- Crop recommendation logic
- Disease detection service
- Chat intent classification
- Knowledge base responses
- API endpoint validation

---

## Environment Variables

### Backend (.env)

| Variable                         | Description                     | Required |
|----------------------------------|---------------------------------|----------|
| MONGODB_URL                      | MongoDB connection string       | Yes      |
| MONGODB_DB_NAME                  | Database name                   | Yes      |
| JWT_SECRET_KEY                   | Secret key for JWT tokens       | Yes      |
| JWT_ALGORITHM                    | JWT algorithm (HS256)           | Yes      |
| JWT_ACCESS_TOKEN_EXPIRE_MINUTES  | Token expiry in minutes         | Yes      |
| OPENAI_API_KEY                   | OpenAI API key for chatbot      | No       |
| WEATHER_API_KEY                  | OpenWeatherMap API key          | No       |
| APP_ENV                          | development / production        | Yes      |
| CORS_ORIGINS                     | Comma-separated allowed origins | Yes      |
| REDIS_URL                        | Redis connection string         | No       |

### Frontend (.env)

| Variable        | Description              |
|-----------------|--------------------------|
| VITE_API_URL    | Backend API base URL     |
| VITE_APP_NAME   | Application name         |

---

## License

This project is developed as a capstone project for academic purposes.

## Authors

AgriSmart Team - 2026


python -m venv venv
venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload