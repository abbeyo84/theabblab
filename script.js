/**
 * The Abb Lab — Main Script
 * Vanilla JS: navigation, scroll reveals, particles, form handling
 */

(function () {
  'use strict';

  /* --- DOM References --- */
  const header = document.getElementById('header');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav__link');
  const reveals = document.querySelectorAll('.reveal');
  const particlesContainer = document.getElementById('particles');
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  const yearEl = document.getElementById('year');

  /* --- Init --- */
  function init() {
    setYear();
    initHeader();
    initMobileNav();
    initSmoothScroll();
    initScrollReveal();
    initActiveNav();
    initParticles();
    initContactForm();
    initPrintfulPlaceholders();
    initHeroReveal();
  }

  /* --- Footer Year --- */
  function setYear() {
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  }

  /* --- Sticky Header --- */
  function initHeader() {
    if (!header) return;

    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 40);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* --- Mobile Navigation --- */
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
        if (navMenu.classList.contains('is-open')) {
          toggleMenu();
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('is-open')) {
        toggleMenu();
      }
    });
  }

  /* --- Smooth Scroll for Anchor Links --- */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#') return;

        const target = document.querySelector(targetId);
        if (!target) return;

        e.preventDefault();

        const headerOffset = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue('--header-height') || '72',
          10
        );

        const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;

        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  /* --- Scroll Reveal (Intersection Observer) --- */
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
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    reveals.forEach((el) => {
      if (!el.closest('.hero__content')) {
        observer.observe(el);
      }
    });
  }

  /* --- Hero entrance (immediate on load) --- */
  function initHeroReveal() {
    const heroReveals = document.querySelectorAll('.hero__content .reveal');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      heroReveals.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    requestAnimationFrame(() => {
      setTimeout(() => {
        heroReveals.forEach((el) => el.classList.add('is-visible'));
      }, 100);
    });
  }

  /* --- Active Nav Link on Scroll --- */
  function initActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    if (!sections.length || !navLinks.length) return;

    const sectionMap = Array.from(sections).map((section) => ({
      id: section.id,
      el: section,
    }));

    const onScroll = () => {
      const scrollPos = window.scrollY + 120;

      let current = '';
      sectionMap.forEach(({ id, el }) => {
        if (el.offsetTop <= scrollPos) {
          current = id;
        }
      });

      navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        link.classList.toggle('is-active', href === `#${current}`);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* --- Hero Particles --- */
  function initParticles() {
    if (!particlesContainer) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const count = window.innerWidth < 768 ? 12 : 24;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('span');
      particle.className = 'particle';

      const left = Math.random() * 100;
      const delay = Math.random() * 8;
      const duration = 6 + Math.random() * 8;
      const size = 2 + Math.random() * 3;

      particle.style.cssText = `
        left: ${left}%;
        bottom: ${Math.random() * 30}%;
        width: ${size}px;
        height: ${size}px;
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
        background: ${Math.random() > 0.5 ? '#2dd4bf' : '#8b5cf6'};
      `;

      particlesContainer.appendChild(particle);
    }
  }

  /* --- Contact Form --- */
  function initContactForm() {
    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const name = contactForm.querySelector('#name');
      const email = contactForm.querySelector('#email');
      const message = contactForm.querySelector('#message');

      if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
        showFormStatus('Please fill in all required fields.', 'error');
        return;
      }

      if (!isValidEmail(email.value)) {
        showFormStatus('Please enter a valid email address.', 'error');
        return;
      }

      submitBtn.classList.add('is-loading');
      showFormStatus('', '');

      /* Simulate submission — replace with Formspree, Cloudflare Worker, etc. */
      await new Promise((resolve) => setTimeout(resolve, 1200));

      submitBtn.classList.remove('is-loading');
      showFormStatus('Message sent! The lab will be in touch soon.', 'success');
      contactForm.reset();

      setTimeout(() => showFormStatus('', ''), 5000);
    });
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function showFormStatus(message, type) {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.className = 'form__status';
    if (type) formStatus.classList.add(`is-${type}`);
  }

  /* --- Printful Shop Placeholders --- */
  function initPrintfulPlaceholders() {
    document.querySelectorAll('[data-printful]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const product = btn.getAttribute('data-printful');
        /* Replace href with actual Printful store URL when ready */
        console.info(`[The Abb Lab] Shop link placeholder: ${product}`);
        showFormStatus('Shop coming soon — connect your Printful store URL.', 'success');
        setTimeout(() => {
          if (formStatus) {
            formStatus.textContent = '';
            formStatus.className = 'form__status';
          }
        }, 3000);
      });
    });
  }

  /* --- Boot --- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();