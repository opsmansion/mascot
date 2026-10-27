export async function animateFlow(element: HTMLElement, className: string) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  element.classList.add(className);
  await new Promise((resolve) => window.setTimeout(resolve, 150));
  element.classList.remove(className);
}
