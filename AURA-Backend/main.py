from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from gtts import gTTS
import os
import time
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

app = FastAPI()

# 1. Setup Static Folder for Audio
if not os.path.exists("static"):
    os.makedirs("static")
app.mount("/static", StaticFiles(directory="static"), name="static")

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Supabase Config
load_dotenv()
URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_KEY")

if not URL or not KEY:
    print("ERROR: SUPABASE_URL or SUPABASE_KEY not found!")
else:
    supabase: Client = create_client(URL, KEY)

# 4. Data Model
class UserData(BaseModel):
    user_id: str
    elec_units: float
    water_liters: float
    fuel_liters: float
    appliance_year: int = 2024
    language: str = "English"
    budget: str = "Standard"

@app.post("/analyze")
async def analyze(data: UserData):
    try:
        # 1. Language Mapping
        lang_map = {"Tamil": "ta", "Hindi": "hi", "English": "en"}
        lang_code = lang_map.get(data.language, "en")

        # 2. AGING LOGIC (Daily)
        current_year = 2026
        age = current_year - data.appliance_year
        aging_factor = 1 + (max(0, age) * 0.02)
        daily_real_units = data.elec_units * aging_factor

        # 3. MONTHLY PROJECTION
        monthly_units = daily_real_units * 30

        # 4. TANGEDCO SLAB LOGIC (Based on Monthly Projection)
        if monthly_units <= 100: rate = 1.50 
        elif monthly_units <= 400: rate = 4.50
        elif monthly_units <= 500: rate = 6.00
        else: rate = 9.00

        daily_cost = daily_real_units * rate
        monthly_cost = monthly_units * rate

        # 5. CARBON FOOTPRINT
        daily_carbon = (daily_real_units * 0.82) + (data.fuel_liters * 2.31)
        monthly_carbon = daily_carbon * 30

        # 6. SLAB ALERT (>500 Monthly Units)
        warning_msg = None
        if monthly_units > 500:
            warning_msg = f"High Usage Alert! Projected monthly usage ({round(monthly_units)} units) exceeds the 500-unit limit. Slab rate: ₹9.00/unit."

        # 7. ADVICE LOGIC
        advice_options = {
            "en": {"Economy": "Switch to LED bulbs.", "Standard": f"Your {age}-yr appliances leak energy.", "Premium": "Install Solar."},
            "ta": {"Economy": "எல்இடி விளக்குகளுக்கு மாறவும்.", "Standard": f"உங்கள் {age} வருட பழைய சாதனங்கள் அதிகம் மின்சாரம் எடுக்கும்.", "Premium": "சோலார் பொருத்தவும்."},
            "hi": {"Economy": "एलईडी बल्ब लगाएं।", "Standard": f"आपके {age} साल पुराने उपकरण बिजली बचा सकते हैं।", "Premium": "सोलर ग्रिड लगवाएं।"}
        }
        lang_tips = advice_options.get(lang_code, advice_options["en"])
        final_advice = lang_tips.get(data.budget, lang_tips["Standard"])

        # 8. VOICE GENERATION
        tts = gTTS(text=final_advice, lang=lang_code)
        audio_filename = f"advice_{int(time.time())}.mp3"
        audio_path = os.path.join("static", audio_filename)
        tts.save(audio_path)

        # 9. RESPONSE (Updated with Render URL)
        RENDER_URL = "https://aura-1-syt7.onrender.com"
        return {
            "warning": warning_msg,
            "daily_bill": round(daily_cost, 2),
            "monthly_bill": round(monthly_cost, 2),
            "daily_carbon": round(daily_carbon, 2),
            "monthly_carbon": round(monthly_carbon, 2),
            "monthly_units": round(monthly_units, 2),
            "advice": final_advice,
            "voice_url": f"{RENDER_URL}/static/{audio_filename}"
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
