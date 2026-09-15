(function () {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:399;';
  document.body.appendChild(overlay);

  const popup = document.createElement('div');
  popup.className = 'term-popup hidden';
  popup.innerHTML = '<div class="term-popup-title"></div><div class="term-popup-body"></div>';
  document.body.appendChild(popup);

  let active = null;

  function isMobile() {
    return window.innerWidth < 768;
  }

  function show(term) {
    if (active === term) { hide(); return; }
    active = term;
    document.dispatchEvent(new CustomEvent('term-popup-show'));
    popup.querySelector('.term-popup-title').textContent = term.dataset.title || '';
    popup.querySelector('.term-popup-body').textContent = term.dataset.text || '';
    popup.classList.remove('hidden');
    if (!isMobile()) {
      place(term);
    } else {
      popup.style.top = 'auto';
      popup.style.bottom = '0';
      popup.style.left = '0';
      popup.style.right = '0';
      overlay.style.display = 'block';
    }
  }

  function hide() {
    popup.classList.add('hidden');
    overlay.style.display = 'none';
    popup.style.top = '';
    popup.style.bottom = '';
    popup.style.left = '';
    popup.style.right = '';
    active = null;
  }

  function place(term) {
    popup.style.top = '0';
    popup.style.left = '0';
    popup.classList.remove('arrow-up', 'arrow-down');

    const r = term.getBoundingClientRect();
    const pw = popup.offsetWidth;
    const ph = popup.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 10;
    const arrowH = 10;

    let top, arrowClass;
    if (r.bottom + arrowH + ph + gap <= vh) {
      top = r.bottom + arrowH;
      arrowClass = 'arrow-up';
    } else {
      top = r.top - ph - arrowH;
      arrowClass = 'arrow-down';
    }
    if (top < gap) top = gap;

    let left = r.left + r.width / 2 - pw / 2;
    left = Math.max(gap, Math.min(left, vw - pw - gap));

    const caretLeft = Math.max(12, Math.min((r.left + r.width / 2) - left, pw - 12));

    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
    popup.style.setProperty('--caret-left', caretLeft + 'px');
    popup.classList.add(arrowClass);
  }

  document.addEventListener('click', function (e) {
    const term = e.target.closest('.term');
    if (term) { e.stopPropagation(); show(term); return; }
    if (!e.target.closest('.term-popup')) hide();
  });

  overlay.addEventListener('click', hide);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hide();
  });

  window.addEventListener('scroll', hide, { passive: true });
})();
