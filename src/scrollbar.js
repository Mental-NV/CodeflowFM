// An explicit scrollbar stays visible on systems that hide native overlay bars.
export function installScrollbar(viewport, content, rail) {
  const thumb = rail.firstElementChild;
  let metrics = { range: 0, travel: 0 };
  function update() {
    const range = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    rail.hidden = range <= 1;
    if (rail.hidden) return;
    const height = Math.min(rail.clientHeight, Math.max(28, rail.clientHeight * viewport.clientHeight / viewport.scrollHeight));
    const travel = rail.clientHeight - height;
    metrics = { range, travel };
    thumb.style.height = `${height}px`;
    thumb.style.transform = `translateY(${travel * viewport.scrollTop / range}px)`;
    rail.setAttribute('aria-valuenow', String(Math.round(100 * viewport.scrollTop / range)));
  }
  viewport.addEventListener('scroll', update, { passive: true });
  const observer = new ResizeObserver(update);
  observer.observe(viewport);
  observer.observe(content);
  rail.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    rail.focus();
    const thumbRect = thumb.getBoundingClientRect();
    const grabOffset = event.target === thumb ? event.clientY - thumbRect.top : thumbRect.height / 2;
    function move(event) {
      const y = event.clientY - rail.getBoundingClientRect().top - grabOffset;
      viewport.scrollTop = metrics.travel ? Math.max(0, Math.min(1, y / metrics.travel)) * metrics.range : 0;
    }
    move(event);
    rail.setPointerCapture(event.pointerId);
    rail.addEventListener('pointermove', move);
    function end() {
      rail.removeEventListener('pointermove', move);
      rail.removeEventListener('pointerup', end);
      rail.removeEventListener('pointercancel', end);
    }
    rail.addEventListener('pointerup', end);
    rail.addEventListener('pointercancel', end);
  });
  rail.addEventListener('keydown', event => {
    const positions = {
      ArrowDown: viewport.scrollTop + 48, ArrowUp: viewport.scrollTop - 48,
      PageDown: viewport.scrollTop + viewport.clientHeight,
      PageUp: viewport.scrollTop - viewport.clientHeight,
      Home: 0, End: metrics.range,
    };
    if (event.key in positions) { event.preventDefault(); viewport.scrollTop = positions[event.key]; }
  });
  update();
}
