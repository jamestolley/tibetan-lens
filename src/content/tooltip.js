(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});
  const { tooltip, tooltipVisible } = extension.constants.classes;

  function ensureTooltip() {
    let node = document.getElementById(tooltip);

    if (node) {
      return node;
    }

    node = document.createElement("aside");
    node.id = tooltip;
    node.className = tooltip;
    node.setAttribute("role", "dialog");
    node.setAttribute("aria-live", "polite");
    (document.body || document.documentElement).appendChild(node);
    return node;
  }

  function renderTooltipContent(term, entries, language) {
    const fragment = document.createDocumentFragment();
    const heading = document.createElement("div");
    heading.className = "tibetan-extension-tooltip-heading";
    heading.textContent = term;
    fragment.appendChild(heading);

    const subheading = document.createElement("div");
    subheading.className = "tibetan-extension-tooltip-subheading";
    subheading.textContent = `Translation language: ${language.toUpperCase()}`;
    fragment.appendChild(subheading);

    if (!entries.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "tibetan-extension-tooltip-empty";
      emptyState.textContent = "No enabled dictionary has a definition for this term yet.";
      fragment.appendChild(emptyState);
      return fragment;
    }

    entries.forEach((entry) => {
      const entryNode = document.createElement("section");
      entryNode.className = "tibetan-extension-tooltip-entry";

      const label = document.createElement("div");
      label.className = "tibetan-extension-tooltip-label";
      label.textContent = entry.dictionaryLabel;
      entryNode.appendChild(label);

      const gloss = document.createElement("div");
      gloss.className = "tibetan-extension-tooltip-gloss";
      gloss.textContent = entry.glosses.join("; ");
      entryNode.appendChild(gloss);

      if (entry.notes) {
        const notes = document.createElement("div");
        notes.className = "tibetan-extension-tooltip-notes";
        notes.textContent = entry.notes;
        entryNode.appendChild(notes);
      }

      fragment.appendChild(entryNode);
    });

    return fragment;
  }

  function positionTooltip(anchor, node) {
    const rect = anchor.getBoundingClientRect();
    const viewportLeft = window.scrollX + 12;
    const viewportRight = window.scrollX + window.innerWidth - 12;
    const bottomAlignedTop = window.scrollY + rect.bottom + 10;
    const topAlignedTop = window.scrollY + rect.top - node.offsetHeight - 10;
    const top =
      bottomAlignedTop + node.offsetHeight > window.scrollY + window.innerHeight - 12
        ? Math.max(window.scrollY + 12, topAlignedTop)
        : bottomAlignedTop;

    const unclampedLeft = window.scrollX + rect.left;
    const left = Math.min(Math.max(unclampedLeft, viewportLeft), viewportRight - node.offsetWidth);

    node.style.top = `${top}px`;
    node.style.left = `${left}px`;
  }

  extension.tooltip = {
    showTooltip(anchor, payload) {
      const node = ensureTooltip();
      node.innerHTML = "";
      node.appendChild(renderTooltipContent(payload.term, payload.entries, payload.language));
      node.classList.add(tooltipVisible);
      positionTooltip(anchor, node);
    },

    hideTooltip() {
      const node = document.getElementById(tooltip);

      if (node) {
        node.classList.remove(tooltipVisible);
      }
    },

    isTooltipElement(node) {
      return node instanceof Element && Boolean(node.closest(`#${tooltip}`));
    }
  };
})();
