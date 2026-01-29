/**
 * Dev-only utility to detect horizontal overflow issues.
 * Only runs in development mode.
 */

function checkOverflow(): void {
  const { scrollWidth, clientWidth } = document.documentElement;
  const overflow = scrollWidth - clientWidth;

  if (overflow > 0) {
    console.warn(
      `⚠️ [Overflow Guard] Horizontal overflow detected!\n` +
      `   scrollWidth: ${scrollWidth}px, clientWidth: ${clientWidth}px\n` +
      `   Overflow: ${overflow}px\n\n` +
      `   Tips: Look for elements with:\n` +
      `   - width: 100vw (use 100% instead)\n` +
      `   - negative margins (-ml-*, -mr-*)\n` +
      `   - fixed widths larger than viewport\n` +
      `   - translate-x causing overflow\n\n` +
      `   Debug: Run this in console to find culprits:\n` +
      `   document.querySelectorAll('*').forEach(el => {\n` +
      `     if (el.scrollWidth > document.documentElement.clientWidth) {\n` +
      `       console.log(el, el.scrollWidth);\n` +
      `     }\n` +
      `   });`
    );
  }
}

function throttle<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timeout) return;
    timeout = setTimeout(() => {
      fn(...args);
      timeout = null;
    }, ms);
  }) as T;
}

export function installOverflowGuard(): void {
  // Only run in development
  if (!import.meta.env.DEV) return;

  const throttledCheck = throttle(checkOverflow, 500);

  // Check after initial load
  if (document.readyState === 'complete') {
    setTimeout(checkOverflow, 100);
  } else {
    window.addEventListener('load', () => setTimeout(checkOverflow, 100));
  }

  // Check on resize
  window.addEventListener('resize', throttledCheck);

  // Also check after route changes (for SPAs)
  const observer = new MutationObserver(throttledCheck);
  observer.observe(document.body, { childList: true, subtree: true });

  console.log('🔍 [Overflow Guard] Installed (dev only)');
}
