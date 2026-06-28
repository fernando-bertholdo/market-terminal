/* =================================================================
   tech-product-template · Walkthrough
   Scroll observer + Mermaid + Nav rail
   ================================================================= */

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------
     1. Mermaid — tema dark customizado, alinhado ao design system
     --------------------------------------------------------------- */
  if (window.mermaid) {
    window.mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      flowchart: {
        curve: 'basis',
        padding: 22,
        nodeSpacing: 36,
        rankSpacing: 42,
        useMaxWidth: true,
        htmlLabels: true,
      },
      sequence: {
        diagramMarginX: 24,
        diagramMarginY: 18,
        boxMargin: 10,
        actorMargin: 60,
        width: 130,
        height: 56,
        messageMargin: 32,
        mirrorActors: false,
        useMaxWidth: true,
        wrap: true,
        rightAngles: false,
        actorFontSize: 13,
        actorFontWeight: 600,
        noteFontSize: 12,
        messageFontSize: 12,
      },
      themeVariables: {
        // Para sequence: precisa de overrides específicos
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
        // Manter base flowchart também
        background: '#131a2e',
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
        fontSize: '15px',
      },
      securityLevel: 'loose',
    });
  }

  /* ---------------------------------------------------------------
     1.5. Tabs — fluxos vivos (sequence diagrams)
     - Grid overlap mantém todos os Mermaid renderizados
     - Só troca opacity + visibility no switch
     --------------------------------------------------------------- */
  const flowTabs = document.querySelectorAll('.flows-tab');
  const flowPanels = document.querySelectorAll('.flows-panel');

  function activateFlow(flowId) {
    flowTabs.forEach(t => {
      const active = t.dataset.flow === flowId;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    flowPanels.forEach(p => {
      p.classList.toggle('is-active', p.dataset.panel === flowId);
    });
  }

  flowTabs.forEach(tab => {
    tab.addEventListener('click', () => activateFlow(tab.dataset.flow));
    // Atalho de teclado: ArrowLeft/ArrowRight navega entre tabs
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const tabs = [...flowTabs];
      const idx = tabs.indexOf(tab);
      const nextIdx = e.key === 'ArrowRight'
        ? (idx + 1) % tabs.length
        : (idx - 1 + tabs.length) % tabs.length;
      tabs[nextIdx].focus();
      activateFlow(tabs[nextIdx].dataset.flow);
    });
  });

  /* ---------------------------------------------------------------
     1.6. Zoom modal — lightbox para diagramas
     - Clica em .zoomable → clona o SVG do Mermaid para o <dialog>
     - ESC, click fora ou botão close fecham
     - Acessível: tabindex no container, Enter abre, focus trap nativo do dialog
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
      // Mermaid ainda não terminou de renderizar — fallback silencioso
      console.warn('[walkthrough] SVG não encontrado em', sourceEl);
      return;
    }

    // Clona e libera o SVG das constraints de tamanho do Mermaid
    const clone = svg.cloneNode(true);
    clone.removeAttribute('width');
    clone.removeAttribute('height');
    clone.style.maxWidth = '100%';
    clone.style.maxHeight = '100%';
    clone.style.width = 'auto';
    clone.style.height = 'auto';
    // Garante que viewBox existe para escalar corretamente
    if (!clone.getAttribute('viewBox') && svg.getAttribute('viewBox')) {
      clone.setAttribute('viewBox', svg.getAttribute('viewBox'));
    }

    zoomModalBody.innerHTML = '';
    zoomModalBody.appendChild(clone);
    zoomModalTitle.textContent = sourceEl.dataset.zoomTitle || 'Diagrama';

    if (typeof zoomModal.showModal === 'function') {
      zoomModal.showModal();
    } else {
      // Fallback para browsers muito antigos (sem <dialog>)
      zoomModal.setAttribute('open', '');
    }
  }

  function closeZoomModal() {
    if (!zoomModal) return;
    if (typeof zoomModal.close === 'function' && zoomModal.open) {
      zoomModal.close();
    } else {
      zoomModal.removeAttribute('open');
    }
    // Limpa o conteúdo após a animação de fechamento
    setTimeout(() => { zoomModalBody.innerHTML = ''; }, 350);
  }

  zoomables.forEach(el => {
    el.addEventListener('click', () => openZoomModal(el));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openZoomModal(el);
      }
    });
  });

  if (zoomModal) {
    zoomModalClose?.addEventListener('click', closeZoomModal);

    // Click no backdrop fecha. Padrão idiomático: clicar no backdrop
    // bubbla um 'click' até <dialog> com e.target === o próprio dialog
    // (não um descendente). Mais confiável que getBoundingClientRect,
    // que reporta posições inesperadas para <dialog> em top-layer.
    zoomModal.addEventListener('click', (e) => {
      if (e.target === zoomModal) closeZoomModal();
    });

    // ESC já é tratado nativamente por <dialog>, mas precisamos limpar o body
    zoomModal.addEventListener('close', () => {
      setTimeout(() => { zoomModalBody.innerHTML = ''; }, 350);
    });
  }

  /* ---------------------------------------------------------------
     2. Reveal-on-scroll com IntersectionObserver
     - Cada elemento .reveal entra com fade + translateY
     - data-reveal-delay aplica delay individual (stagger)
     --------------------------------------------------------------- */
  const revealEls = document.querySelectorAll('.reveal');

  // Aplica delay como variável CSS custom (mais limpo que JS animate)
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
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px',
    });

    // Pré-checagem síncrona: evita race condition quando a página
    // carrega via deep-link (anchor), quando o user role-restaura,
    // ou quando renderizadores não-interativos (screenshots fullPage,
    // crawlers) precisam ver o conteúdo de qualquer forma.
    const vh = window.innerHeight;
    revealEls.forEach(el => {
      const rect = el.getBoundingClientRect();
      const alreadyPast = rect.bottom <= 0;       // já scrollou para baixo
      const inView = rect.top < vh && rect.bottom > 0;
      if (alreadyPast || inView) {
        el.classList.add('is-visible');
      } else {
        revealObserver.observe(el);
      }
    });

    // Salvaguarda: 4 segundos após load, força reveal de qualquer
    // elemento ainda escondido. Cobre casos edge (Mermaid timeout,
    // navegação programática, viewport "espremida" por dev tools etc.)
    window.addEventListener('load', () => {
      setTimeout(() => {
        document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => {
          // Só revela se já passou ou está visível; deixa observer
          // continuar cuidando dos que estão genuinamente fora.
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight + 200) {
            el.classList.add('is-visible');
          }
        });
      }, 4000);
    });
  } else {
    // Fallback: revela tudo se IntersectionObserver não existir
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------------------------------------------------------------
     3. Nav rail — destacar dot da seção visível
     - Threshold maior porque sections são grandes
     - Sempre exatamente 1 dot ativo (escolhe seção com mais área visível)
     --------------------------------------------------------------- */
  const sections = document.querySelectorAll('section[data-section]');
  const navDots = document.querySelectorAll('.nav-dot');

  function setActiveDot(sectionId) {
    navDots.forEach(dot => {
      dot.classList.toggle('is-active', dot.dataset.target === sectionId);
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    let visibleSections = new Map();

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          visibleSections.set(entry.target.dataset.section, entry.intersectionRatio);
        } else {
          visibleSections.delete(entry.target.dataset.section);
        }
      });

      // Escolhe a seção com maior ratio visível
      if (visibleSections.size) {
        const [topSection] = [...visibleSections.entries()]
          .sort((a, b) => b[1] - a[1]);
        setActiveDot(topSection[0]);
      }
    }, {
      threshold: [0.15, 0.35, 0.5, 0.75],
      rootMargin: '-15% 0px -25% 0px',
    });

    sections.forEach(section => sectionObserver.observe(section));
  }

  /* ---------------------------------------------------------------
     4. Smooth scroll nos links da nav rail
     - Browsers modernos já suportam via CSS scroll-behavior,
       mas garantimos no JS para evitar jank em algumas situações
     --------------------------------------------------------------- */
  document.querySelectorAll('.nav-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
      const targetId = dot.getAttribute('href');
      if (!targetId || !targetId.startsWith('#')) return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  });

  /* ---------------------------------------------------------------
     5. Keyboard nav — setas para navegar entre seções
     --------------------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    // Ignora se foco está em input/textarea
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const isNext = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'j';
    const isPrev = e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'k';
    if (!isNext && !isPrev) return;

    // Apenas intervém se for navegação por seção (j/k/PageUp/PageDown)
    // Para ArrowDown/Up, deixa scroll normal — só intercepta j/k/Page*
    const isShortcut = e.key === 'j' || e.key === 'k' || e.key === 'PageDown' || e.key === 'PageUp';
    if (!isShortcut) return;

    e.preventDefault();
    const allSections = [...sections];
    const currentIdx = allSections.findIndex(s => {
      const r = s.getBoundingClientRect();
      return r.top >= -window.innerHeight * 0.4 && r.top < window.innerHeight * 0.4;
    });
    const targetIdx = isNext
      ? Math.min(currentIdx + 1, allSections.length - 1)
      : Math.max(currentIdx - 1, 0);
    if (allSections[targetIdx]) {
      allSections[targetIdx].scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  });

  /* ---------------------------------------------------------------
     6. Boot log discreto
     --------------------------------------------------------------- */
  if (typeof console !== 'undefined') {
    const banner = [
      '%ctech-product-template · walkthrough',
      'color:#8b5cf6;font-weight:700;font-size:13px;font-family:system-ui;',
    ];
    console.log(...banner);
    console.log(
      '%catalho: j/k ou PageUp/PageDown para navegar entre seções',
      'color:#94a3b8;font-size:11px;'
    );
  }
})();
