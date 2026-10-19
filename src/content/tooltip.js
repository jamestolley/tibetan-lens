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
    SCONJ: "Subordinator",
    INTJ: "Interjection",
    PUNCT: "Punctuation",
    AUX: "Auxiliary",
    OTHER: "Other",
    X: "Unknown"
  };

  function friendlyPos(pos) {
    if (!pos) {
      return extension.i18n.getMessage("posUnknown") || "Unknown";
    }
    return extension.i18n.getMessage(`pos_${pos}`, POS_LABELS[pos] || pos);
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

  function cleanNotes(notesString) {
    if (!notesString) {
      return "";
    }
    return notesString
      .split(" | ")
      .filter((part) => !/^\s*POS:/.test(part) && part.trim())
      .join(" | ");
  }

  function setSaveState(button, saved) {
    const label = extension.i18n.getMessage(saved ? "savedWord" : "saveWord");
    button.textContent = saved ? "★" : "☆";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(saved));
  }

  function setKnownState(button, known) {
    const label = extension.i18n.getMessage(known ? "unmarkKnown" : "markKnown");
    button.title = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(known));
  }

  // Star (save / unsave) and check mark (known / not known) for the word.
  function createWordActions(headword, glosses) {
    if (!extension.wordList || !headword) {
      return null;
    }

    const actions = document.createElement("span");
    actions.className = "tibetan-extension-tooltip-actions";
    const known = document.createElement("button");
    known.type = "button";
    known.className = "tibetan-extension-tooltip-known";
    known.textContent = "✓";
    setKnownState(known, false);
    const save = document.createElement("button");
    save.type = "button";
    save.className = "tibetan-extension-tooltip-save";
    setSaveState(save, false);
    actions.append(known, save);

    const word = { headword, glosses, source: { url: window.location.href, title: document.title } };
    function show(record) {
      setSaveState(save, Boolean(record));
      setKnownState(known, Boolean(record?.known));
    }

    // Storage becomes unavailable once the extension reloads under this page.
    function handle(action) {
      return async (event) => {
        event.preventDefault();
        event.stopPropagation();
        try {
          await action();
          show(await extension.wordList.get(headword));
        } catch (_error) {
          actions.remove();
        }
      };
    }

    extension.wordList.get(headword).then(show).catch(() => actions.remove());
    save.addEventListener("click", handle(() => extension.wordList.toggle(word)));
    known.addEventListener(
      "click",
      handle(async () => {
        const record = await extension.wordList.get(headword);
        await extension.wordList.setKnown(word, !record?.known);
      })
    );
    return actions;
  }

  function renderTooltipContent(payload) {
    const { term, lookupTerm, pos, posList, posInferred, entries, parts, settings } = payload;
    const fragment = document.createDocumentFragment();

    const heading = document.createElement("div");
    heading.className = "tibetan-extension-tooltip-heading";
    const headingText = document.createElement("span");
    headingText.textContent = term;
    heading.appendChild(headingText);
    const savedGlosses = entries.length
      ? entries.flatMap((entry) => entry.glosses || [])
      : (parts || []).map((item) => `${item.part}་ ${item.gloss}`);
    const actions = createWordActions(lookupTerm || term, savedGlosses);
    if (actions) {
      heading.appendChild(actions);
    }
    fragment.appendChild(heading);

    const extras = document.createElement("div");
    extras.className = "tibetan-extension-tooltip-extras";

    const tags = Array.isArray(posList) && posList.length ? posList : pos ? [pos] : [];
    if (tags.length) {
      const posTag = document.createElement("span");
      posTag.className = "tibetan-extension-tooltip-pos";
      posTag.textContent = tags.map(friendlyPos).join(" · ");
      extras.appendChild(posTag);

      if (posInferred) {
        const likelyTag = document.createElement("span");
        likelyTag.className = "tibetan-extension-tooltip-pos-inferred";
        likelyTag.textContent =
          extension.i18n.getMessage("posInferred") || "likely";
        extras.appendChild(likelyTag);
      }
    }

    if (settings?.showWylie) {
      const wylie = extension.tibetan.toWylie(term);
      if (wylie) {
        const wylieEl = document.createElement("span");
        wylieEl.className = "tibetan-extension-tooltip-wylie";
        wylieEl.textContent = wylie;
        extras.appendChild(wylieEl);
      }
    }

    if (settings?.showPhonetic) {
      const phonetic = extension.tibetan.toPhonetic(term);
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
      if (Array.isArray(parts) && parts.length) {
        const partsLabel = document.createElement("div");
        partsLabel.className = "tibetan-extension-tooltip-label";
        partsLabel.textContent =
          extension.i18n.getMessage("wordParts") || "Word parts";
        fragment.appendChild(partsLabel);

        const partsList = document.createElement("div");
        partsList.className = "tibetan-extension-tooltip-parts";
        partsList.textContent = parts
          .map((item) => `${item.part}་ — ${item.gloss}`)
          .join("\n");
        fragment.appendChild(partsList);
      } else {
        const emptyState = document.createElement("div");
        emptyState.className = "tibetan-extension-tooltip-empty";
        emptyState.textContent = extension.i18n.getMessage(
          tags.length ? "noDefinitionWithPos" : "noEnabledDictionary"
        );
        fragment.appendChild(emptyState);
      }
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

  const SENTENCE_PREVIEW_LENGTH = 220;

  function renderSentenceContent({ sentence, url }) {
    const fragment = document.createDocumentFragment();

    const label = document.createElement("div");
    label.className = "tibetan-extension-tooltip-label";
    label.textContent = extension.i18n.getMessage("translateSentence");
    fragment.appendChild(label);

    const preview = document.createElement("div");
    preview.className = "tibetan-extension-tooltip-sentence";
    preview.lang = "bo";
    preview.textContent =
      sentence.length > SENTENCE_PREVIEW_LENGTH ? `${sentence.slice(0, SENTENCE_PREVIEW_LENGTH)}…` : `${sentence}།`;
    fragment.appendChild(preview);

    const link = document.createElement("a");
    link.className = "tibetan-extension-tooltip-translate";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `${extension.i18n.getMessage("openInGoogleTranslate")} ↗`;
    fragment.appendChild(link);

    return fragment;
  }

  function showContent(anchor, content) {
    const node = ensureTooltip();
    node.innerHTML = "";
    node.appendChild(content);
    node.classList.add(tooltipVisible);
    positionTooltip(anchor, node);
  }

  extension.tooltip = {
    showTooltip(anchor, payload) {
      showContent(anchor, renderTooltipContent(payload));
    },

    // payload: { sentence, url } — the sentence a shad ends and its Google Translate link.
    showSentence(anchor, payload) {
      showContent(anchor, renderSentenceContent(payload));
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
