from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import time
import uuid

app = FastAPI(title="VigilX Engine backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class MouseData(BaseModel):
    velocity: float
    acceleration: float
    jitter: float
    curvature: float

class KeyboardData(BaseModel):
    wpm: int
    flightTime: int
    keyHoldTime: int
    rhythm: float

class BehaviorPayload(BaseModel):
    session_id: str
    mouse: MouseData
    keyboard: KeyboardData
    is_simulation: bool = False
    simulation_type: str = ""

# In-memory DB
dashboard_stats = {
    "total_blocked": 14592,
    "humans_verified": 58231,
    "avg_latency_ms": 23
}

# Initially populate some session feeds
recent_sessions = [
    {"id": f"vx_{str(uuid.uuid4())[:6]}", "score": "0.94", "type": "Human", "action": "Allow", "is_bot": False, "time": "2 min ago"},
    {"id": f"vx_{str(uuid.uuid4())[:6]}", "score": "0.12", "type": "Bot", "action": "Block", "is_bot": True, "time": "5 min ago"},
    {"id": f"vx_{str(uuid.uuid4())[:6]}", "score": "0.88", "type": "Human", "action": "Allow", "is_bot": False, "time": "6 min ago"}
]
threat_feed = [
    {"time": "12:05:32", "threat": "DDoS Probe", "ip": "192.168.1.x", "x": 75.3, "y": 30.1},
    {"time": "12:02:11", "threat": "Credential Stuffing", "ip": "45.22.x.x", "x": 25.1, "y": 45.8}
]

def process_heuristics(payload: BehaviorPayload):
    # Rule based evaluation simulating ML
    score = 0.5
    bot_reasons = []
    
    # Thresholds for Human
    if payload.mouse.velocity > 0:
        if payload.mouse.jitter < 0.01 and payload.mouse.velocity > 25:
            score -= 0.6
            bot_reasons.append("Perfectly straight high-speed line (Mechanical)")
        elif payload.mouse.jitter > 0.05 or payload.mouse.curvature >= 0.005 or payload.mouse.acceleration > 5:
            score += 0.35 # Human traits
    
    if payload.keyboard.wpm > 0:
        if payload.keyboard.rhythm < 0.5 and payload.keyboard.wpm > 150:
            score -= 0.6
            bot_reasons.append("Zero variance typing rhythm (Scripted)")
        elif payload.keyboard.rhythm > 1 or payload.keyboard.flightTime > 0:
            score += 0.3
            
    # Handle pure explicit simulations for the demo
    if payload.is_simulation:
        if payload.simulation_type == "bot":
            score = 0.08
            bot_reasons = ["Known Bot Signature: Selenium/Playwright API"]
        elif payload.simulation_type == "human":
            score = 0.96
            bot_reasons = []

    score = max(0.0, min(1.0, score + 0.1)) # Normalize
    return score, bot_reasons

@app.post("/api/analyze")
async def analyze_behavior(payload: BehaviorPayload):
    start_time = time.time()
    
    score, bot_reasons = process_heuristics(payload)
    
    # simulate some ML latency
    time.sleep(random.uniform(0.01, 0.04))
    latency = int((time.time() - start_time) * 1000)
    
    is_bot = score < 0.3
    action = "Block" if is_bot else ("Challenge" if score < 0.7 else "Allow")
    
    # Update Stats
    dashboard_stats["avg_latency_ms"] = (dashboard_stats["avg_latency_ms"] + latency) // 2
    if is_bot:
        dashboard_stats["total_blocked"] += 1
    else:
        dashboard_stats["humans_verified"] += 1
        
    session_event = {
        "id": payload.session_id or f"vx_{str(uuid.uuid4())[:8]}",
        "score": f"{score:.2f}",
        "type": "Bot" if is_bot else "Human",
        "action": action,
        "is_bot": is_bot,
        "time": "just now"
    }
    
    recent_sessions.insert(0, session_event)
    if len(recent_sessions) > 8:
        recent_sessions.pop()
        
    if is_bot and bot_reasons:
        threat_feed.insert(0, {
            "time": time.strftime("%H:%M:%S"),
            "threat": bot_reasons[0],
            "ip": f"{random.randint(10,250)}.{random.randint(10,250)}.{random.randint(1,10)}.x",
            "x": random.uniform(10.0, 90.0),
            "y": random.uniform(20.0, 80.0)
        })
        if len(threat_feed) > 5:
            threat_feed.pop()
            
    return {
        "score": score,
        "action": action,
        "latency_ms": latency,
        "reasons": bot_reasons
    }

@app.get("/api/dashboard/stats")
async def get_stats():
    return dashboard_stats

@app.get("/api/dashboard/feed")
async def get_feed():
    return {
        "sessions": recent_sessions,
        "threats": threat_feed
    }

# ----- AUTH ENDPOINTS -----
class LoginPayload(BaseModel):
    email: str
    password: str

class RegisterPayload(BaseModel):
    name: str
    email: str
    password: str

@app.post("/api/login")
async def login(payload: LoginPayload):
    # Dummy mock credentials
    if payload.email == "admin@vigilx.dev" and payload.password == "admin123":
        return {"success": True, "token": f"vx_token_{uuid.uuid4()}"}
    raise HTTPException(status_code=401, detail="Invalid credentials. Use admin@vigilx.dev / admin123")

@app.post("/api/register")
async def register(payload: RegisterPayload):
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password too short.")
    # accept basically anything else
    return {"success": True, "token": f"vx_token_{uuid.uuid4()}"}

# ----- CHATBOT ENDPOINT -----
class ChatPayload(BaseModel):
    query: str

@app.post("/api/chat")
async def chat(payload: ChatPayload):
    query = payload.query.lower()
    time.sleep(random.uniform(0.5, 1.2)) # simulate AI thinking
    
    intent_map = {
        "price": "VigilX is free up to 10k sessions. The Pro tier is ₹4,999/mo for up to 500k sessions, which includes custom ML models.",
        "cost": "VigilX is free up to 10k sessions. The Pro tier is ₹4,999/mo for up to 500k sessions.",
        "install": "You can install VigilX in 3 lines of code! Just include the `v1.js` script in your HTML head and call `vigilx.init({ siteKey: '...' })`.",
        "sdk": "The JS SDK is incredibly lightweight (<15KB) and async, so it has 0ms impact on your Web Vitals.",
        "bot": "We use Mouse dynamics (velocity, jitter, curvature) and Keyboard biometrics to detect non-human variance in real time.",
        "how": "Instead of checking *what* you click, we check *how* you move. Only humans have natural hesitations, micro-jitters, and varying rhythm. Bots are mechanical.",
        "privacy": "We are 100% DPDP Act 2023 compliant. We only store session-level hashes and instantly discard telemetry after scoring.",
        "hello": "Hello! I am the VigilX integration assistant. Ask me about pricing, installation, or how our bot detection works under the hood!",
        "hi": "Hi there! I am the VigilX integration assistant. Ask me about pricing, installation, or bot mechanics!"
    }
    
    for key, response in intent_map.items():
        if key in query:
            return {"response": response}
            
    return {"response": "I'm still learning! But basically, VigilX uses behavioral biometrics to stop bots securely and invisibly. Can I clarify anything about Pricing or Installation?"}

# ----- CHART STREAMING ENDPOINT -----
chart_data_history = {
    "labels": [],
    "humans": [],
    "bots": []
}

# pre-populate some history
start_hour = time.localtime().tm_hour
for i in range(20):
    t = time.localtime(time.time() - (20-i)*60)
    chart_data_history["labels"].append(f"{t.tm_hour:02d}:{t.tm_min:02d}:{t.tm_sec:02d}")
    chart_data_history["humans"].append(random.randint(1000, 1500))
    chart_data_history["bots"].append(random.randint(200, 500))

@app.get("/api/dashboard/chart")
async def get_chart():
    # simulate live pushing data ticking forwards
    t = time.localtime()
    chart_data_history["labels"].pop(0)
    chart_data_history["labels"].append(f"{t.tm_hour:02d}:{t.tm_min:02d}:{t.tm_sec:02d}")
    
    chart_data_history["humans"].pop(0)
    # create correlated movements based on last entry
    last_human = chart_data_history["humans"][-1]
    chart_data_history["humans"].append(max(500, min(3000, last_human + random.randint(-150, 200))))
    
    chart_data_history["bots"].pop(0)
    last_bot = chart_data_history["bots"][-1]
    # small chance of spike
    bot_val = last_bot + random.randint(-50, 100)
    if random.random() < 0.05: bot_val += 400
    chart_data_history["bots"].append(max(0, bot_val))
    
    return chart_data_history
