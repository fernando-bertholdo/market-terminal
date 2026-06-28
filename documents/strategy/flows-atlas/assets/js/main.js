/* =================================================================
   tech-product-template · Atlas de Fluxos & Confiabilidade
   Mermaid + reveal observer + nav rail + atlas sidebar + zoom modal
   ================================================================= */

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------
     1. Mermaid — tema dark, suporte a flowchart + sequence
     --------------------------------------------------------------- */
  if (window.mermaid) {
    window.mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      flowchart: {
        curve: 'basis',
        padding: 20,
        nodeSpacing: 40,
        rankSpacing: 48,
        useMaxWidth: true,
        htmlLabels: true,
      },
      sequence: {
        diagramMarginX: 24,
        diagramMarginY: 18,
        boxMargin: 10,
        actorMargin: 56,
        width: 130,
        height: 52,
        messageMargin: 30,
        mirrorActors: false,
        useMaxWidth: true,
        wrap: true,
        actorFontSize: 13,
        actorFontWeight: 600,
        noteFontSize: 12,
        messageFontSize: 12,
      },
      themeVariables: {
        // Sequence-specific
        actorBkg: '#1e293b',
        actorBorder: '#6366f1',
        actorTextColor: '#e5e7eb',
        actorLineColor: '#475569',
        signalColor: '#94a3b8',
        signalTextColor: '#e5e7eb',
        labelBoxBkgColor: '#3b1d6b',
        labelBoxBorderColor: '#a78bfa',
        labelTextColor: '#fff',
        loopTextColor: '#e5e7eb',
        noteBkgColor: '#1a2238',
        noteBorderColor: '#475569',
        noteTextColor: '#c7d2fe',
        activationBkgColor: '#3b82f6',
        activationBorderColor: '#60a5fa',
        sequenceNumberColor: '#fff',
        // Base / flowchart
        background: '#0c111f',
        primaryColor: '#1a2238',
        primaryTextColor: '#e5e7eb',
        primaryBorderColor: '#475569',
        lineColor: '#64748b',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0c111f',
        textColor: '#e5e7eb',
        labelTextColor: '#e5e7eb',
        nodeBkg: '#1a2238',
        nodeBorder: '#475569',
        nodeTextColor: '#e5e7eb',
        clusterBkg: '#0c111f',
        clusterBorder: '#334155',
        edgeLabelBackground: '#131a2e',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
      },
      securityLevel: 'loose',
    });
  }

  /* ---------------------------------------------------------------
     2. Atlas sidebar — troca de fluxo (grid overlap)
     - Todos os painéis renderizam no load (Mermaid não nasce zerado)
     - Switch só alterna opacity/visibility
     --------------------------------------------------------------- */
  const atlasTabs = document.querySelectorAll('.atlas-tab');
  const atlasPanels = document.querySelectorAll('.atlas-panel');

  function activateFlow(flowId) {
    atlasTabs.forEach(t => {
      const active = t.dataset.flow === flowId;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    atlasPanels.forEach(p => {
      p.classList.toggle('is-active', p.dataset.panel === flowId);
    });
  }

  atlasTabs.forEach(tab => {
    tab.addEventListener('click', () => activateFlow(tab.dataset.flow));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const tabs = [...atlasTabs];
      const idx = tabs.indexOf(tab);
      const nextIdx = e.key === 'ArrowDown'
        ? (idx + 1) % tabs.length
        : (idx - 1 + tabs.length) % tabs.length;
      tabs[nextIdx].focus();
      activateFlow(tabs[nextIdx].dataset.flow);
    });
  });

  /* ---------------------------------------------------------------
     3. Reveal-on-scroll — com pré-check síncrono
     (evita race condition em deep-links e screenshots fullPage)
     --------------------------------------------------------------- */
  const revealEls = document.querySelectorAll('.reveal');
  revealEls.forEach(el => {
    const delay = el.getAttribute('data-reveal-delay');
    if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);
  });

  if (prefersReducedMotion) {
    revealEls.forEach(el => el.classList.add('is-visible'));
  } else if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    const vh = window.innerHeight;
    revealEls.forEach(el => {
      const rect = el.getBoundingClientRect();
      const alreadyPast = rect.bottom <= 0;
      const inView = rect.top < vh && rect.bottom > 0;
      if (alreadyPast || inView) {
        el.classList.add('is-visible');
      } else {
        revealObserver.observe(el);
      }
    });

    window.addEventListener('load', () => {
      setTimeout(() => {
        document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight + 200) el.classList.add('is-visible');
        });
      }, 4000);
    });
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------------------------------------------------------------
     4. Nav rail — destaca a seção visível
     --------------------------------------------------------------- */
  const sections = document.querySelectorAll('section[data-section]');
  const navDots = document.querySelectorAll('.nav-dot');

  function setActiveDot(sectionId) {
    navDots.forEach(dot => dot.classList.toggle('is-active', dot.dataset.target === sectionId));
  }

  if ('IntersectionObserver' in window && sections.length) {
    const visibleSections = new Map();
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visibleSections.set(entry.target.dataset.section, entry.intersectionRatio);
        else visibleSections.delete(entry.target.dataset.section);
      });
      if (visibleSections.size) {
        const [top] = [...visibleSections.entries()].sort((a, b) => b[1] - a[1]);
        setActiveDot(top[0]);
      }
    }, { threshold: [0.15, 0.35, 0.5, 0.75], rootMargin: '-15% 0px -25% 0px' });
    sections.forEach(s => sectionObserver.observe(s));
  }

  document.querySelectorAll('.nav-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
      const targetId = dot.getAttribute('href');
      if (!targetId || !targetId.startsWith('#')) return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ---------------------------------------------------------------
     5. Zoom modal — lightbox para diagramas
     - Clona o SVG do Mermaid para o <dialog>
     - Fecha por X, ESC (nativo) ou click no backdrop (e.target === dialog)
     --------------------------------------------------------------- */
  const zoomModal = document.getElementById('zoomModal');
  const zoomModalBody = document.getElementById('zoomModalBody');
  const zoomModalTitle = document.getElementById('zoomModalTitle');
  const zoomModalClose = zoomModal?.querySelector('.zoom-modal__close');
  const zoomables = document.querySelectorAll('.zoomable');

  function openZoomModal(sourceEl) {
    if (!zoomModal) return;
    const svg = sourceEl.querySelector('.mermaid svg');
    if (!svg) {
      console.warn('[atlas] SVG não encontrado em', sourceEl);
      return;
    }
    const clone = svg.cloneNode(true);
    clone.removeAttribute('width');
    clone.removeAttribute('height');
    clone.style.maxWidth = '100%';
    clone.style.maxHeight = '100%';
    clone.style.width = 'auto';
    clone.style.height = 'auto';
    if (!clone.getAttribute('viewBox') && svg.getAttribute('viewBox')) {
      clone.setAttribute('viewBox', svg.getAttribute('viewBox'));
    }
    zoomModalBody.innerHTML = '';
    zoomModalBody.appendChild(clone);
    zoomModalTitle.textContent = sourceEl.dataset.zoomTitle || 'Diagrama';
    if (typeof zoomModal.showModal === 'function') zoomModal.showModal();
    else zoomModal.setAttribute('open', '');
  }

  function closeZoomModal() {
    if (!zoomModal) return;
    if (typeof zoomModal.close === 'function' && zoomModal.open) zoomModal.close();
    else zoomModal.removeAttribute('open');
    setTimeout(() => { zoomModalBody.innerHTML = ''; }, 350);
  }

  zoomables.forEach(el => {
    el.addEventListener('click', () => openZoomModal(el));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openZoomModal(el); }
    });
  });

  if (zoomModal) {
    zoomModalClose?.addEventListener('click', closeZoomModal);
    // Backdrop click: o click bubbla ao <dialog> com e.target === o próprio dialog
    zoomModal.addEventListener('click', (e) => {
      if (e.target === zoomModal) closeZoomModal();
    });
    zoomModal.addEventListener('close', () => {
      setTimeout(() => { zoomModalBody.innerHTML = ''; }, 350);
    });
  }

  /* ---------------------------------------------------------------
     6. Atalhos de teclado — j/k navegam seções
     --------------------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (zoomModal?.open) return; // não navega com modal aberto
    const isShortcut = e.key === 'j' || e.key === 'k' || e.key === 'PageDown' || e.key === 'PageUp';
    if (!isShortcut) return;
    const isNext = e.key === 'j' || e.key === 'PageDown';
    e.preventDefault();
    const all = [...sections];
    const currentIdx = all.findIndex(s => {
      const r = s.getBoundingClientRect();
      return r.top >= -window.innerHeight * 0.4 && r.top < window.innerHeight * 0.4;
    });
    const targetIdx = isNext
      ? Math.min(currentIdx + 1, all.length - 1)
      : Math.max(currentIdx - 1, 0);
    if (all[targetIdx]) all[targetIdx].scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------------------------------------------------------------
     7. Boot log
     --------------------------------------------------------------- */
  if (typeof console !== 'undefined') {
    console.log('%ctech-product-template · atlas de fluxos', 'color:#8b5cf6;font-weight:700;font-size:13px;font-family:system-ui;');
    console.log('%catalho: j/k navega seções · setas ↑/↓ trocam fluxos na sidebar · clique num diagrama p/ ampliar', 'color:#94a3b8;font-size:11px;');
  }
})();
