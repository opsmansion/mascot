export function initChoiceDropdowns() {
  const dropdowns = [...document.querySelectorAll<HTMLDetailsElement>("[data-choice-dropdown]")];

  for (const dropdown of dropdowns) {
    const summary = dropdown.querySelector<HTMLElement>("summary")!;
    const label = dropdown.querySelector<HTMLElement>("[data-choice-label]")!;
    const options = [...dropdown.querySelectorAll<HTMLButtonElement>("[data-choice-option]")];

    dropdown.addEventListener("click", (event) => {
      const option = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-choice-option]");
      if (!option) return;
      for (const item of options) item.setAttribute("aria-pressed", String(item === option));
      dropdown.dataset.choiceValue = option.dataset.value ?? "";
      label.textContent = option.dataset.label ?? "";
      dropdown.open = false;
      summary.focus();
      dropdown.dispatchEvent(new Event("change", { bubbles: true }));
    });

    summary.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      dropdown.open = true;
      const selected = options.find((option) => option.getAttribute("aria-pressed") === "true");
      (selected ?? (event.key === "ArrowDown" ? options[0] : options.at(-1)))?.focus();
    });

    dropdown.addEventListener("keydown", (event) => {
      const option = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-choice-option]");
      if (event.key === "Escape") {
        dropdown.open = false;
        summary.focus();
      } else if (option && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const index = options.indexOf(option);
        const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : event.key === "ArrowDown" ? Math.min(index + 1, options.length - 1) : Math.max(index - 1, 0);
        options[next]?.focus();
      }
    });

    dropdown.addEventListener("focusout", (event) => {
      if (!dropdown.contains(event.relatedTarget as Node | null)) dropdown.open = false;
    });
  }

  document.addEventListener("pointerdown", (event) => {
    for (const dropdown of dropdowns) {
      if (!dropdown.contains(event.target as Node)) dropdown.open = false;
    }
  });
}
