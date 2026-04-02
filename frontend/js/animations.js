document.addEventListener('DOMContentLoaded', () => {
    // Basic GSAP interactions
    if (typeof gsap === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                const target = entry.target;
                
                // Numbers count up (Stats)
                const numbers = target.querySelectorAll('.stat-number');
                if(numbers.length > 0) {
                    numbers.forEach(el => {
                        const targetVal = parseFloat(el.getAttribute('data-target') || 0);
                        if (!el.classList.contains('counted')) {
                            el.classList.add('counted');
                            gsap.to(el, {
                                innerHTML: targetVal,
                                duration: 2,
                                snap: { innerHTML: targetVal % 1 === 0 ? 1 : 0.1 },
                                ease: "power2.out",
                                onUpdate: function() {
                                    if(targetVal % 1 === 0) {
                                        el.innerHTML = Math.round(this.targets()[0].innerHTML);
                                    } else {
                                        el.innerHTML = parseFloat(this.targets()[0].innerHTML).toFixed(1);
                                    }
                                }
                            });
                        }
                    });
                }

                // Stagger Feature Cards & Pricing Cards
                const cards = target.querySelectorAll('.feature-card, .price-card, .kpi-card, .pipeline-step');
                if(cards.length > 0 && !target.classList.contains('animated-cards')) {
                    target.classList.add('animated-cards');
                    gsap.fromTo(cards, 
                        { y: 40, opacity: 0 }, 
                        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out" }
                    );
                }
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('section').forEach(sec => {
        observer.observe(sec);
    });

    // Parallax Orbs using mouse
    document.addEventListener('mousemove', (e) => {
        const orbs = document.querySelectorAll('.floating-orb');
        const x = (e.clientX / window.innerWidth - 0.5) * 30; // 30px max translation
        const y = (e.clientY / window.innerHeight - 0.5) * 30;
        
        orbs.forEach((orb, i) => {
            gsap.to(orb, {
                x: x * (i + 1), // slightly different depth effect
                y: y * (i + 1),
                duration: 1,
                ease: "power2.out"
            });
        });
    });

    // Live Counters on Home
    const botsBlocked = document.getElementById('botsBlocked');
    const humansVerified = document.getElementById('humansVerified');
    const avgLatency = document.getElementById('avgLatency');
    let bBlocked = 14592;
    let hVerified = 58231;

    if(botsBlocked && humansVerified && avgLatency) {
        botsBlocked.innerText = bBlocked.toLocaleString();
        humansVerified.innerText = hVerified.toLocaleString();
        avgLatency.innerText = "23";

        setInterval(() => {
            if(Math.random() > 0.4) {
                bBlocked += Math.floor(Math.random() * 3);
                botsBlocked.innerText = bBlocked.toLocaleString();
            }
            if(Math.random() > 0.2) {
                hVerified += Math.floor(Math.random() * 5);
                humansVerified.innerText = hVerified.toLocaleString();
            }
            if(Math.random() > 0.5) {
                avgLatency.innerText = (22 + Math.random() * 3).toFixed(1);
            }
        }, 1500);
    }
});
