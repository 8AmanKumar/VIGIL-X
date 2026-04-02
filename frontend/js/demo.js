document.addEventListener('DOMContentLoaded', () => {
    const mouseCanvas = document.getElementById('mouseCanvas');
    const mouseGhost = document.getElementById('mouseGhost');
    const trackArea = document.getElementById('mouseTrackArea');

    const ctx = mouseCanvas ? mouseCanvas.getContext('2d') : null;
    let width = trackArea ? trackArea.clientWidth : 0;
    let height = trackArea ? trackArea.clientHeight : 0;
    if (mouseCanvas) {
        mouseCanvas.width = width;
        mouseCanvas.height = height;
    }

    if (trackArea) {
        window.addEventListener('resize', () => {
            width = trackArea.clientWidth;
            height = trackArea.clientHeight;
            mouseCanvas.width = width;
            mouseCanvas.height = height;
        });
    }

    const metricVelocity = document.getElementById('metricVelocity');
    const metricJitter = document.getElementById('metricJitter');
    const metricCurvature = document.getElementById('metricCurvature');
    const metricAccel = document.getElementById('metricAccel');
    
    const metricKeyHold = document.getElementById('metricKeyHold');
    const metricFlight = document.getElementById('metricFlight');
    const metricWPM = document.getElementById('metricWPM');
    const metricRhythm = document.getElementById('metricRhythm');

    const demoScore = document.getElementById('demoScore');
    const scoreRingProgress = document.getElementById('scoreRingProgress');
    const scoreVerdict = document.getElementById('scoreVerdict');
    const feedItems = document.getElementById('feedItems');
    const featureBars = document.getElementById('featureBars');

    if(featureBars) {
        for(let i=0; i<24; i++) {
            const bar = document.createElement('div');
            bar.className = 'feature-bar';
            bar.style.height = '10%';
            bar.style.width = 'calc(100% / 24 - 2px)';
            bar.style.backgroundColor = 'rgba(0, 255, 136, 0.2)';
            bar.style.transition = 'height 0.2s, background-color 0.2s';
            bar.style.borderRadius = '2px';
            featureBars.appendChild(bar);
        }
        featureBars.style.display = 'flex';
        featureBars.style.alignItems = 'flex-end';
        featureBars.style.gap = '2px';
        featureBars.style.height = '120px';
    }

    let trail = [];
    let currentScore = 0.50; 
    let targetScore = 0.50;
    let isBotBlocked = false;
    
    function getLocalMousePos(canvas, globalX, globalY) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: globalX - rect.left,
            y: globalY - rect.top
        };
    }

    function formatNumber(num, decimals) {
        if(isNaN(num) || !isFinite(num)) return (0).toFixed(decimals);
        return num.toFixed(decimals);
    }

    function createFeedItem(type, msg) {
        if(!feedItems) return;
        const div = document.createElement('div');
        div.className = `feed-item ${type}`;
        div.innerHTML = `<span class="feed-time">now</span><span class="feed-msg">${msg}</span>`;
        if (type === 'feed-success') div.style.color = '#00ff88';
        if (type === 'feed-warn') div.style.color = '#f7df1e';
        if (type === 'feed-danger') div.style.color = '#ff4d4d';
        
        feedItems.insertBefore(div, feedItems.firstChild);
        if(feedItems.children.length > 5) {
            feedItems.removeChild(feedItems.lastChild);
        }
    }

    // Backend Webhook Hooking
    if (window.VigilXTracker) {
        window.VigilXTracker.onAnalysis((data) => {
            targetScore = data.score;
            isBotBlocked = data.action === "Block";
            if(data.reasons && data.reasons.length > 0) {
                createFeedItem('feed-danger', data.reasons[0]);
            } else {
                createFeedItem('feed-success', `Human validated natively (Latency: ${data.latency_ms}ms)`);
            }
        });
    }

    // Simulation Buttons
    const btnBot = document.getElementById('btnSimulateBot');
    const btnHuman = document.getElementById('btnSimulateHuman');

    if (btnBot && window.VigilXTracker) {
        btnBot.addEventListener('click', () => {
            createFeedItem('feed-warn', 'Injecting malicious synthetic payload...');
            
            // Visual flair for bot injection
            isBotBlocked = true;
            for(let i=0; i<24; i++) {
                featureBars.children[i].style.height = (80 + Math.random() * 20) + '%';
                featureBars.children[i].style.backgroundColor = 'rgba(255, 77, 77, 0.8)';
            }
            
            // Draw a straight red line across the canvas
            if(ctx) {
                ctx.clearRect(0,0,width,height);
                ctx.beginPath();
                ctx.moveTo(0, height/2);
                ctx.lineTo(width, height/2);
                ctx.strokeStyle = '#ff4d4d';
                ctx.lineWidth = 4;
                ctx.stroke();
            }

            window.VigilXTracker.triggerSimulation("bot");
        });
    }

    if (btnHuman && window.VigilXTracker) {
        btnHuman.addEventListener('click', () => {
            createFeedItem('feed-info', 'Simulating benign human variance...');
            
            isBotBlocked = false;
            for(let i=0; i<24; i++) {
                featureBars.children[i].style.height = (20 + Math.random() * 60) + '%';
                featureBars.children[i].style.backgroundColor = 'rgba(0, 255, 136, 0.5)';
            }
            window.VigilXTracker.triggerSimulation("human");
        });
    }

    function renderLoop() {
        if (!window.VigilXTracker) return requestAnimationFrame(renderLoop);
        
        const state = window.VigilXTracker.getState();
        
        if(metricVelocity) metricVelocity.innerText = formatNumber(state.mouse.velocity, 2);
        if(metricJitter) metricJitter.innerText = formatNumber(state.mouse.jitter, 2);
        if(metricCurvature) metricCurvature.innerText = formatNumber(state.mouse.curvature, 2);
        if(metricAccel) metricAccel.innerText = formatNumber(state.mouse.acceleration, 2);

        if(metricKeyHold) metricKeyHold.innerText = formatNumber(state.keyboard.keyHoldTime, 0) + 'ms';
        if(metricFlight) metricFlight.innerText = formatNumber(state.keyboard.flightTime, 0) + 'ms';
        if(metricWPM) metricWPM.innerText = state.keyboard.wpm;
        if(metricRhythm) metricRhythm.innerText = formatNumber(state.keyboard.rhythm, 2);

        // Render natural trail if not blocked intensely
        if (!isBotBlocked && ctx) {
            const localPos = getLocalMousePos(mouseCanvas, state.mouse.x, state.mouse.y);
            
            if (localPos.x >= 0 && localPos.x <= width && localPos.y >= 0 && localPos.y <= height && state.mouse.velocity > 0) {
                trail.push({x: localPos.x, y: localPos.y, v: state.mouse.velocity});
                if(mouseGhost) {
                    mouseGhost.style.left = localPos.x + 'px';
                    mouseGhost.style.top = localPos.y + 'px';
                    mouseGhost.style.display = 'block';
                }
            } else {
                if(mouseGhost) mouseGhost.style.display = 'none';
            }

            if(trail.length > 40) trail.shift();

            ctx.clearRect(0, 0, width, height);
            if(trail.length > 1) {
                ctx.beginPath();
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.moveTo(trail[0].x, trail[0].y);
                for(let i=1; i<trail.length; i++) {
                    const p1 = trail[i];
                    ctx.lineTo(p1.x, p1.y);
                }
                const lastV = trail[trail.length-1].v;
                ctx.strokeStyle = `rgba(0, 255, 136, ${Math.min(1, Math.max(0.2, lastV/10))})`;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }

        // Feature Bar natural variance
        let isActive = state.mouse.velocity > 0.1 || (state.keyboard.flightTime > 0 && (Date.now() - state.keyboard.lastKeyTime < 2000));
        if (isActive && featureBars && featureBars.children.length === 24 && !isBotBlocked) {
            for(let i=0; i<24; i++) {
                if(Math.random() < 0.2) {
                    let h = 10 + Math.random() * 70;
                    featureBars.children[i].style.height = `${h}%`;
                    featureBars.children[i].style.backgroundColor = `rgba(0, 255, 136, ${h/100})`;
                }
            }
        }

        // Score Sync
        currentScore += (targetScore - currentScore) * 0.1; // Smooth interpolate
        if(demoScore) demoScore.innerText = currentScore.toFixed(2);
        
        if(scoreRingProgress) {
            const maxOffset = 534;
            const progress = maxOffset - (currentScore * maxOffset);
            scoreRingProgress.style.strokeDashoffset = progress;

            if(currentScore > 0.7) {
                scoreRingProgress.style.stroke = 'url(#demoRingGrad)';
                if(scoreVerdict) scoreVerdict.innerHTML = '<span class="verdict-icon">✅</span><span class="verdict-text" style="color:#00ff88">Verified Human</span>';
            } else if(currentScore > 0.3) {
                scoreRingProgress.style.stroke = '#f7df1e';
                if(scoreVerdict) scoreVerdict.innerHTML = '<span class="verdict-icon">⚠️</span><span class="verdict-text" style="color:#f7df1e">Checking...</span>';
            } else {
                scoreRingProgress.style.stroke = '#ff4d4d';
                if(scoreVerdict) scoreVerdict.innerHTML = '<span class="verdict-icon">🤖</span><span class="verdict-text" style="color:#ff4d4d">Bot Blocked</span>';
            }
        }

        requestAnimationFrame(renderLoop);
    }
    
    requestAnimationFrame(renderLoop);
});
