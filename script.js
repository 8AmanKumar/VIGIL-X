// ============================================
// VigilX Presentation — Navigation & Animations
// ============================================

(function () {
    'use strict';

    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.nav-dot');
    const progressFill = document.getElementById('progressFill');
    const currentSlideEl = document.getElementById('currentSlide');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const keyboardHint = document.getElementById('keyboardHint');

    let current = 0;
    const total = slides.length;
    let isAnimating = false;

    function goToSlide(index) {
        if (index < 0 || index >= total || index === current || isAnimating) return;
        isAnimating = true;

        const prev = slides[current];
        const next = slides[index];

        // Exit the current slide
        prev.classList.remove('slide-active');
        prev.classList.add('slide-exit');

        // Prepare the entering slide: clear any leftover inline styles
        next.style.cssText = '';
        next.classList.remove('slide-exit', 'slide-active');

        // Force a reflow so the browser restarts the animation fresh
        void next.offsetWidth;

        // Now activate the entering slide
        next.classList.add('slide-active');

        // Update dots
        dots.forEach(d => d.classList.remove('active'));
        dots[index].classList.add('active');

        // Update progress
        progressFill.style.width = `${((index + 1) / total) * 100}%`;

        // Update counter
        currentSlideEl.textContent = String(index + 1).padStart(2, '0');

        current = index;

        // Hide hint after first navigation
        if (keyboardHint) {
            keyboardHint.classList.add('hidden');
        }

        setTimeout(() => {
            prev.classList.remove('slide-exit');
            prev.style.cssText = '';
            isAnimating = false;
        }, 450);
    }

    function nextSlide() { goToSlide(current + 1); }
    function prevSlide() { goToSlide(current - 1); }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
            e.preventDefault();
            nextSlide();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            prevSlide();
        }
    });

    // Button navigation
    nextBtn.addEventListener('click', nextSlide);
    prevBtn.addEventListener('click', prevSlide);

    // Dot navigation
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            goToSlide(parseInt(dot.dataset.slide));
        });
    });

    // Touch/Swipe support
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) nextSlide();
            else prevSlide();
        }
    }, { passive: true });

    // Mouse wheel (debounced)
    let wheelTimeout;
    document.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (wheelTimeout) return;
        wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 800);
        if (e.deltaY > 0) nextSlide();
        else prevSlide();
    }, { passive: false });

    // Human score animation on slide 4
    const humanScoreEl = document.getElementById('humanScore');
    let scoreAnimated = false;

    function animateScore() {
        if (scoreAnimated) return;
        scoreAnimated = true;
        let val = 0;
        const target = 0.94;
        const duration = 1500;
        const start = performance.now();

        function step(timestamp) {
            const progress = Math.min((timestamp - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            val = eased * target;
            humanScoreEl.textContent = val.toFixed(2);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // Observe slide 4 activation for score animation
    const observer = new MutationObserver(() => {
        if (slides[3] && slides[3].classList.contains('slide-active')) {
            animateScore();
        }
    });

    slides.forEach(slide => {
        observer.observe(slide, { attributes: true, attributeFilter: ['class'] });
    });

    // Auto-hide keyboard hint
    setTimeout(() => {
        if (keyboardHint) keyboardHint.classList.add('hidden');
    }, 6000);

    // Initialize first slide
    slides[0].classList.add('slide-active');
    progressFill.style.width = `${(1 / total) * 100}%`;
})();
