/**
 * The Abb Lab — ABBEYO ENTERTAINMENT
 * Navigation, shop filters, scroll reveals, forms
 */

(function () {
  'use strict';

  const header = document.getElementById('header');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav__link, .nav__dropdown-link');
  const libraryToggle = document.getElementById('libraryToggle');
  const libraryDropdown = libraryToggle?.closest('.nav__dropdown');
  const reveals = document.querySelectorAll('.reveal');
  const particlesContainer = document.getElementById('particles');
  const contactForm = document.getElementById('contactForm');
  const subscribeForm = document.getElementById('subscribeForm');
  const formStatus = document.getElementById('formStatus');
  const subscribeStatus = document.getElementById('subscribeStatus');
  const yearEl = document.getElementById('year');
  const shopFilters = document.querySelectorAll('.shop__filter');
  const merchCards = document.querySelectorAll('.merch-card[data-category]');

  function init() {
    setYear();
    initHeader();
    initMobileNav();
    initLibraryDropdown();
    initSmoothScroll();
    initScrollReveal();
    initActiveNav();
    initParticles();
    initShopFilters();
    initCollectionLinks();
    initShopButtons();
    initContactForm();
    initSubscribeForm();
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
      if (!isOpen && libraryDropdown) libraryDropdown.classList.remove('is-open');
    };

    navToggle.addEventListener('click', toggleMenu);

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (navMenu.classList.contains('is-open')) toggleMenu();
        if (libraryDropdown) libraryDropdown.classList.remove('is-open');
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (navMenu.classList.contains('is-open')) toggleMenu();
        if (libraryDropdown) libraryDropdown.classList.remove('is-open');
      }
    });
  }

  function initLibraryDropdown() {
    if (!libraryToggle || !libraryDropdown) return;

    libraryToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = libraryDropdown.classList.toggle('is-open');
      libraryToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!libraryDropdown.contains(e.target)) {
        libraryDropdown.classList.remove('is-open');
        libraryToggle.setAttribute('aria-expanded', 'false');
      }
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

  function initShopFilters() {
    if (!shopFilters.length) return;

    shopFilters.forEach((filter) => {
      filter.addEventListener('click', () => {
        const category = filter.dataset.filter;

        shopFilters.forEach((f) => {
          const active = f === filter;
          f.classList.toggle('is-active', active);
          f.setAttribute('aria-selected', String(active));
        });

        merchCards.forEach((card) => {
          const match = category === 'all' || card.dataset.category === category;
          card.classList.toggle('is-hidden', !match);
        });
      });
    });
  }

  function initCollectionLinks() {
    document.querySelectorAll('[data-scroll]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const category = link.dataset.scroll;
        const shop = document.getElementById('shop');
        const targetFilter = document.querySelector(`.shop__filter[data-filter="${category}"]`);

        if (shop) scrollToElement(shop);
        if (targetFilter) targetFilter.click();
      });
    });
  }

  function initShopButtons() {
    document.querySelectorAll('[data-shop]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const product = btn.getAttribute('data-shop');
        console.info(`[The Abb Lab] Shop placeholder: ${product}`);
        showStatus(formStatus, 'Store coming soon — connect your Printful or shop URL.', 'success');
        setTimeout(() => showStatus(formStatus, '', ''), 3000);
      });
    });
  }

  function initContactForm() {
    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const name = contactForm.querySelector('#name');
      const email = contactForm.querySelector('#email');
      const message = contactForm.querySelector('#message');

      if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
        showStatus(formStatus, 'Please fill in all required fields.', 'error');
        return;
      }

      if (!isValidEmail(email.value)) {
        showStatus(formStatus, 'Please enter a valid email address.', 'error');
        return;
      }

      submitBtn.classList.add('is-loading');
      showStatus(formStatus, '', '');

      await new Promise((resolve) => setTimeout(resolve, 1200));

      submitBtn.classList.remove('is-loading');
      showStatus(formStatus, 'Message received. The lab will respond shortly.', 'success');
      contactForm.reset();
      setTimeout(() => showStatus(formStatus, '', ''), 5000);
    });
  }

  function initSubscribeForm() {
    if (!subscribeForm) return;

    subscribeForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = subscribeForm.querySelector('#subscribeEmail');
      if (!email.value.trim() || !isValidEmail(email.value)) {
        showStatus(subscribeStatus, 'Please enter a valid email address.', 'error');
        return;
      }

      showStatus(subscribeStatus, '', '');
      await new Promise((resolve) => setTimeout(resolve, 800));

      showStatus(subscribeStatus, 'Subscribed — you will receive drop alerts.', 'success');
      subscribeForm.reset();
      setTimeout(() => showStatus(subscribeStatus, '', ''), 5000);
    });
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function showStatus(el, message, type) {
    if (!el) return;
    el.textContent = message;
    el.className = 'form__status';
    if (type) el.classList.add(`is-${type}`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();