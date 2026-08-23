/**
 * The Abb Lab — ABBEYO ENTERTAINMENT
 * Navigation, scroll reveals
 */

(function () {
  'use strict';

  const header = document.getElementById('header');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav__link');
  const reveals = document.querySelectorAll('.reveal');
  const particlesContainer = document.getElementById('particles');
  const yearEl = document.getElementById('year');

  function init() {
    setYear();
    initHeader();
    initMobileNav();
    initSmoothScroll();
    initScrollReveal();
    initActiveNav();
    initParticles();
    initHeroReveal();
  }

  function setYear() {
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  function initHeader() {
    if (!header) return;
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initMobileNav() {
    if (!navToggle || !navMenu) return;

    const toggleMenu = () => {
      const isOpen = navToggle.classList.toggle('is-open');
      navMenu.classList.toggle('is-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    navToggle.addEventListener('click', toggleMenu);

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (navMenu.classList.contains('is-open')) toggleMenu();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('is-open')) toggleMenu();
    });
  }

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#') return;

        const target = document.querySelector(targetId);
        if (!target) return;

        e.preventDefault();
        scrollToElement(target);
      });
    });
  }

  function scrollToElement(el) {
    const headerOffset = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--header-height') || '72',
      10
    );
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  function initScrollReveal() {
    if (!reveals.length) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      reveals.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    reveals.forEach((el) => {
      if (!el.closest('.hero__content')) observer.observe(el);
    });
  }

  function initHeroReveal() {
    const heroReveals = document.querySelectorAll('.hero__content .reveal');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      heroReveals.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    requestAnimationFrame(() => {
      setTimeout(() => heroReveals.forEach((el) => el.classList.add('is-visible')), 100);
    });
  }

  function initActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    if (!sections.length) return;

    const onScroll = () => {
      const scrollPos = window.scrollY + 120;
      let current = '';

      sections.forEach((section) => {
        if (section.offsetTop <= scrollPos) current = section.id;
      });

      navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        link.classList.toggle('is-active', href === `#${current}`);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initParticles() {
    if (!particlesContainer) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const count = window.innerWidth < 768 ? 12 : 24;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('span');
      particle.className = 'particle';

      particle.style.cssText = `
        left: ${Math.random() * 100}%;
        bottom: ${Math.random() * 30}%;
        width: ${2 + Math.random() * 3}px;
        height: ${2 + Math.random() * 3}px;
        animation-duration: ${6 + Math.random() * 8}s;
        animation-delay: ${Math.random() * 8}s;
        background: ${Math.random() > 0.5 ? '#2dd4bf' : '#8b5cf6'};
      `;

      particlesContainer.appendChild(particle);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
