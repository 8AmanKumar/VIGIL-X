"""
VigilX Pydantic Models
Request/Response schemas with full validation.
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime


# ─────────────────── Auth Schemas ───────────────────

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=255)

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6, max_length=255)
    
    @validator("email")
    def validate_email(cls, v):
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email format")
        return v.lower().strip()
    
    @validator("name")
    def validate_name(cls, v):
        return v.strip()

class GoogleAuthRequest(BaseModel):
    token: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    name: str = Field(..., min_length=1)
    avatar_url: Optional[str] = None

class AuthResponse(BaseModel):
    success: bool = True
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserProfile"

class RefreshRequest(BaseModel):
    refresh_token: str

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    role: str
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None
    
    class Config:
        from_attributes = True


# ─────────────────── Behavior Analysis Schemas ───────────────────

class MouseData(BaseModel):
    velocity: float = Field(default=0.0, ge=0)
    acceleration: float = Field(default=0.0)
    jitter: float = Field(default=0.0, ge=0)
    curvature: float = Field(default=0.0, ge=0)

class KeyboardData(BaseModel):
    wpm: int = Field(default=0, ge=0)
    flightTime: int = Field(default=0, ge=0)
    keyHoldTime: int = Field(default=0, ge=0)
    rhythm: float = Field(default=0.0, ge=0)

class BehaviorPayload(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=100)
    mouse: MouseData
    keyboard: KeyboardData
    is_simulation: bool = False
    simulation_type: str = ""

class AnalysisResponse(BaseModel):
    score: float
    action: str
    latency_ms: int
    reasons: List[str] = []
    features_analyzed: int = 24
    session_hash: str = ""
    confidence: str = "high"


# ─────────────────── Dashboard Schemas ───────────────────

class DashboardStatsResponse(BaseModel):
    total_blocked: int
    humans_verified: int
    avg_latency_ms: int
    total_sessions: int

class SessionEvent(BaseModel):
    id: str
    score: str
    type: str
    action: str
    is_bot: bool
    time: str

class ThreatFeedItem(BaseModel):
    time: str
    threat: str
    ip: str
    x: float
    y: float

class DashboardFeedResponse(BaseModel):
    sessions: List[SessionEvent]
    threats: List[ThreatFeedItem]

class ChartDataResponse(BaseModel):
    labels: List[str]
    humans: List[int]
    bots: List[int]


# ─────────────────── Chat Schema ───────────────────

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)

class ChatResponse(BaseModel):
    response: str


# ─────────────────── Health Check ───────────────────

class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str = "2.0.0"
    uptime_seconds: float
    database: str = "connected"


# Update forward references
AuthResponse.model_rebuild()
