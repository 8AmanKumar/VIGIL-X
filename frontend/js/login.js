document.addEventListener('DOMContentLoaded', () => {
    // ─────────────────── 3D Login Scene ───────────────────
    const loginCanvas = document.getElementById('loginCanvas');
    
    if (loginCanvas && typeof THREE !== 'undefined') {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: loginCanvas, alpha: true, antialias: true });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Shield geometry (icosahedron for a futuristic shield look)
        const shieldGeo = new THREE.IcosahedronGeometry(3, 1);
        const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            wireframe: true,
            transparent: true,
            opacity: 0.15
        });
        const shield = new THREE.Mesh(shieldGeo, shieldMat);
        scene.add(shield);

        // Inner shield glow
        const innerGeo = new THREE.IcosahedronGeometry(2.5, 1);
        const innerMat = new THREE.MeshBasicMaterial({
            color: 0x00b4d8,
            wireframe: true,
            transparent: true,
            opacity: 0.08
        });
        const innerShield = new THREE.Mesh(innerGeo, innerMat);
        scene.add(innerShield);

        // Orbiting particles
        const particleCount = 300;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            const radius = 5 + Math.random() * 12;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = radius * Math.cos(phi);

            const colorChoice = Math.random();
            if (colorChoice > 0.5) {
                colors[i] = 0; colors[i + 1] = 1; colors[i + 2] = 0.53; // green
            } else {
                colors[i] = 0; colors[i + 1] = 0.7; colors[i + 2] = 0.85; // cyan
            }
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleMat = new THREE.PointsMaterial({
            size: 0.03,
            vertexColors: true,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);

        camera.position.z = 8;

        let mouseX = 0, mouseY = 0;
        let targetMouseX = 0, targetMouseY = 0;

        document.addEventListener('mousemove', (e) => {
            targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
            targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        const clock = new THREE.Clock();

        function animateLogin() {
            requestAnimationFrame(animateLogin);
            const elapsed = clock.getElapsedTime();

            mouseX += (targetMouseX - mouseX) * 0.03;
            mouseY += (targetMouseY - mouseY) * 0.03;

            shield.rotation.y = elapsed * 0.15 + mouseX * 0.3;
            shield.rotation.x = elapsed * 0.08 + mouseY * 0.3;
            shield.rotation.z = Math.sin(elapsed * 0.3) * 0.1;

            innerShield.rotation.y = -elapsed * 0.1 + mouseX * 0.2;
            innerShield.rotation.x = -elapsed * 0.06 + mouseY * 0.2;

            particles.rotation.y = elapsed * 0.02;
            particles.rotation.x = elapsed * 0.01;

            // Pulsing shield scale
            const pulse = 1 + Math.sin(elapsed * 1.5) * 0.03;
            shield.scale.set(pulse, pulse, pulse);

            renderer.render(scene, camera);
        }

        animateLogin();

        window.addEventListener('resize', () => {
            if (window.innerWidth === 0) return;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // ─────────────────── Auth Tab Switching ───────────────────
    const tabs = document.querySelectorAll('.auth-tab');
    const panels = document.querySelectorAll('.auth-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            panels.forEach(p => {
                p.classList.remove('active');
                if (p.id === target) {
                    p.classList.add('active');
                }
            });

            // Clear errors
            document.querySelectorAll('.auth-error').forEach(e => e.style.display = 'none');
        });
    });

    // ─────────────────── Login Form ───────────────────
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const btn = loginForm.querySelector('.login-submit-btn');

            btn.classList.add('loading');
            btn.innerText = 'Authenticating...';
            loginError.style.display = 'none';

            try {
                const res = await fetch(`${window.VIGILX_CONFIG.apiUrl}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (res.ok) {
                    const data = await res.json();
                    btn.innerText = '✓ Welcome back';
                    btn.style.background = 'rgba(0, 255, 136, 0.3)';
                    
                    // Store auth data
                    localStorage.setItem('vx_auth', 'true');
                    localStorage.setItem('vx_token', data.access_token);
                    localStorage.setItem('vx_refresh', data.refresh_token);
                    localStorage.setItem('vx_user', JSON.stringify(data.user));

                    setTimeout(() => {
                        const homeLink = document.querySelector('.nav-link[data-page="home"]');
                        if (homeLink) homeLink.click();
                        btn.innerText = 'Sign In';
                        btn.style.background = '';
                        btn.classList.remove('loading');
                        loginForm.reset();
                    }, 1000);
                } else {
                    const errData = await res.json();
                    loginError.innerText = errData.detail || 'Authentication failed';
                    loginError.style.display = 'block';
                    btn.innerText = 'Sign In';
                    btn.classList.remove('loading');
                }
            } catch (err) {
                loginError.innerText = 'Cannot reach server. Try again later.';
                loginError.style.display = 'block';
                btn.innerText = 'Sign In';
                btn.classList.remove('loading');
            }
        });
    }

    // ─────────────────── Register Form ───────────────────
    const registerForm = document.getElementById('registerForm');
    const registerError = document.getElementById('registerError');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const btn = registerForm.querySelector('.login-submit-btn');

            // Client-side validation
            if (password.length < 6) {
                registerError.innerText = 'Password must be at least 6 characters';
                registerError.style.display = 'block';
                return;
            }

            btn.classList.add('loading');
            btn.innerText = 'Creating account...';
            registerError.style.display = 'none';

            try {
                const res = await fetch(`${window.VIGILX_CONFIG.apiUrl}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                if (res.ok) {
                    const data = await res.json();
                    btn.innerText = '✓ Account created!';
                    btn.style.background = 'rgba(0, 255, 136, 0.3)';

                    localStorage.setItem('vx_auth', 'true');
                    localStorage.setItem('vx_token', data.access_token);
                    localStorage.setItem('vx_refresh', data.refresh_token);
                    localStorage.setItem('vx_user', JSON.stringify(data.user));

                    setTimeout(() => {
                        const homeLink = document.querySelector('.nav-link[data-page="home"]');
                        if (homeLink) homeLink.click();
                        btn.innerText = 'Create Account';
                        btn.style.background = '';
                        btn.classList.remove('loading');
                        registerForm.reset();
                    }, 1000);
                } else {
                    const errData = await res.json();
                    registerError.innerText = errData.detail || 'Registration failed';
                    registerError.style.display = 'block';
                    btn.innerText = 'Create Account';
                    btn.classList.remove('loading');
                }
            } catch (err) {
                registerError.innerText = 'Cannot reach server. Try again later.';
                registerError.style.display = 'block';
                btn.innerText = 'Create Account';
                btn.classList.remove('loading');
            }
        });
    }

    // ─────────────────── Google Sign-In (Mock OAuth) ───────────────────
    const googleBtns = document.querySelectorAll('.google-btn');
    
    googleBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.innerText = 'Connecting to Google...';
            btn.style.pointerEvents = 'none';
            
            // Simulate Google OAuth popup delay
            await new Promise(r => setTimeout(r, 1200));
            
            try {
                const mockGoogleUser = {
                    token: 'google_mock_' + Math.random().toString(36).substring(2),
                    email: 'user@gmail.com',
                    name: 'Google User',
                    avatar_url: null
                };

                const res = await fetch(`${window.VIGILX_CONFIG.apiUrl}/api/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mockGoogleUser)
                });

                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem('vx_auth', 'true');
                    localStorage.setItem('vx_token', data.access_token);
                    localStorage.setItem('vx_refresh', data.refresh_token);
                    localStorage.setItem('vx_user', JSON.stringify(data.user));

                    btn.innerHTML = '✓ Google authenticated';
                    
                    setTimeout(() => {
                        const homeLink = document.querySelector('.nav-link[data-page="home"]');
                        if (homeLink) homeLink.click();
                        btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Sign in with Google`;
                        btn.style.pointerEvents = '';
                    }, 1000);
                } else {
                    btn.innerHTML = 'Google sign-in failed. Try again.';
                    btn.style.pointerEvents = '';
                }
            } catch (err) {
                btn.innerHTML = 'Error connecting to server';
                setTimeout(() => {
                    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Sign in with Google`;
                    btn.style.pointerEvents = '';
                }, 2000);
            }
        });
    });

    // ─────────────────── Floating Particles ───────────────────
    const particleContainer = document.querySelector('.login-particles');
    if (particleContainer) {
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.className = 'login-particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.top = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 8 + 's';
            p.style.animationDuration = (6 + Math.random() * 6) + 's';
            if (Math.random() > 0.5) {
                p.style.background = 'rgba(0, 180, 216, 0.3)';
            }
            particleContainer.appendChild(p);
        }
    }
});
