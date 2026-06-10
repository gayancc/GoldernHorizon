import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Sticky nav background + mobile menu toggle. */
export function initNav() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');

  const onScroll = () => nav.classList.toggle('nav--scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    nav.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  links.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      links.classList.remove('is-open');
      nav.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    })
  );
}

/** Scroll-triggered reveals for every [data-reveal] element. */
export function initReveals() {
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: prefersReducedMotion ? 0 : 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });
}

export { gsap, ScrollTrigger };
