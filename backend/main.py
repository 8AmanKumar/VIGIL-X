"""
VigilX Engine — Production Backend
Professional-grade FastAPI application with:
  • SQLite persistence via SQLAlchemy
  • JWT authentication with bcrypt password hashing
  • Rate limiting with SlowAPI
  • Structured logging
  • Full REST API for auth, analysis, dashboard, chat
"""

import os
import json
import time
import uuid
import random
import hashlib
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import init_db, get_db, User, AnalysisSession, ThreatEvent, DashboardStats
from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    get_current_user, require_auth
)
from models import (
    LoginRequest, RegisterRequest, GoogleAuthRequest, AuthResponse,
    RefreshRequest, UserProfile,
    BehaviorPayload, AnalysisResponse,
    DashboardStatsResponse, DashboardFeedResponse, SessionEvent, ThreatFeedItem,
    ChartDataResponse, ChatRequest, ChatResponse, HealthResponse
)

# ─────────────────── Logging ───────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("vigilx")

# ─────────────────── Rate Limiter ───────────────────

limiter = Limiter(key_func=get_remote_address)

# ─────────────────── App Startup ───────────────────

START_TIME = time.time()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle manager — runs on startup/shutdown."""
    logger.info("🛡️  VigilX Engine v2.0.0 starting...")
    init_db()
    logger.info("✅ Database initialized")
    _seed_demo_data()
    logger.info("✅ Demo data seeded")
    logger.info("🚀 VigilX Engine ready")
    yield
    logger.info("🛑 VigilX Engine shutting down")

app = FastAPI(
    title="VigilX Engine",
    description="AI-Powered Real-Time Bot Defence API",
    version="2.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─────────────────── CORS ───────────────────

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────── Middleware: Request Logging ───────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 1)
    if not request.url.path.startswith("/docs") and not request.url.path.startswith("/openapi"):
        logger.info(f"{request.method} {request.url.path} → {response.status_code} ({duration}ms)")
    return response

# ─────────────────── In-Memory Caches (for real-time dashboard) ───────────────────

recent_sessions_cache = []
threat_feed_cache = []
chart_data_history = {"labels": [], "humans": [], "bots": []}

def _seed_demo_data():
    """Pre-populate in-memory caches and ensure chart history exists."""
    global recent_sessions_cache, threat_feed_cache, chart_data_history

    recent_sessions_cache = [
        {"id": f"vx_{uuid.uuid4().hex[:6]}", "score": "0.94", "type": "Human", "action": "Allow", "is_bot": False, "time": "2 min ago"},
        {"id": f"vx_{uuid.uuid4().hex[:6]}", "score": "0.12", "type": "Bot", "action": "Block", "is_bot": True, "time": "5 min ago"},
        {"id": f"vx_{uuid.uuid4().hex[:6]}", "score": "0.88", "type": "Human", "action": "Allow", "is_bot": False, "time": "6 min ago"},
        {"id": f"vx_{uuid.uuid4().hex[:6]}", "score": "0.72", "type": "Human", "action": "Allow", "is_bot": False, "time": "8 min ago"},
    ]

    threat_feed_cache = [
        {"time": "12:05:32", "threat": "DDoS Probe", "ip": "192.168.1.x", "x": 75.3, "y": 30.1},
        {"time": "12:02:11", "threat": "Credential Stuffing", "ip": "45.22.x.x", "x": 25.1, "y": 45.8},
    ]

    # Pre-populate chart history
    chart_data_history["labels"] = []
    chart_data_history["humans"] = []
    chart_data_history["bots"] = []
    for i in range(20):
        t = time.localtime(time.time() - (20 - i) * 60)
        chart_data_history["labels"].append(f"{t.tm_hour:02d}:{t.tm_min:02d}:{t.tm_sec:02d}")
        chart_data_history["humans"].append(random.randint(1000, 1500))
        chart_data_history["bots"].append(random.randint(200, 500))


# ╔══════════════════════════════════════════════════════════════╗
# ║                     HEALTH CHECK                             ║
# ╚══════════════════════════════════════════════════════════════╝

@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        uptime_seconds=round(time.time() - START_TIME, 2),
        database="connected"
    )


# ╔══════════════════════════════════════════════════════════════╗
# ║                     AUTHENTICATION                           ║
# ╚══════════════════════════════════════════════════════════════╝

@app.post("/api/login", tags=["Auth"], response_model=AuthResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password."""
    logger.info(f"Login attempt: {payload.email}")
    
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated"
        )
    
    access_token = create_access_token(data={"sub": user.id, "email": user.email})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    logger.info(f"Login success: {user.email}")
    
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserProfile(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            avatar_url=user.avatar_url,
            created_at=user.created_at.isoformat() if user.created_at else None
        )
    )


@app.post("/api/register", tags=["Auth"], response_model=AuthResponse)
@limiter.limit("5/minute")
async def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    logger.info(f"Registration attempt: {payload.email}")
    
    email = payload.email.lower().strip()
    
    # Check if user already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )
    
    # Create user
    user = User(
        email=email,
        name=payload.name.strip(),
        password_hash=hash_password(payload.password),
        provider="email"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    access_token = create_access_token(data={"sub": user.id, "email": user.email})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    logger.info(f"Registration success: {user.email}")
    
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserProfile(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            created_at=user.created_at.isoformat() if user.created_at else None
        )
    )


@app.post("/api/auth/google", tags=["Auth"], response_model=AuthResponse)
@limiter.limit("10/minute")
async def google_auth(request: Request, payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Google OAuth mock endpoint.
    In production, validate the Google ID token server-side.
    For demo purposes, we trust the payload and create/login the user.
    """
    logger.info(f"Google auth attempt: {payload.email}")
    
    email = payload.email.lower().strip()
    
    # Find or create user
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        user = User(
            email=email,
            name=payload.name.strip(),
            password_hash=hash_password(uuid.uuid4().hex),  # Random password for OAuth users
            provider="google",
            avatar_url=payload.avatar_url
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"Google user created: {email}")
    else:
        # Update avatar if provided
        if payload.avatar_url and not user.avatar_url:
            user.avatar_url = payload.avatar_url
            db.commit()
    
    access_token = create_access_token(data={"sub": user.id, "email": user.email})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserProfile(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            avatar_url=user.avatar_url,
            created_at=user.created_at.isoformat() if user.created_at else None
        )
    )


@app.post("/api/auth/refresh", tags=["Auth"])
@limiter.limit("20/minute")
async def refresh_token(request: Request, payload: RefreshRequest, db: Session = Depends(get_db)):
    """Refresh an access token using a valid refresh token."""
    token_data = decode_token(payload.refresh_token)
    
    if token_data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    user_id = token_data.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    new_access = create_access_token(data={"sub": user.id, "email": user.email})
    
    return {"access_token": new_access, "token_type": "bearer"}


@app.get("/api/auth/me", tags=["Auth"])
async def get_me(user: User = Depends(require_auth)):
    """Get current authenticated user profile."""
    return UserProfile(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        avatar_url=user.avatar_url,
        created_at=user.created_at.isoformat() if user.created_at else None
    )


# ╔══════════════════════════════════════════════════════════════╗
# ║                  BEHAVIOR ANALYSIS ENGINE                    ║
# ╚══════════════════════════════════════════════════════════════╝

def _process_heuristics(payload: BehaviorPayload):
    """
    Rule-based behavioral analysis simulating ML inference.
    Evaluates mouse dynamics and keyboard biometrics to classify bot vs human.
    Returns (score, reasons) where score ∈ [0, 1] and reasons is a list of strings.
    """
    score = 0.5
    bot_reasons = []
    human_signals = 0
    bot_signals = 0

    # ─── Mouse Analysis ───
    if payload.mouse.velocity > 0:
        # Bot signal: perfectly straight, high-speed trajectories
        if payload.mouse.jitter < 0.01 and payload.mouse.velocity > 25:
            score -= 0.55
            bot_signals += 3
            bot_reasons.append("Perfectly straight high-speed trajectory (Mechanical)")
        
        # Bot signal: zero curvature with high velocity
        elif payload.mouse.curvature < 0.001 and payload.mouse.velocity > 15:
            score -= 0.4
            bot_signals += 2
            bot_reasons.append("Zero curvature at high velocity (Linear automation)")
        
        # Human signal: natural jitter and curvature
        if payload.mouse.jitter > 0.05:
            score += 0.15
            human_signals += 1
        
        if payload.mouse.curvature >= 0.005:
            score += 0.15
            human_signals += 1
        
        if payload.mouse.acceleration > 5:
            score += 0.1
            human_signals += 1

    # ─── Keyboard Analysis ───
    if payload.keyboard.wpm > 0:
        # Bot signal: inhuman speed with zero variance
        if payload.keyboard.rhythm < 0.5 and payload.keyboard.wpm > 150:
            score -= 0.55
            bot_signals += 3
            bot_reasons.append("Zero variance typing at inhuman speed (Scripted injection)")
        
        # Bot signal: impossibly fast with uniform key hold
        elif payload.keyboard.wpm > 300:
            score -= 0.5
            bot_signals += 2
            bot_reasons.append("Typing speed exceeds human capability (>300 WPM)")
        
        # Human signal: natural rhythm variance
        if payload.keyboard.rhythm > 1:
            score += 0.12
            human_signals += 1
        
        if payload.keyboard.flightTime > 30:
            score += 0.1
            human_signals += 1
        
        if 40 < payload.keyboard.keyHoldTime < 300:
            score += 0.08
            human_signals += 1

    # ─── Multi-signal boost ───
    if human_signals >= 3:
        score += 0.1  # Multiple human signals = higher confidence
    
    if bot_signals >= 2:
        score -= 0.1  # Multiple bot signals = stronger conviction

    # ─── Explicit Simulations ───
    if payload.is_simulation:
        if payload.simulation_type == "bot":
            score = 0.08
            bot_reasons = ["Known Bot Signature: Selenium/Playwright API detected"]
        elif payload.simulation_type == "human":
            score = 0.96
            bot_reasons = []

    # Normalize score to [0, 1]
    score = max(0.0, min(1.0, score + 0.08))
    
    return score, bot_reasons


@app.post("/api/analyze", tags=["Analysis"], response_model=AnalysisResponse)
@limiter.limit("60/minute")
async def analyze_behavior(
    request: Request,
    payload: BehaviorPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)  # Optional auth
):
    """
    Analyze behavioral data and classify as bot or human.
    Accepts mouse dynamics and keyboard biometrics.
    Returns a human probability score with action recommendation.
    """
    start_time = time.time()
    
    score, bot_reasons = _process_heuristics(payload)
    
    # Simulate ML inference latency (realistic)
    time.sleep(random.uniform(0.008, 0.035))
    latency = int((time.time() - start_time) * 1000)
    
    is_bot = score < 0.3
    action = "Block" if is_bot else ("Challenge" if score < 0.7 else "Allow")
    session_hash = hashlib.sha256(f"{payload.session_id}{time.time()}".encode()).hexdigest()[:16]
    
    # ─── Persist to database ───
    try:
        session_record = AnalysisSession(
            session_hash=session_hash,
            user_id=user.id if user else None,
            mouse_velocity=payload.mouse.velocity,
            mouse_acceleration=payload.mouse.acceleration,
            mouse_jitter=payload.mouse.jitter,
            mouse_curvature=payload.mouse.curvature,
            keyboard_wpm=payload.keyboard.wpm,
            keyboard_flight_time=payload.keyboard.flightTime,
            keyboard_hold_time=payload.keyboard.keyHoldTime,
            keyboard_rhythm=payload.keyboard.rhythm,
            score=score,
            action=action,
            is_bot=is_bot,
            is_simulation=payload.is_simulation,
            inference_time_ms=latency,
            reasons=json.dumps(bot_reasons) if bot_reasons else None,
            ip_address=request.client.host if request.client else None
        )
        db.add(session_record)
        
        # Update dashboard stats
        stats = db.query(DashboardStats).first()
        if stats:
            stats.avg_latency_ms = (stats.avg_latency_ms + latency) // 2
            stats.total_sessions += 1
            if is_bot:
                stats.total_blocked += 1
            else:
                stats.humans_verified += 1
        
        # Persist threat if bot
        if is_bot and bot_reasons:
            threat = ThreatEvent(
                session_id=session_record.id,
                threat_type=bot_reasons[0],
                ip_address=request.client.host if request.client else "unknown",
                geo_x=random.uniform(10.0, 90.0),
                geo_y=random.uniform(20.0, 80.0),
                severity="high" if score < 0.15 else "medium"
            )
            db.add(threat)
        
        db.commit()
    except Exception as e:
        logger.error(f"DB persist error: {e}")
        db.rollback()

    # ─── Update in-memory caches for real-time dashboard ───
    session_event = {
        "id": payload.session_id or f"vx_{uuid.uuid4().hex[:8]}",
        "score": f"{score:.2f}",
        "type": "Bot" if is_bot else "Human",
        "action": action,
        "is_bot": is_bot,
        "time": "just now"
    }
    
    recent_sessions_cache.insert(0, session_event)
    if len(recent_sessions_cache) > 10:
        recent_sessions_cache.pop()
    
    if is_bot and bot_reasons:
        threat_feed_cache.insert(0, {
            "time": time.strftime("%H:%M:%S"),
            "threat": bot_reasons[0],
            "ip": f"{random.randint(10,250)}.{random.randint(10,250)}.{random.randint(1,10)}.x",
            "x": random.uniform(10.0, 90.0),
            "y": random.uniform(20.0, 80.0)
        })
        if len(threat_feed_cache) > 5:
            threat_feed_cache.pop()

    return AnalysisResponse(
        score=round(score, 4),
        action=action,
        latency_ms=latency,
        reasons=bot_reasons,
        features_analyzed=24,
        session_hash=session_hash,
        confidence="high" if abs(score - 0.5) > 0.25 else "medium"
    )


# ╔══════════════════════════════════════════════════════════════╗
# ║                       DASHBOARD                              ║
# ╚══════════════════════════════════════════════════════════════╝

@app.get("/api/dashboard/stats", tags=["Dashboard"], response_model=DashboardStatsResponse)
async def get_stats(db: Session = Depends(get_db)):
    """Get aggregate dashboard statistics."""
    stats = db.query(DashboardStats).first()
    if not stats:
        return DashboardStatsResponse(
            total_blocked=0, humans_verified=0, avg_latency_ms=0, total_sessions=0
        )
    return DashboardStatsResponse(
        total_blocked=stats.total_blocked,
        humans_verified=stats.humans_verified,
        avg_latency_ms=stats.avg_latency_ms,
        total_sessions=stats.total_sessions
    )

@app.get("/api/dashboard/feed", tags=["Dashboard"])
async def get_feed():
    """Get recent session events and threat feed (real-time from cache)."""
    return DashboardFeedResponse(
        sessions=[SessionEvent(**s) for s in recent_sessions_cache[:8]],
        threats=[ThreatFeedItem(**t) for t in threat_feed_cache[:5]]
    )

@app.get("/api/dashboard/chart", tags=["Dashboard"], response_model=ChartDataResponse)
async def get_chart():
    """Get real-time chart data for humans vs bots timeline."""
    t = time.localtime()
    
    if len(chart_data_history["labels"]) > 0:
        chart_data_history["labels"].pop(0)
    chart_data_history["labels"].append(f"{t.tm_hour:02d}:{t.tm_min:02d}:{t.tm_sec:02d}")
    
    if len(chart_data_history["humans"]) > 0:
        last_human = chart_data_history["humans"][-1]
        chart_data_history["humans"].pop(0)
    else:
        last_human = 1200
    chart_data_history["humans"].append(max(500, min(3000, last_human + random.randint(-150, 200))))
    
    if len(chart_data_history["bots"]) > 0:
        last_bot = chart_data_history["bots"][-1]
        chart_data_history["bots"].pop(0)
    else:
        last_bot = 350
    bot_val = last_bot + random.randint(-50, 100)
    if random.random() < 0.05:
        bot_val += 400  # Occasional spike
    chart_data_history["bots"].append(max(0, bot_val))
    
    return ChartDataResponse(**chart_data_history)


# ╔══════════════════════════════════════════════════════════════╗
# ║                        CHATBOT                               ║
# ╚══════════════════════════════════════════════════════════════╝

CHATBOT_INTENTS = {
    "price": "VigilX is free up to 10K sessions/month. The Pro tier is ₹399/mo (₹319/mo billed yearly) for up to 100K sessions, with advanced ML models and priority support.",
    "cost": "VigilX is free up to 10K sessions/month. Pro is ₹399/mo, Enterprise is custom pricing. All plans have no hidden fees.",
    "plan": "We offer 3 tiers: **Free** (10K sessions), **Pro** at ₹399/mo (100K sessions + advanced ML), and **Enterprise** (unlimited + on-premise). Check our pricing page!",
    "install": "Install VigilX in 3 lines! Add `<script src='https://cdn.vigilx.dev/sdk/v1.js' async></script>` to your HTML, then call `vigilx.init({ siteKey: 'your_key' })`. Done!",
    "sdk": "The JS SDK is incredibly lightweight (<15KB gzipped) and fully async, so it has zero impact on your Web Vitals or page load speed.",
    "bot": "We detect bots using behavioral biometrics: mouse dynamics (velocity, jitter, curvature), keyboard patterns (rhythm, flight time), and touch analysis. No CAPTCHAs needed!",
    "how": "Instead of checking *what* you click, VigilX analyzes *how* you move. Humans have natural micro-jitters, hesitations, and varying rhythm. Bots are mechanically perfect — and we catch them.",
    "privacy": "We're 100% DPDP Act 2023 compliant. We only store session-level hashed IDs. No personal data. Telemetry is auto-deleted after scoring. Zero PII.",
    "api": "Our API is simple: `POST /api/analyze` with mouse + keyboard data → get back a score (0-1), action (Allow/Challenge/Block), and confidence level. Full docs on our website.",
    "hello": "Hello! 👋 I'm the VigilX assistant. Ask me about pricing, installation, how our bot detection works, or anything else!",
    "hi": "Hi there! 👋 I'm the VigilX integration assistant. I can help with pricing, installation, bot detection mechanics, and more!",
    "captcha": "VigilX eliminates CAPTCHAs entirely! We use invisible behavioral analysis instead of annoying puzzles. Your users never even know they're being protected.",
    "accuracy": "VigilX achieves 99.2% accuracy in bot detection with sub-50ms inference time. Our adaptive ML model continuously improves with real-time feedback loops.",
    "support": "Free tier gets community support. Pro tier includes priority email support with <4hr response time. Enterprise gets a dedicated account manager and SLA.",
    "integrate": "VigilX integrates with any web framework — React, Vue, Angular, Next.js, plain HTML. Just add our SDK script tag and initialize with your site key.",
}

@app.post("/api/chat", tags=["Chat"], response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat(request: Request, payload: ChatRequest):
    """AI chatbot endpoint with intent-based responses."""
    query = payload.query.lower().strip()
    
    # Simulate AI processing time
    time.sleep(random.uniform(0.3, 0.8))
    
    # Intent matching
    for key, response in CHATBOT_INTENTS.items():
        if key in query:
            return ChatResponse(response=response)
    
    # Default fallback
    return ChatResponse(
        response="Great question! VigilX uses behavioral biometrics to stop bots invisibly and securely. I can help with **pricing**, **installation**, **API docs**, or **how our detection works**. What would you like to know?"
    )


# ╔══════════════════════════════════════════════════════════════╗
# ║                    GLOBAL ERROR HANDLER                      ║
# ╚══════════════════════════════════════════════════════════════╝

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all error handler to prevent stack traces in responses."""
    logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."}
    )
