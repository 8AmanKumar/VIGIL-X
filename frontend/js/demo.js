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
    let lastInteractionTime = 0;
    let hasReceivedBackendScore = false;
    let mouseDataCount = 0;
    let keyDataCount = 0;
    
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
        if (type === 'feed-info') div.style.color = '#00b4d8';
        
        feedItems.insertBefore(div, feedItems.firstChild);
        if(feedItems.children.length > 5) {
            feedItems.removeChild(feedItems.lastChild);
        }
    }

    // ─────── Local Heuristic Scoring ───────
    // Calculates a human score locally so the ring updates in real-time
    // even without backend connectivity. Backend score overrides when available.
    function computeLocalScore(state) {
        let score = 0.50;
        let signals = 0;

        // Mouse signals
        if (state.mouse.velocity > 0.1) {
            // Natural jitter = human
            if (state.mouse.jitter > 0.03) {
                score += 0.12;
                signals++;
            }
            // Natural curvature = human
            if (state.mouse.curvature > 0.003) {
                score += 0.12;
                signals++;
            }
            // Varied acceleration = human
            if (state.mouse.acceleration > 2 && state.mouse.acceleration < 100) {
                score += 0.08;
                signals++;
            }
            // Moderate velocity = human (not too fast, not zero)
            if (state.mouse.velocity > 0.5 && state.mouse.velocity < 20) {
                score += 0.06;
                signals++;
            }
        }

        // Keyboard signals
        if (state.keyboard.wpm > 0) {
            // Natural rhythm variance = human
            if (state.keyboard.rhythm > 1) {
                score += 0.10;
                signals++;
            }
            // Reasonable typing speed
            if (state.keyboard.wpm > 10 && state.keyboard.wpm < 150) {
                score += 0.08;
                signals++;
            }
            // Natural flight time
            if (state.keyboard.flightTime > 30 && state.keyboard.flightTime < 1000) {
                score += 0.06;
                signals++;
            }
            // Natural key hold
            if (state.keyboard.keyHoldTime > 40 && state.keyboard.keyHoldTime < 300) {
                score += 0.06;
                signals++;
            }
        }

        // Multi-signal confidence boost
        if (signals >= 4) score += 0.08;
        if (signals >= 6) score += 0.06;

        return Math.max(0.0, Math.min(1.0, score));
    }

    // Backend Webhook Hooking
    if (window.VigilXTracker) {
        window.VigilXTracker.onAnalysis((data) => {
            hasReceivedBackendScore = true;
            targetScore = data.score;
            isBotBlocked = data.action === "Block";
            if(data.reasons && data.reasons.length > 0) {
                createFeedItem('feed-danger', `🤖 ${data.reasons[0]}`);
            } else if (data.action === "Allow") {
                createFeedItem('feed-success', `✅ Human validated (Latency: ${data.latency_ms}ms, Score: ${data.score.toFixed(2)})`);
            } else {
                createFeedItem('feed-warn', `⚠️ Suspicious activity (Score: ${data.score.toFixed(2)})`);
            }
        });
    }

    // Simulation Buttons
    const btnBot = document.getElementById('btnSimulateBot');
    const btnHuman = document.getElementById('btnSimulateHuman');

    if (btnBot) {
        btnBot.addEventListener('click', () => {
            createFeedItem('feed-warn', '🎯 Injecting malicious synthetic payload...');
            
            isBotBlocked = true;
            targetScore = 0.08;
            hasReceivedBackendScore = true;

            for(let i=0; i<24; i++) {
                featureBars.children[i].style.height = (80 + Math.random() * 20) + '%';
                featureBars.children[i].style.backgroundColor = 'rgba(255, 77, 77, 0.8)';
            }
            
            if(ctx) {
                ctx.clearRect(0,0,width,height);
                ctx.beginPath();
                ctx.moveTo(0, height/2);
                ctx.lineTo(width, height/2);
                ctx.strokeStyle = '#ff4d4d';
                ctx.lineWidth = 4;
                ctx.stroke();
            }

            if (window.VigilXTracker) {
                window.VigilXTracker.triggerSimulation("bot");
            }
            
            setTimeout(() => {
                createFeedItem('feed-danger', '🤖 Bot signature detected: Selenium/Playwright API');
            }, 500);
        });
    }

    if (btnHuman) {
        btnHuman.addEventListener('click', () => {
            createFeedItem('feed-info', '👤 Simulating benign human variance...');
            
            isBotBlocked = false;
            targetScore = 0.96;
            hasReceivedBackendScore = true;

            for(let i=0; i<24; i++) {
                featureBars.children[i].style.height = (20 + Math.random() * 60) + '%';
                featureBars.children[i].style.backgroundColor = 'rgba(0, 255, 136, 0.5)';
            }

            if (window.VigilXTracker) {
                window.VigilXTracker.triggerSimulation("human");
            }

            setTimeout(() => {
                createFeedItem('feed-success', '✅ Human verified — natural behavioral patterns confirmed');
            }, 500);
        });
    }

    // ─────── Main Render Loop ───────
    let feedCooldown = 0;

    function renderLoop() {
        const state = window.VigilXTracker ? window.VigilXTracker.getState() : null;
        
        if (!state) return requestAnimationFrame(renderLoop);

        // Update metric displays
        if(metricVelocity) metricVelocity.innerText = formatNumber(state.mouse.velocity, 2);
        if(metricJitter) metricJitter.innerText = formatNumber(state.mouse.jitter, 2);
        if(metricCurvature) metricCurvature.innerText = formatNumber(state.mouse.curvature, 2);
        if(metricAccel) metricAccel.innerText = formatNumber(state.mouse.acceleration, 2);

        if(metricKeyHold) metricKeyHold.innerText = formatNumber(state.keyboard.keyHoldTime, 0) + 'ms';
        if(metricFlight) metricFlight.innerText = formatNumber(state.keyboard.flightTime, 0) + 'ms';
        if(metricWPM) metricWPM.innerText = state.keyboard.wpm;
        if(metricRhythm) metricRhythm.innerText = formatNumber(state.keyboard.rhythm, 2);

        // Track interaction
        let isActive = state.mouse.velocity > 0.1 || (state.keyboard.flightTime > 0 && (Date.now() - state.keyboard.lastKeyTime < 2000));
        
        if (isActive) {
            lastInteractionTime = Date.now();
            
            // Count data points for activity-based feed messages
            if (state.mouse.velocity > 0.1) mouseDataCount++;
            if (state.keyboard.wpm > 0) keyDataCount++;
        }

        // ─── Local score computation when no backend response ───
        if (!hasReceivedBackendScore && isActive) {
            const localScore = computeLocalScore(state);
            targetScore = localScore;
            
            // Activity-based feed items
            feedCooldown--;
            if (feedCooldown <= 0) {
                if (mouseDataCount > 30) {
                    createFeedItem('feed-info', `📡 Mouse data collected (${mouseDataCount} events) — analyzing patterns...`);
                    mouseDataCount = 0;
                    feedCooldown = 120;
                }
                if (keyDataCount > 10) {
                    createFeedItem('feed-info', `⌨️ Keystroke biometrics captured — rhythm analysis active`);
                    keyDataCount = 0;
                    feedCooldown = 120;
                }
            }
        }

        // Render natural trail if not blocked
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
                    ctx.lineTo(trail[i].x, trail[i].y);
                }
                const lastV = trail[trail.length-1].v;
                const scoreColor = currentScore > 0.7 ? '0, 255, 136' : currentScore > 0.3 ? '247, 223, 30' : '255, 77, 77';
                ctx.strokeStyle = `rgba(${scoreColor}, ${Math.min(1, Math.max(0.2, lastV/10))})`;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }

        // Feature Bar natural variance
        if (isActive && featureBars && featureBars.children.length === 24 && !isBotBlocked) {
            for(let i=0; i<24; i++) {
                if(Math.random() < 0.2) {
                    let h = 10 + Math.random() * 70;
                    featureBars.children[i].style.height = `${h}%`;
                    const barColor = currentScore > 0.7 ? `rgba(0, 255, 136, ${h/100})` : 
                                     currentScore > 0.3 ? `rgba(247, 223, 30, ${h/100})` :
                                     `rgba(255, 77, 77, ${h/100})`;
                    featureBars.children[i].style.backgroundColor = barColor;
                }
            }
        }

        // ─── Score Ring Animation ───
        currentScore += (targetScore - currentScore) * 0.08; // Smooth interpolation
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
                if(scoreVerdict) scoreVerdict.innerHTML = '<span class="verdict-icon">⚠️</span><span class="verdict-text" style="color:#f7df1e">Analyzing...</span>';
            } else {
                scoreRingProgress.style.stroke = '#ff4d4d';
                if(scoreVerdict) scoreVerdict.innerHTML = '<span class="verdict-icon">🤖</span><span class="verdict-text" style="color:#ff4d4d">Bot Blocked</span>';
            }
        }

        requestAnimationFrame(renderLoop);
    }
    
    requestAnimationFrame(renderLoop);
});
