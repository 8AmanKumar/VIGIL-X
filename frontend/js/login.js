document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        loginBtn.innerText = "Authenticating...";
        loginError.style.display = 'none';

        try {
            const res = await fetch(`${window.VIGILX_CONFIG.apiUrl}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (res.ok) {
                const data = await res.json();
                loginBtn.innerText = "Success. Redirecting...";
                loginBtn.style.background = "rgba(0, 255, 136, 0.2)";
                loginBtn.style.color = "#00ff88";
                localStorage.setItem('vx_auth', 'true');
                
                // Simulate redirect to dashboard
                setTimeout(() => {
                    document.querySelector('.nav-link[data-page="demo"]').click();
                    loginBtn.innerText = "Access System";
                    loginForm.reset();
                }, 1000);
            } else {
                const errData = await res.json();
                loginError.innerText = errData.detail || "Authentication Failed.";
                loginError.style.display = 'block';
                loginBtn.innerText = "Access Dashboard";
            }
        } catch (error) {
            loginError.innerText = "Backend is entirely unreachable.";
            loginError.style.display = 'block';
            loginBtn.innerText = "Access Dashboard";
        }
    });

    // Registration UI Toggle
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    
    if(showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => {
            loginSection.style.display = 'none';
            registerSection.style.display = 'block';
        });
    }
    
    if(showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            registerSection.style.display = 'none';
            loginSection.style.display = 'block';
        });
    }

    // Registration Submission
    const registerForm = document.getElementById('registerForm');
    const registerError = document.getElementById('registerError');
    const registerBtn = document.getElementById('registerBtn');

    if(registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const name = document.getElementById('regName').value;
            
            registerBtn.innerText = "Creating Account...";
            registerError.style.display = 'none';

            try {
                const res = await fetch(`${window.VIGILX_CONFIG.apiUrl}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, name })
                });

                if (res.ok) {
                    registerBtn.innerText = "Welcome. Redirecting...";
                    registerBtn.style.background = "rgba(0, 255, 136, 0.2)";
                    registerBtn.style.color = "#00ff88";
                    localStorage.setItem('vx_auth', 'true');
                    
                    setTimeout(() => {
                        document.querySelector('.nav-link[data-page="demo"]').click();
                        registerBtn.innerText = "Sign Up securely";
                        registerForm.reset();
                    }, 1000);
                } else {
                    const errData = await res.json();
                    registerError.innerText = errData.detail || "Registration Failed.";
                    registerError.style.display = 'block';
                    registerBtn.innerText = "Sign Up securely";
                }
            } catch (error) {
                registerError.innerText = "Backend is entirely unreachable.";
                registerError.style.display = 'block';
                registerBtn.innerText = "Sign Up securely";
            }
        });
    }

});
