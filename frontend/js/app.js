document.addEventListener('DOMContentLoaded', () => {
    // 1. Loading Screen
    const loading = document.getElementById('loadingScreen');
    if (loading) {
        setTimeout(() => {
            loading.style.opacity = '0';
            loading.style.transition = 'opacity 0.6s ease';
            setTimeout(() => {
                loading.style.display = 'none';
            }, 600);
        }, 1200);
    }

    // 2. Mobile Menu Toggle
    const hamburger = document.getElementById('navHamburger');
    const navLinks = document.getElementById('navLinks');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
            // If active, we might need a specific style in CSS
            if (navLinks.classList.contains('active')) {
                navLinks.style.display = 'flex';
                navLinks.style.flexDirection = 'column';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '70px';
                navLinks.style.left = '0';
                navLinks.style.right = '0';
                navLinks.style.background = 'rgba(10, 10, 12, 0.95)';
                navLinks.style.padding = '20px';
                navLinks.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
                navLinks.style.backdropFilter = 'blur(10px)';
            } else {
                navLinks.style.display = '';
                navLinks.style.flexDirection = '';
                navLinks.style.position = '';
                navLinks.style.background = '';
                navLinks.style.padding = '';
                navLinks.style.borderBottom = '';
                navLinks.style.backdropFilter = '';
            }
        });
    }

    // 3. Page Navigation (SPA style)
    const links = document.querySelectorAll('[data-page], [data-navigate]');
    const pages = document.querySelectorAll('.page');

    function navigateTo(pageId) {
        // Auth Guard
        const isAuthenticated = localStorage.getItem('vx_auth') === 'true';
        if (!isAuthenticated && pageId !== 'login') {
            const navLinksContainer = document.getElementById('navLinks');
            const navActions = document.querySelector('.nav-actions');
            if (navLinksContainer) navLinksContainer.style.display = 'none';
            if (navActions) navActions.style.display = 'none';
            pageId = 'login';
            window.history.pushState(null, null, `#login`);
        } else if (isAuthenticated) {
            const navLinksContainer = document.getElementById('navLinks');
            const navActions = document.querySelector('.nav-actions');
            if (navLinksContainer) navLinksContainer.style.display = '';
            if (navActions) navActions.style.display = '';
            // Hide login button in nav once authenticated
            const loginNavBtn = document.querySelector('.nav-link[data-page="login"]');
            if (loginNavBtn) loginNavBtn.style.display = 'none';
            
            // if trying to go to login while auth'd, go home
            if (pageId === 'login') pageId = 'home';
        }

        const targetPage = document.getElementById(`page-${pageId}`);
        if (!targetPage) return;

        // Hide all pages
        pages.forEach(p => {
            p.classList.remove('page-active');
            p.style.display = 'none'; // Ensure CSS hides it if class missing
        });

        // Show target page
        targetPage.classList.add('page-active');
        targetPage.style.display = 'block';

        // Update nav links
        document.querySelectorAll('.nav-link').forEach(nav => {
            nav.classList.remove('active');
            if (nav.getAttribute('data-page') === pageId) {
                nav.classList.add('active');
            }
        });

        // Close mobile menu if open
        if (navLinks && navLinks.classList.contains('active')) {
            hamburger.click();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Initialize all pages to display:none except the active one
    pages.forEach(p => {
        if (!p.classList.contains('page-active')) {
            p.style.display = 'none';
        } else {
            p.style.display = 'block';
        }
    });

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const pageId = link.getAttribute('data-page') || link.getAttribute('data-navigate');
            if (pageId) {
                // If it's a real anchor and we want to change url, we could, but let's just do e.preventDefault()
                if (link.tagName === 'A' && link.getAttribute('href').startsWith('#')) {
                    e.preventDefault();
                    window.history.pushState(null, null, `#${pageId}`);
                }
                navigateTo(pageId);
            }
        });
    });

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            navigateTo(hash);
        } else {
            navigateTo('home');
        }
    });

    // Check initial hash (or enforce auth)
    const initialHash = window.location.hash.replace('#', '');
    navigateTo(initialHash || 'home');
});
