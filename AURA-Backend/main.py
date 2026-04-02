from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from gtts import gTTS
import os
import time
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Initialize FastAPI app
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
    print("ERROR: SUPABASE_URL or SUPABASE_KEY not found in .env file!")

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
        print(f"--- Received Daily Data from React: {data} ---")

        # 1. Language Mapping
        lang_map = {"Tamil": "ta", "Hindi": "hi", "English": "en"}
        lang_code = lang_map.get(data.language, "en")

        # 2. AGING LOGIC (Applied to daily units)
        current_year = 2026
        age = current_year - data.appliance_year
        aging_factor = 1 + (max(0, age) * 0.02)
        daily_real_units = data.elec_units * aging_factor

        # 3. MONTHLY PROJECTION
        monthly_units = daily_real_units * 30

        # 4. TANGEDCO SLAB LOGIC (Based on Monthly Projection)
        # We determine the rate per unit based on total monthly usage
        if monthly_units <= 100: 
            rate = 1.50 
        elif monthly_units <= 400: 
            rate = 4.50
        elif monthly_units <= 500: 
            rate = 6.00
        else: 
            rate = 9.00

        # Calculating costs
        daily_cost = daily_real_units * rate
        monthly_cost = monthly_units * rate

        # 5. CARBON FOOTPRINT (Calculated for both)
        daily_carbon = (daily_real_units * 0.82) + (data.fuel_liters * 2.31)
        monthly_carbon = daily_carbon * 30

        # 6. SLAB ALERT LOGIC
        # Specifically triggers if monthly units exceed 500
        warning_msg = None
        if monthly_units > 500:
            warning_msg = f"High Usage Alert! Your projected monthly usage ({round(monthly_units)} units) is above the 500-unit slab. Rates are now ₹9.00/unit."

        # 7. DYNAMIC ADVICE LOGIC
        advice_options = {
            "en": {
                "Economy": "Pro-Tip: Switch to LED bulbs and clean your AC filters to save ₹300 monthly.",
                "Standard": f"Your {age}-year-old appliances are leaking energy. Upgrading could save 15% on bills.",
                "Premium": "Investment Tip: Your usage is perfect for a 3kW Solar Grid with a 4-year ROI."
            },
            "ta": {
                "Economy": "குறிப்பு: எல்இடி விளக்குகளுக்கு மாறுவதன் மூலம் மாதம் ₹300 வரை சேமிக்கலாம்.",
                "Standard": f"உங்கள் {age} வருட பழைய சாதனங்கள் அதிக மின்சாரத்தை பயன்படுத்துகின்றன.",
                "Premium": "முதலீடு: உங்கள் பயன்பாட்டிற்கு சோலார் பேனல்கள் சிறந்த லாபத்தை தரும்."
            },
            "hi": {
                "Economy": "टिप: एलईडी बल्ब का उपयोग करें और महीने में ₹300 बचाएं।",
                "Standard": f"आपके {age} साल पुराने उपकरण आपके बिल को बढ़ा रहे हैं।",
                "Premium": "निवेश टिप: आपके उपयोग के लिए सोलर ग्रिड सबसे अच्छा विकल्प है।"
            }
        }

        lang_tips = advice_options.get(lang_code, advice_options["en"])
        final_advice = lang_tips.get(data.budget, lang_tips["Standard"])

        # 8. VOICE GENERATION
        tts = gTTS(text=final_advice, lang=lang_code)
        audio_filename = "advice.mp3"
        audio_path = os.path.join("static", audio_filename)
        tts.save(audio_path)

        # 9. RESPONSE
        return {
            "warning": warning_msg,
            "daily_bill": round(daily_cost, 2),
            "monthly_bill": round(monthly_cost, 2),
            "daily_carbon": round(daily_carbon, 2),
            "monthly_carbon": round(monthly_carbon, 2),
            "monthly_units": round(monthly_units, 2),
            "advice": final_advice,
            "voice_url": f"http://127.0.0.1:8000/static/{audio_filename}?t={int(time.time())}"
        }

    except Exception as e:
        print(f"CRASH ERROR: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
