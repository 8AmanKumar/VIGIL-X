// VigilX Behavioral Tracker - Injected into webpages
const API_URL = "http://localhost:8000";
const SESSION_ID = "ext_" + Math.random().toString(36).substring(2, 10);

let mouseData = { velocity: 0, acceleration: 0, jitter: 0, curvature: 0, samples: [] };
let keyboardData = { wpm: 0, rhythm: 0, flightTime: 0, keyHoldTime: 0, strokes: [] };
let lastMouseTime = Date.now();
let lastMouseX = -1, lastMouseY = -1;

console.log('🛡️ VigilX Guard Active on this page.');

// Simulate tracking
window.addEventListener('mousemove', (e) => {
  const now = Date.now();
  const dt = now - lastMouseTime;
  if (dt > 10 && lastMouseX !== -1) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const vel = dist / dt;
    
    mouseData.samples.push(vel);
    if (mouseData.samples.length > 20) mouseData.samples.shift();
    
    mouseData.velocity = mouseData.samples.reduce((a,b)=>a+b,0)/mouseData.samples.length;
    // rough jitter
    mouseData.jitter = Math.random() * 0.1; 
  }
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  lastMouseTime = now;
});

// Send heartbeat to evaluate
setInterval(() => {
  if (mouseData.samples.length > 5) {
    sendAnalysis();
  }
}, 5000);

async function sendAnalysis() {
  try {
    const payload = {
      session_id: SESSION_ID,
      mouse: {
        velocity: mouseData.velocity,
        acceleration: 5.2,
        jitter: mouseData.jitter,
        curvature: 0.05
      },
      keyboard: {
        wpm: keyboardData.wpm,
        rhythm: keyboardData.rhythm,
        flightTime: 50,
        keyHoldTime: 80
      },
      touch: { area: 0, pressure: 0, velocity: 0 },
      is_simulation: false
    };

    const res = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.action === 'Block') {
        injectWarningBanner(data.reasons);
        
        // Notify Background Script
        chrome.runtime.sendMessage({ type: 'THREAT_DETECTED' });
      }
    }
  } catch (err) {
    // Backend offline, ignore
  }
}

// ============================================
// HACKATHON DEMO MODE: Press Ctrl+B to simulate
// a sudden mechanical Bot Attack.
// ============================================
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'b') {
    simulateBotAttack();
  }
});

async function simulateBotAttack() {
  console.log("⚠️ SIMULATING BOT ATTACK...");
  try {
    const payload = {
      session_id: SESSION_ID,
      mouse: { velocity: 0, acceleration: 0, jitter: 0, curvature: 0 },
      keyboard: { wpm: 0, rhythm: 0, flightTime: 0, keyHoldTime: 0 },
      touch: { area: 0, pressure: 0, velocity: 0 },
      is_simulation: true,
      simulation_type: "bot"
    };

    const res = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.action === 'Block') {
        injectWarningBanner(data.reasons);
        chrome.runtime.sendMessage({ type: 'THREAT_DETECTED' });
      }
    }
  } catch (err) {
    console.error("Backend must be running to analyze threats.", err);
  }
}

function injectWarningBanner(reasons) {
  // Prevent duplicate banners
  if (document.getElementById('vigilx-warning-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'vigilx-warning-banner';
  
  Object.assign(banner.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    zIndex: '999999',
    background: 'rgba(239, 68, 68, 0.95)', // red
    color: 'white',
    padding: '16px',
    boxShadow: '0 4px 30px rgba(239, 68, 68, 0.5)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    fontFamily: 'system-ui, sans-serif',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  });

  banner.innerHTML = `
    <div>
      <h2 style="margin:0; font-size:16px;">⚠️ VIGILX SECURITY ALERT</h2>
      <p style="margin:4px 0 0 0; font-size:13px; opacity: 0.9;">
        Suspicious automated behavior detected. ${reasons ? reasons.join(' ') : ''}
      </p>
    </div>
    <button style="background: rgba(0,0,0,0.5); color: white; border: none; padding: 8px 16px; cursor: pointer; border-radius: 4px;">Dismiss</button>
  `;

  banner.querySelector('button').onclick = () => banner.remove();
  document.body.prepend(banner);
}
