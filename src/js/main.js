import { gsap, initNav, prefersReducedMotion } from './ui.js';
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
