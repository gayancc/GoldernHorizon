import { gsap, initNav, initReveals, prefersReducedMotion } from './ui.js';
import { initHeroScene } from './scene.js';

document.documentElement.classList.add('js');

initNav();
initHeroScene(document.getElementById('heroCanvas'), { reducedMotion: prefersReducedMotion });

/* ---------- preloader → hero intro ---------- */
function playIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.to('#preloader', {
    autoAlpha: 0,
    duration: prefersReducedMotion ? 0 : 0.6,
    onComplete: () => document.getElementById('preloader').remove(),
  })
    .to('.hero__word', { y: 0, duration: 1.1, stagger: 0.12 }, '-=0.2')
    .to('[data-hero-fade]', { opacity: 1, duration: 0.9, stagger: 0.1 }, '-=0.6');
}

if (document.fonts?.ready) {
  // Wait for fonts (capped at 2s) so the title doesn't reflow mid-animation.
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))]).then(() =>
    setTimeout(playIntro, prefersReducedMotion ? 0 : 400)
  );
} else {
  window.addEventListener('load', playIntro);
}

initReveals();

/* ---------- about statement: word-by-word scrub ---------- */
const statement = document.getElementById('aboutStatement');
statement.innerHTML = statement.textContent
  .trim()
  .split(/\s+/)
  .map((w) => `<span class="word">${w}</span>`)
  .join(' ');
gsap.to(statement.querySelectorAll('.word'), {
  opacity: 1,
  stagger: 0.05,
  ease: 'none',
  scrollTrigger: {
    trigger: statement,
    start: 'top 80%',
    end: 'bottom 45%',
    scrub: prefersReducedMotion ? false : 0.6,
  },
});

/* ---------- stat counters ---------- */
document.querySelectorAll('.stat__num').forEach((el) => {
  const target = Number(el.dataset.count);
  gsap.to(el, {
    innerText: target,
    duration: prefersReducedMotion ? 0 : 1.8,
    snap: { innerText: 1 },
    ease: 'power2.out',
    scrollTrigger: { trigger: '#stats', start: 'top 85%' },
  });
});

/* ---------- marquee ---------- */
if (!prefersReducedMotion) {
  gsap.to('#marqueeTrack', { xPercent: -50, duration: 24, ease: 'none', repeat: -1 });
}
