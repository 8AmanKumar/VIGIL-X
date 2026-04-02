const VigilXTracker = (() => {
    let state = {
        mouse: {
            x: 0, y: 0,
            lastX: 0, lastY: 0,
            velocity: 0,
            acceleration: 0,
            jitter: 0,
            trajectory: [],
            curvature: 0
        },
        keyboard: {
            lastKeyTime: 0,
            keyHoldTime: 0,
            flightTime: 0,
            wpm: 0,
            keystrokes: 0,
            startTime: Date.now(),
            rhythm: 0,
            rhythmHistory: []
        }
    };

    const sessionId = 'vx_' + Math.random().toString(36).substring(2, 10);
    let lastMouseTime = Date.now();
    let lastVelocity = 0;
    
    // Listeners
    document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        const dt = Math.max(1, now - lastMouseTime);
        
        state.mouse.lastX = state.mouse.x;
        state.mouse.lastY = state.mouse.y;
        state.mouse.x = e.clientX;
        state.mouse.y = e.clientY;

        const dx = state.mouse.x - state.mouse.lastX;
        const dy = state.mouse.y - state.mouse.lastY;
        const distance = Math.sqrt(dx*dx + dy*dy);

        const currentVelocity = distance / dt;
        state.mouse.velocity = currentVelocity;
        state.mouse.acceleration = (currentVelocity - lastVelocity) / dt;
        state.mouse.jitter = Math.abs(state.mouse.acceleration) * 0.5;

        state.mouse.trajectory.push({x: state.mouse.x, y: state.mouse.y});
        if(state.mouse.trajectory.length > 10) state.mouse.trajectory.shift();

        if(state.mouse.trajectory.length === 10) {
            const start = state.mouse.trajectory[0];
            const end = state.mouse.trajectory[9];
            const straightDist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            let pathDist = 0;
            for(let i=1; i<10; i++) {
                const p1 = state.mouse.trajectory[i-1];
                const p2 = state.mouse.trajectory[i];
                pathDist += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
            }
            state.mouse.curvature = straightDist > 0 ? (pathDist / straightDist) - 1 : 0;
        }

        lastVelocity = currentVelocity;
        lastMouseTime = now;
    });

    const keydowns = {};
    document.addEventListener('keydown', (e) => {
        const now = Date.now();
        if(!keydowns[e.key]) {
            keydowns[e.key] = now;
            if(state.keyboard.lastKeyTime > 0) {
                state.keyboard.flightTime = now - state.keyboard.lastKeyTime;
            }
            state.keyboard.keystrokes++;
        }
    });

    document.addEventListener('keyup', (e) => {
        const now = Date.now();
        if(keydowns[e.key]) {
            const hold = now - keydowns[e.key];
            state.keyboard.keyHoldTime = hold;
            state.keyboard.rhythmHistory.push(hold);
            if(state.keyboard.rhythmHistory.length > 8) state.keyboard.rhythmHistory.shift();
            
            const avgHold = state.keyboard.rhythmHistory.reduce((a,b)=>a+b, 0) / state.keyboard.rhythmHistory.length;
            const variance = state.keyboard.rhythmHistory.reduce((a,b)=>a+Math.pow(b-avgHold, 2), 0) / state.keyboard.rhythmHistory.length;
            state.keyboard.rhythm = Math.sqrt(variance);

            delete keydowns[e.key];
        }
        state.keyboard.lastKeyTime = now;
        
        const elapsedMin = (now - state.keyboard.startTime) / 60000;
        if(elapsedMin > 0) {
            state.keyboard.wpm = Math.max(0, Math.round((state.keyboard.keystrokes / 5) / elapsedMin));
        }
    });

    setInterval(() => {
        const now = Date.now();
        if (now - lastMouseTime > 150) {
            state.mouse.velocity *= 0.5;
            state.mouse.acceleration *= 0.5;
            state.mouse.jitter *= 0.8;
            state.mouse.curvature *= 0.9;
        }
        if (now - state.keyboard.lastKeyTime > 3000) {
            state.keyboard.startTime = now;
            state.keyboard.keystrokes = 0;
            state.keyboard.wpm = Math.max(0, state.keyboard.wpm - 5);
        }
    }, 100);

    // Communicate with backend backend
    let analysisCallback = null;

    async function sendPayload(overridePayload = null) {
        const payload = overridePayload || {
            session_id: sessionId,
            mouse: {
                velocity: state.mouse.velocity,
                acceleration: state.mouse.acceleration,
                jitter: state.mouse.jitter,
                curvature: state.mouse.curvature
            },
            keyboard: {
                wpm: state.keyboard.wpm,
                flightTime: state.keyboard.flightTime,
                keyHoldTime: state.keyboard.keyHoldTime,
                rhythm: state.keyboard.rhythm
            },
            is_simulation: false,
            simulation_type: ""
        };

        try {
            const response = await fetch(`${window.VIGILX_CONFIG.apiUrl}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (analysisCallback) analysisCallback(data);
        } catch (e) {
            console.error("Backend error", e);
        }
    }

    // Ping backend every 1.5 seconds if active
    setInterval(() => {
        const isActive = state.mouse.velocity > 0.1 || (state.keyboard.flightTime > 0 && (Date.now() - state.keyboard.lastKeyTime < 3000));
        if (isActive) {
            sendPayload();
        }
    }, 1500);

    return {
        getState: () => state,
        onAnalysis: (cb) => { analysisCallback = cb; },
        simulateBotAttack: () => sendPayload({
            session_id: sessionId + "_bot",
            mouse: { velocity: 50.0, acceleration: 100.0, jitter: 0.0, curvature: 0.0 },
            keyboard: { wpm: 500, flightTime: 10, keyHoldTime: 10, rhythm: 0.0 },
            is_simulation: True, // Python True wait JS boolean
            simulation_type: "bot"
        }),
        triggerSimulation: (type) => sendPayload({
            session_id: sessionId + "_" + type,
            mouse: { velocity: 0, acceleration: 0, jitter: 0, curvature: 0 },
            keyboard: { wpm: 0, flightTime: 0, keyHoldTime: 0, rhythm: 0 },
            is_simulation: true,
            simulation_type: type
        })
    };
})();
window.VigilXTracker = VigilXTracker;
