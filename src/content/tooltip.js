(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});
  const { tooltip, tooltipVisible } = extension.constants.classes;

  const POS_LABELS = {
    PROPN: "Proper noun",
    NOUN: "Noun",
    VERB: "Verb",
    ADJ: "Adjective",
    ADV: "Adverb",
    PRON: "Pronoun",
    DET: "Determiner",
    ADP: "Adposition",
    PART: "Particle",
    NUM: "Number",
    CONJ: "Conjunction",
    INTJ: "Interjection",
    PUNCT: "Punctuation"
  };

  function friendlyPos(pos) {
    if (!pos) {
      return "";
    }
    return POS_LABELS[pos] || pos;
  }

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

    node.addEventListener("mouseenter", () => {
      if (typeof extension.tooltip.onMouseEnter === "function") {
        extension.tooltip.onMouseEnter();
      }
    });

    node.addEventListener("mouseleave", () => {
      if (typeof extension.tooltip.onMouseLeave === "function") {
        extension.tooltip.onMouseLeave();
      }
    });

    (document.body || document.documentElement).appendChild(node);
    return node;
  }

  function getWylie(term) {
    if (typeof window !== "undefined" && window.jsEWTS && typeof window.jsEWTS.toWylie === "function") {
      return window.jsEWTS.toWylie(term).trim();
    }
    return "";
  }

  function getPhonetic(term) {
    if (typeof window !== "undefined" && window.TibetanConverter && typeof window.TibetanConverter.get_phonetics === "function") {
      try {
        return window.TibetanConverter.get_phonetics({ style: "thl", lang: "en" }).phonetics(term, { autosplit: true });
      } catch (_e) {
        return "";
      }
    }
    return "";
  }

  function cleanNotes(notesString) {
    if (!notesString) {
      return "";
    }
    return notesString
      .replace(/POS:\s*[^\s|,)]+/g, "")
      .replace(/,\s*$/, "")
      .trim();
  }

  function renderTooltipContent(payload) {
    const { term, pos, entries, settings } = payload;
    const fragment = document.createDocumentFragment();

    const heading = document.createElement("div");
    heading.className = "tibetan-extension-tooltip-heading";
    heading.textContent = term;
    fragment.appendChild(heading);

    const extras = document.createElement("div");
    extras.className = "tibetan-extension-tooltip-extras";

    const friendlyPartOfSpeech = friendlyPos(pos);
    if (friendlyPartOfSpeech) {
      const posTag = document.createElement("span");
      posTag.className = "tibetan-extension-tooltip-pos";
      posTag.textContent = friendlyPartOfSpeech;
      extras.appendChild(posTag);
    }

    if (settings?.showWylie) {
      const wylie = getWylie(term);
      if (wylie) {
        const wylieEl = document.createElement("span");
        wylieEl.className = "tibetan-extension-tooltip-wylie";
        wylieEl.textContent = wylie;
        extras.appendChild(wylieEl);
      }
    }

    if (settings?.showPhonetic) {
      const phonetic = getPhonetic(term);
      if (phonetic) {
        const phoneticEl = document.createElement("span");
        phoneticEl.className = "tibetan-extension-tooltip-phonetic";
        phoneticEl.textContent = phonetic;
        extras.appendChild(phoneticEl);
      }
    }

    if (extras.childNodes.length) {
      fragment.appendChild(extras);
    }

    const allGlosses = [];
    const allNotes = [];
    entries.forEach((entry) => {
      allGlosses.push(...(entry.glosses || []));
      const cleaned = cleanNotes(entry.notes);
      if (cleaned) allNotes.push(cleaned);
    });

    const uniqueGlosses = [...new Set(allGlosses)];
    const uniqueNotes = [...new Set(allNotes)].filter(Boolean);

    if (!uniqueGlosses.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "tibetan-extension-tooltip-empty";
      emptyState.textContent = "No enabled dictionary has a definition for this term yet.";
      fragment.appendChild(emptyState);
      return fragment;
    }

    const combinedGloss = document.createElement("div");
    combinedGloss.className = "tibetan-extension-tooltip-gloss";
    combinedGloss.textContent = uniqueGlosses.join("; ");
    fragment.appendChild(combinedGloss);

    if (uniqueNotes.length) {
      const notes = document.createElement("div");
      notes.className = "tibetan-extension-tooltip-notes";
      notes.textContent = uniqueNotes.join(" | ");
      fragment.appendChild(notes);
    }

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
      node.appendChild(renderTooltipContent(payload));
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
