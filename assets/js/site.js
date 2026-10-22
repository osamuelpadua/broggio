(function () {
  var track = document.querySelector('.reviews-track');
  if (!track) return;
  var originalCards = Array.from(track.querySelectorAll('.review-card')).map(function (card) {
    return card.cloneNode(true);
  });
  var viewport = track.closest('.carousel-viewport');
  var carousel = track.closest('.reviews-carousel');
  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  var isInView = !('IntersectionObserver' in window);
  var isHovered = false;
  var isTransitioning = false;
  var pagination = document.querySelector('.reviews-pagination');
  var prevBtn = document.querySelector('.carousel-btn--prev');
  var nextBtn = document.querySelector('.carousel-btn--next');
  var total = originalCards.length;
  var perView = 3;
  var gap = 24;
  var cloneCount = Math.min(perView, total);
  var autoPlayDelay = 8000;
  var current = 0;
  var virtualIndex = cloneCount;
  var cardWidth = 0;
  var renderedCards = [];
  var pageStops = [];
  var autoPlayId = null;
  var transitionMs = 420;

  function getMaxIndex() {
    return Math.max(0, total - perView);
  }

  function getPerView() {
    var viewportWidth = window.innerWidth;
    if (viewportWidth <= 680) return 1;
    if (viewportWidth <= 1080) return 2;
    return 3;
  }

  function normalizeIndex(index) {
    return ((index % total) + total) % total;
  }

  function rebuildTrack() {
    track.innerHTML = '';

    originalCards.slice(total - cloneCount).forEach(function (card) {
      var clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });

    originalCards.forEach(function (card) {
      track.appendChild(card.cloneNode(true));
    });

    originalCards.slice(0, cloneCount).forEach(function (card) {
      var clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });

    renderedCards = Array.from(track.querySelectorAll('.review-card'));
  }

  function buildPageStops() {
    var maxIndex = getMaxIndex();
    pageStops = [];

    for (var i = 0; i <= maxIndex; i += perView) {
      pageStops.push(i);
    }

    if (!pageStops.length || pageStops[pageStops.length - 1] !== maxIndex) {
      pageStops.push(maxIndex);
    }
  }

  function renderPagination() {
    if (!pagination) return;
    pagination.innerHTML = '';

    pageStops.forEach(function (stop, index) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'reviews-dot';
      dot.setAttribute('aria-label', 'Ir para o grupo ' + (index + 1) + ' de depoimentos');
      dot.addEventListener('click', function () {
        goTo(stop);
        restartAutoPlay();
      });
      pagination.appendChild(dot);
    });
  }

  function updatePagination() {
    if (!pagination) return;
    var dots = Array.from(pagination.querySelectorAll('.reviews-dot'));
    var activeIndex = 0;

    pageStops.forEach(function (stop, index) {
      if (current >= stop) activeIndex = index;
    });

    dots.forEach(function (dot, index) {
      var isActive = index === activeIndex;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function stopAutoPlay() {
    if (autoPlayId) {
      window.clearInterval(autoPlayId);
      autoPlayId = null;
    }
  }

  function startAutoPlay() {
    stopAutoPlay();
    if (total <= perView || motionPreference.matches || document.hidden || !isInView || isHovered || carousel.contains(document.activeElement) || pagination.contains(document.activeElement)) return;
    autoPlayId = window.setInterval(function () {
      stepBy(1);
    }, autoPlayDelay);
  }

  function restartAutoPlay() {
    startAutoPlay();
  }

  function updateControls() {
    prevBtn.style.opacity = '1';
    prevBtn.style.pointerEvents = 'auto';
    nextBtn.style.opacity = '1';
    nextBtn.style.pointerEvents = 'auto';
  }

  function applyTransform(animate) {
    var nextTransform = 'translateX(-' + (virtualIndex * (cardWidth + gap)) + 'px)';
    var shouldAnimate = animate !== false && !motionPreference.matches && track.style.transform !== nextTransform;
    isTransitioning = shouldAnimate;
    track.style.transition = shouldAnimate ? 'transform ' + transitionMs + 'ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    track.style.transform = nextTransform;
  }

  function snapToCurrent() {
    virtualIndex = current + cloneCount;
    applyTransform(false);
  }

  var fontsHooked = false;

  function normalizeReviewText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function getFullReviewText(card) {
    var source = card.querySelector(".rc-full-text");
    var text = card.querySelector(".rc-text");
    return normalizeReviewText(source ? source.textContent : text && text.textContent);
  }

  function cardOverflows(card) {
    return card.scrollHeight > card.clientHeight + 1;
  }

  function fitReviewCard(card) {
    var text = card.querySelector(".rc-text");
    var button = card.querySelector(".rc-read-more");
    var fullText = getFullReviewText(card);
    if (!text || !fullText) return;

    text.textContent = fullText;
    text.classList.remove("is-clamped");
    text.style.removeProperty("--review-lines");
    if (button) button.hidden = true;

    if (!button || !cardOverflows(card)) return;

    button.hidden = false;
    text.classList.add("is-clamped");

    var computed = window.getComputedStyle(text);
    var lineHeight = parseFloat(computed.lineHeight) || 24;
    var naturalLines = Math.ceil(text.scrollHeight / lineHeight);
    var lines = Math.min(Math.max(naturalLines, 4), 14);

    while (lines > 4) {
      text.style.setProperty("--review-lines", lines);
      if (!cardOverflows(card)) break;
      lines -= 1;
    }

    text.style.setProperty("--review-lines", lines);
  }

  function fitReviewCards(cards) {
    cards.forEach(fitReviewCard);
  }

  function init() {
    perView = Math.min(getPerView(), total);
    cloneCount = Math.min(perView, total);
    current = normalizeIndex(current);
    rebuildTrack();
    cardWidth = (viewport.offsetWidth - gap * (perView - 1)) / perView;
    renderedCards.forEach(function (c) {
      c.style.width = cardWidth + 'px';
      c.style.flex = '0 0 ' + cardWidth + 'px';
    });
    fitReviewCards(renderedCards);
    if (!fontsHooked && document.fonts && document.fonts.ready) {
      fontsHooked = true;
      document.fonts.ready.then(function () { fitReviewCards(renderedCards); });
    }
    buildPageStops();
    renderPagination();
    snapToCurrent();
    updateControls();
    updatePagination();
    startAutoPlay();
  }

  function goTo(index, animate) {
    current = normalizeIndex(index);
    virtualIndex = current + cloneCount;
    applyTransform(animate);
    updateControls();
    updatePagination();
  }

  function stepBy(delta) {
    if (isTransitioning) return;
    current = normalizeIndex(current + delta);
    virtualIndex += delta;
    applyTransform(true);
    if (motionPreference.matches) snapToCurrent();
    updateControls();
    updatePagination();
  }

  prevBtn.addEventListener('click', function () {
    stepBy(-1);
    restartAutoPlay();
  });
  nextBtn.addEventListener('click', function () {
    stepBy(1);
    restartAutoPlay();
  });
  track.addEventListener('transitionend', function (event) {
    if (event.target !== track || event.propertyName !== 'transform') return;
    isTransitioning = false;
    if (virtualIndex < cloneCount || virtualIndex >= total + cloneCount) {
      snapToCurrent();
    }
  });
  track.addEventListener('transitioncancel', function () { isTransitioning = false; });
  window.addEventListener('resize', init);
  carousel.addEventListener('mouseenter', function () { isHovered = true; stopAutoPlay(); });
  carousel.addEventListener('mouseleave', function () { isHovered = false; startAutoPlay(); });
  [carousel, pagination].forEach(function (element) {
    element.addEventListener('focusin', stopAutoPlay);
    element.addEventListener('focusout', function () { window.setTimeout(startAutoPlay, 0); });
  });
  carousel.addEventListener('keydown', function (event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    stepBy(event.key === 'ArrowRight' ? 1 : -1);
  });
  document.addEventListener('visibilitychange', startAutoPlay);
  motionPreference.addEventListener('change', function () {
    snapToCurrent();
    startAutoPlay();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      isInView = entries[0].isIntersecting;
      startAutoPlay();
    }, { threshold: 0.15 }).observe(carousel);
  }

  var touchStartX = 0;
  var touchStartY = 0;
  var isDragging = false;
  viewport.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isDragging = true;
    stopAutoPlay();
  }, { passive: true });
  viewport.addEventListener('touchend', function (e) {
    if (!isDragging) return;
    isDragging = false;
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      stepBy(dx < 0 ? 1 : -1);
    }
    restartAutoPlay();
  }, { passive: true });
  viewport.addEventListener('touchcancel', function () {
    isDragging = false;
    restartAutoPlay();
  }, { passive: true });

  init();
})();

(function () {
  var items = Array.from(document.querySelectorAll('.faq-item'));
  if (!items.length) return;

  function setOpenState(item, shouldOpen) {
    var button = item.querySelector('.faq-question');
    item.classList.toggle('is-open', shouldOpen);
    button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    item.querySelector('.faq-answer').inert = !shouldOpen;
  }

  items.forEach(function (item, index) {
    var button = item.querySelector('.faq-question');
    var answer = item.querySelector('.faq-answer');
    button.id = 'faq-question-' + (index + 1);
    answer.id = 'faq-answer-' + (index + 1);
    button.setAttribute('aria-controls', answer.id);
    answer.setAttribute('aria-labelledby', button.id);
    answer.setAttribute('role', 'region');
    setOpenState(item, item.classList.contains('is-open'));
    button.addEventListener('click', function () {
      var willOpen = !item.classList.contains('is-open');
      items.forEach(function (currentItem) {
        setOpenState(currentItem, false);
      });
      setOpenState(item, willOpen);
    });
  });
})();

(function () {
  var revealGroups = [
    { selector: '.intro-left', effect: 'left' },
    { selector: '.intro-right', effect: 'right' },
    { selector: '.treatment-header', effect: 'up' },
    { selector: '.cards-grid .card', effect: 'zoom', stagger: 90 },
    { selector: '.treatment-footer', effect: 'up', delay: 140 },
    { selector: '.problems-img-col', effect: 'left' },
    { selector: '.problems-headline', effect: 'up', delay: 60 },
    { selector: '.problems-body', effect: 'right', delay: 120 },
    { selector: '.reviews-header', effect: 'up' },
    { selector: '.reviews-carousel', effect: 'zoom', delay: 80 },
    { selector: '.reviews-pagination', effect: 'up', delay: 140 },
    { selector: '.reviews-footer', effect: 'up', delay: 180 },
    { selector: '.profile-media', effect: 'left' },
    { selector: '.profile-content', effect: 'right', delay: 70 },
    { selector: '.faq-header', effect: 'up' },
    { selector: '.faq-item', effect: 'up', stagger: 80 },
    { selector: '.faq-footer', effect: 'up', delay: 140 },
    { selector: '.contact-header', effect: 'up' },
    { selector: '.contact-cards .contact-card', effect: 'zoom', stagger: 90 },
    { selector: '.contact-brand', effect: 'up', delay: 150 },
    { selector: '.contact-map-wrap', effect: 'right', delay: 80 },
    { selector: '.pl-method-head', effect: 'up' },
    { selector: '.pl-how', effect: 'up', delay: 60 },
    { selector: '.pl-step', effect: 'zoom', stagger: 90 },
    { selector: '.pl-method-footer', effect: 'up', delay: 140 },
    { selector: '.pl-benefits .pl-media', effect: 'zoom' },
    { selector: '.pl-benefits-head', effect: 'left' },
    { selector: '.pl-benefit', effect: 'up', stagger: 80 },
    { selector: '.site-footer-inner', effect: 'up' }
  ];
  var elements = [];
  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  function registerReveal(node, effect, delay) {
    if (!node || node.classList.contains('reveal-item')) return;
    node.classList.add('reveal-item');
    node.setAttribute('data-reveal', effect || 'up');
    node.style.setProperty('--reveal-delay', Math.min(delay || 0, 180) + 'ms');
    elements.push(node);
  }

  revealGroups.forEach(function (group) {
    var nodes = Array.from(document.querySelectorAll(group.selector));
    nodes.forEach(function (node, index) {
      registerReveal(node, group.effect, (group.delay || 0) + ((group.stagger || 0) * index));
    });
  });

  /* Blocos de condição e o cross-sell de Pilates alternam a direção */
  Array.from(document.querySelectorAll('.condition-block')).forEach(function (block, index) {
    var media = block.querySelector('.condition-media');
    var text = block.querySelector('.condition-text');
    var mediaEffect = index % 2 === 0 ? 'left' : 'right';
    var textEffect = index % 2 === 0 ? 'right' : 'left';
    registerReveal(media, mediaEffect, 0);
    registerReveal(text, textEffect, 70);
  });

  if (!elements.length) return;

  if (motionPreference.matches || !('IntersectionObserver' in window)) {
    elements.forEach(function (element) {
      element.classList.add('is-visible');
    });
    return;
  }

  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, {
        threshold: 0.06,
        rootMargin: '0px 0px 40px 0px'
      });

      elements.forEach(function (element) {
        observer.observe(element);
      });

      /* Rodapé no fim da página pode nunca atingir o limiar do observer */
      function revealNearBottom() {
        var scrollBottom = window.scrollY + window.innerHeight;
        var docHeight = document.documentElement.scrollHeight;
        if (docHeight - scrollBottom < 80) {
          elements.forEach(function (el) {
            if (!el.classList.contains('is-visible')) {
              el.classList.add('is-visible');
              observer.unobserve(el);
            }
          });
        }
      }
      window.addEventListener('scroll', revealNearBottom, { passive: true });
      revealNearBottom();

      motionPreference.addEventListener('change', function (event) {
        if (!event.matches) return;
        elements.forEach(function (element) { element.classList.add('is-visible'); });
        observer.disconnect();
      });
    });
  });
})();

/* Mapa: carrega o iframe só quando o bloco de contato se aproxima */
(function () {
  var wrap = document.getElementById('map-wrap');
  var facade = document.getElementById('map-facade');
  if (!wrap || !facade) return;

  function loadMap() {
    if (wrap.querySelector('iframe')) return;
    var iframe = document.createElement('iframe');
    iframe.className = 'contact-map';
    iframe.title = 'Mapa da Clínica Broggio - R. Rafael Aloisi, 287, Vila Rezende, Piracicaba - SP';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.src = 'https://www.google.com/maps?q=R.%20Rafael%20Aloisi,%20287%20-%20Vila%20Rezende,%20Piracicaba%20-%20SP,%2013405-205&z=17&output=embed';
    wrap.appendChild(iframe);
    facade.hidden = true;
  }

  facade.addEventListener('click', loadMap);

  if ('IntersectionObserver' in window) {
    var mapObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { loadMap(); mapObserver.disconnect(); }
    }, { rootMargin: '200px' });
    mapObserver.observe(wrap);
  }
})();

/* Modal de depoimento completo */
(function () {
  var modal = document.getElementById('review-modal');
  if (!modal) return;

  var panel = modal.querySelector('.review-modal__panel');
  var avatar = modal.querySelector('.review-modal__avatar');
  var title = modal.querySelector('.review-modal__title');
  var body = modal.querySelector('.review-modal__body');
  var lastFocus = null;

  function focusable() {
    return Array.from(modal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return el.offsetParent !== null; });
  }

  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    var items = focusable();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function open(card, trigger) {
    var source = card.querySelector('.rc-full-text');
    var name = card.querySelector('.rc-name');
    var cardAvatar = card.querySelector('.rc-avatar');
    if (!source || !name || !cardAvatar) return;

    lastFocus = trigger || document.activeElement;
    avatar.textContent = cardAvatar.textContent;
    title.textContent = name.textContent;
    body.innerHTML = source.innerHTML;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    panel.focus();
    document.addEventListener('keydown', onKey);
  }

  function close() {
    modal.hidden = true;
    body.innerHTML = '';
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var openBtn = e.target.closest('[data-review-open]');
    if (openBtn) {
      e.preventDefault();
      var card = openBtn.closest('.review-card');
      if (card) open(card, openBtn);
      return;
    }
    if (e.target.closest('[data-review-close]')) close();
  });
})();

/* Vídeos das condições: só baixam ao se aproximar da tela */
(function () {
  var videos = Array.from(document.querySelectorAll('.condition-video'));
  if (!videos.length) return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  function loadVideo(video) {
    if (video.dataset.loaded) return;
    video.dataset.loaded = '1';
    Array.from(video.querySelectorAll('source[data-src]')).forEach(function (source) {
      source.src = source.getAttribute('data-src');
      source.removeAttribute('data-src');
    });
    video.load();
    var attempt = video.play();
    if (attempt && attempt.catch) attempt.catch(function () {});
  }

  if (!('IntersectionObserver' in window)) {
    videos.forEach(loadVideo);
    return;
  }

  var videoObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      loadVideo(entry.target);
      videoObserver.unobserve(entry.target);
    });
  }, { rootMargin: '200px 0px' });

  videos.forEach(function (video) { videoObserver.observe(video); });
})();

(function () {
  var yearEl = document.getElementById('footer-year');
  if (!yearEl) return;
  yearEl.textContent = new Date().getFullYear();
})();
