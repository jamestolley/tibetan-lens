(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  const state = {
    initialized: false,
    isRendering: false,
    ignoreMutationsUntil: 0,
    observer: null,
    refreshTimer: null,
    tooltipHideTimer: null,
    linkChoiceWord: null,
    linkChoiceAnchor: null,
    settings: null,
    spinner: null,
    stats: {
      processedNodes: 0,
      annotatedWords: 0
    }
  };

  function extensionContextValid() {
    try {
      return Boolean(chrome?.runtime?.id);
    } catch (_error) {
      return false;
    }
  }

  function teardownIfInvalidated() {
    if (extensionContextValid()) {
      return false;
    }

    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    if (state.refreshTimer) {
      window.clearTimeout(state.refreshTimer);
      state.refreshTimer = null;
    }

    state.initialized = false;
    console.warn("[TibetanLens] Extension context invalidated (extension was reloaded/updated). Reload this page to re-enable Tibetan Lens.");
    return true;
  }

  function createWordElement(token) {
    const element = document.createElement("span");
    const posClass = state.settings?.colorByPos
      ? `tibetan-extension-word--${token.pos || "UNKNOWN"}`
      : "";
    element.className = [
      extension.constants.classes.word,
      token.matched ? extension.constants.classes.wordMatched : extension.constants.classes.wordUnmatched,
      posClass
    ].filter(Boolean).join(" ");
    element.tabIndex = 0;
    element.setAttribute("role", "button");
    element.dataset.term = token.text;
    element.dataset.lookupKey = token.lookupKey || token.text;
    element.dataset.pos = token.pos || "";
    element.dataset.posList = (token.posList || []).join("|");
    element.dataset.posInferred = token.posInferred ? "1" : "";

    const TSEK = "་";
    element.textContent =
      token.text && !/[\u0f0b-\u0f14]$/.test(token.text)
        ? token.text + TSEK
        : token.text;

    if (state.settings?.minTibetanFontSize) {
      element.style.fontSize = `max(1em, ${state.settings.minTibetanFontSize}px)`;
    }

    return element;
  }

  function appendTokens(fragment, tokens) {
    let annotatedWords = 0;

    tokens.forEach((token, index) => {
      if (token.type === "word") {
        fragment.appendChild(createWordElement(token));
        annotatedWords += 1;

        const nextToken = tokens[index + 1];
        if (state.settings.insertSpaces && nextToken && nextToken.type === "word") {
          fragment.appendChild(document.createTextNode(" "));
        }

        return;
      }

      fragment.appendChild(document.createTextNode(token.text));
    });

    return annotatedWords;
  }

  function renderTextNode(textNode) {
    const fragment = document.createDocumentFragment();
    const segments = extension.tibetan.splitByTibetanRuns(textNode.textContent || "");
    let annotatedWords = 0;

    segments.forEach((segment) => {
      if (segment.type === "text") {
        fragment.appendChild(document.createTextNode(segment.text));
        return;
      }

      annotatedWords += appendTokens(fragment, extension.tokenizer.segment(segment.text, state.settings));
    });

    extension.replacementEngine.replaceTextNode(textNode, fragment);
    return annotatedWords;
  }

  function resetStats() {
    state.stats = {
      processedNodes: 0,
      annotatedWords: 0
    };
  }

  function scanDocument() {
    console.log('[TibetanLens] scanDocument starting...');
    extension.replacementEngine.restoreProcessedNodes(document);
    extension.tooltip.hideTooltip();
    resetStats();

    if (!state.settings || !state.settings.extensionEnabled) {
      console.warn('[TibetanLens] scanDocument aborted — extensionEnabled:', state.settings?.extensionEnabled, 'settings:', !!state.settings);
      return state.stats;
    }

    document.documentElement.setAttribute(
      "data-tibetan-extension-pos-theme",
      state.settings.posColorTheme || "vivid"
    );

    const root = document.body || document.documentElement;
    const nodes = extension.replacementEngine.collectTextNodes(root);
    console.log('[TibetanLens] found', nodes.length, 'text nodes to process');

    nodes.forEach((textNode) => {
      state.stats.processedNodes += 1;
      state.stats.annotatedWords += renderTextNode(textNode);
    });

    console.log('[TibetanLens] scanDocument done — processed:', state.stats.processedNodes, 'annotated:', state.stats.annotatedWords);
    state.ignoreMutationsUntil = Date.now() + 250;
    return state.stats;
  }

  function ensureSpinner() {
    if (state.spinner) {
      return state.spinner;
    }

    const node = document.createElement("div");
    node.id = "tibetan-lens-loading";
    node.className = "tibetan-lens-loading";
    node.setAttribute("aria-live", "polite");
    node.setAttribute("aria-label", "Tibetan Lens is loading");
    node.innerHTML = `<div class="tibetan-lens-spinner" role="status" aria-hidden="true"></div><span class="tibetan-lens-loading-text">${extension.i18n.getMessage("loadingDefault")}</span>`;
    (document.body || document.documentElement).appendChild(node);
    state.spinner = node;
    return node;
  }

  function showSpinner(message) {
    const node = ensureSpinner();
    const text = node.querySelector(".tibetan-lens-loading-text");
    if (text) text.textContent = message || extension.i18n.getMessage("loadingDefault");
    node.classList.add("is-visible");
  }

  function hideSpinner() {
    if (state.spinner) {
      state.spinner.classList.remove("is-visible");
    }
  }

  async function refreshAnnotations() {
    if (teardownIfInvalidated()) {
      return state.stats;
    }

    if (state.isRendering) {
      console.log('[TibetanLens] refreshAnnotations skipped — already rendering');
      return state.stats;
    }

    state.isRendering = true;
    showSpinner(extension.i18n.getMessage('loadingDictionaries'));
    console.log('[TibetanLens] refreshAnnotations starting...');

    try {
      state.settings = await extension.storage.getSettings();
      console.log('[TibetanLens] settings loaded:', JSON.stringify(state.settings, null, 2));

      if (typeof extension.tokenizer.ensureReady === "function") {
        console.log('[TibetanLens] loading tokenizer pack...');
        await extension.tokenizer.ensureReady(state.settings);
        console.log('[TibetanLens] tokenizer pack loaded successfully');
      } else {
        console.warn('[TibetanLens] extension.tokenizer.ensureReady is not a function!');
      }

      const stats = scanDocument();
      console.log('[TibetanLens] scanDocument complete:', stats);
      return stats;
    } catch (err) {
      console.error('[TibetanLens] refreshAnnotations ERROR:', err);
      throw err;
    } finally {
      hideSpinner();
      state.isRendering = false;
    }
  }

  function scheduleRefresh() {
    if (state.refreshTimer) {
      window.clearTimeout(state.refreshTimer);
    }

    state.refreshTimer = window.setTimeout(() => {
      state.refreshTimer = null;
      refreshAnnotations();
    }, 180);
  }

  function mergeTooltipEntries(primaryEntries, fallbackEntries) {
    const seen = new Set();

    return [...primaryEntries, ...fallbackEntries].filter((entry) => {
      const key = JSON.stringify(entry);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  function showTooltipForWord(wordElement) {
    const lookupTerm = wordElement.dataset.lookupKey || wordElement.dataset.term || "";
    const entries = mergeTooltipEntries(
      extension.dictionary.lookup(lookupTerm, state.settings),
      typeof extension.botokLookup?.lookup === "function"
        ? extension.botokLookup.lookup(lookupTerm, state.settings)
        : []
    );

    extension.tooltip.showTooltip(wordElement, {
      term: wordElement.dataset.term || wordElement.textContent || "",
      pos: wordElement.dataset.pos || "",
      posList: (wordElement.dataset.posList || "").split("|").filter(Boolean),
      posInferred: wordElement.dataset.posInferred === "1",
      entries,
      settings: state.settings
    });
  }

  function scheduleHideTooltip() {
    state.tooltipHideTimer = window.setTimeout(() => {
      extension.tooltip.hideTooltip();
      state.tooltipHideTimer = null;
    }, 200);
  }

  function cancelHideTooltip() {
    if (state.tooltipHideTimer) {
      window.clearTimeout(state.tooltipHideTimer);
      state.tooltipHideTimer = null;
    }
  }

  function handleDocumentClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest(`#${extension.constants.classes.linkChoice}`)) {
      return;
    }

    if (state.settings?.tooltipMode !== "click") {
      hideLinkChoice();
      return;
    }

    const word = target.closest(`.${extension.constants.classes.word}`);
    if (!word) {
      if (!extension.tooltip.isTooltipElement(target)) {
        extension.tooltip.hideTooltip();
      }
      hideLinkChoice();
      return;
    }

    const anchor = word.closest("a");
    if (anchor) {
      if (state.settings?.linkClickPrompt) {
        event.preventDefault();
        event.stopPropagation();
        showLinkChoice(word, anchor);
      } else {
        hideLinkChoice();
        // Let the click follow the link normally. Hover still shows the tooltip (3a).
      }
      return;
    }

    hideLinkChoice();
    cancelHideTooltip();
    showTooltipForWord(word);
  }
  function handleMouseOver(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const word = target.closest(`.${extension.constants.classes.word}`);
    if (!word) {
      return;
    }

    const inAnchor = word.closest("a");

    if (state.settings?.tooltipMode === "click") {
      if (!inAnchor) {
        return;
      }

      if (event.relatedTarget instanceof Element && word.contains(event.relatedTarget)) {
        return;
      }

      cancelHideTooltip();
      showTooltipForWord(word);
      return;
    }

    if (state.settings?.tooltipMode !== "hover") {
      return;
    }

    if (event.relatedTarget instanceof Element && word.contains(event.relatedTarget)) {
      return;
    }

    cancelHideTooltip();
    showTooltipForWord(word);
  }
  function handleMouseOut(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const word = target.closest(`.${extension.constants.classes.word}`);
    if (!word) {
      return;
    }

    if (state.settings?.tooltipMode === "click") {
      if (!word.closest("a")) {
        return;
      }

      if (event.relatedTarget instanceof Element) {
        if (word.contains(event.relatedTarget)) {
          return;
        }
        if (extension.tooltip.isTooltipElement(event.relatedTarget)) {
          return;
        }
        if (event.relatedTarget.closest(`#${extension.constants.classes.linkChoice}`)) {
          return;
        }
      }

      scheduleHideTooltip();
      return;
    }

    if (state.settings?.tooltipMode !== "hover") {
      return;
    }

    if (event.relatedTarget instanceof Element) {
      if (word.contains(event.relatedTarget)) {
        return;
      }
      if (extension.tooltip.isTooltipElement(event.relatedTarget)) {
        return;
      }
    }

    scheduleHideTooltip();
  }
  function handleTooltipMouseEnter() {
    cancelHideTooltip();
  }

  function handleTooltipMouseLeave() {
    scheduleHideTooltip();
  }

  function handleFocusIn(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const word = target.closest(`.${extension.constants.classes.word}`);
    if (word) {
      cancelHideTooltip();
      showTooltipForWord(word);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      cancelHideTooltip();
      extension.tooltip.hideTooltip();
      hideLinkChoice();
    }
  }
  function shouldRefreshForMutation(mutation) {
    const ignoreSelector = `.${extension.constants.classes.processedNode}, #${extension.constants.classes.tooltip}, .${extension.constants.classes.linkChoice}, #${extension.constants.classes.linkChoice}`;

    if (mutation.type === "characterData") {
      const parent = mutation.target.parentElement;
      if (parent?.closest(ignoreSelector)) {
        return false;
      }

      return extension.tibetan.containsTibetan(mutation.target.textContent || "");
    }

    return Array.from(mutation.addedNodes).some((node) => {
      if (node instanceof Element) {
        if (node.closest(ignoreSelector)) {
          return false;
        }

        return extension.tibetan.containsTibetan(node.textContent || "");
      }

      if (node instanceof Text) {
        return extension.tibetan.containsTibetan(node.textContent || "");
      }

      return false;
    });
  }
  function observeDocument() {
    if (state.observer) {
      return;
    }

    state.observer = new MutationObserver((mutations) => {
      if (teardownIfInvalidated()) {
        return;
      }

      if (state.isRendering || !state.settings?.extensionEnabled) {
        return;
      }

      if (Date.now() < state.ignoreMutationsUntil) {
        return;
      }

      if (mutations.some(shouldRefreshForMutation)) {
        scheduleRefresh();
      }
    });

    state.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

    function ensureLinkChoice() {
    let node = document.getElementById(extension.constants.classes.linkChoice);
    if (node) {
      return node;
    }

    node = document.createElement("div");
    node.id = extension.constants.classes.linkChoice;
    node.className = extension.constants.classes.linkChoice;
    node.setAttribute("role", "dialog");
    node.setAttribute("aria-live", "polite");

    const followBtn = document.createElement("button");
    followBtn.type = "button";
    followBtn.className = "tibetan-extension-link-choice__primary";
    followBtn.dataset.action = "follow";

    const showBtn = document.createElement("button");
    showBtn.type = "button";
    showBtn.className = "tibetan-extension-link-choice__secondary";
    showBtn.dataset.action = "show";

    node.appendChild(followBtn);
    node.appendChild(showBtn);
    node.addEventListener("click", handleLinkChoiceClick);

    (document.body || document.documentElement).appendChild(node);
    return node;
  }

  function positionLinkChoice(anchor) {
    const node = ensureLinkChoice();
    const rect = anchor.getBoundingClientRect();
    const viewportLeft = window.scrollX + 12;
    const viewportRight = window.scrollX + window.innerWidth - 12;
    const bottomAlignedTop = window.scrollY + rect.bottom + 8;
    const topAlignedTop = window.scrollY + rect.top - node.offsetHeight - 8;
    const top =
      bottomAlignedTop + node.offsetHeight > window.scrollY + window.innerHeight - 12
        ? Math.max(window.scrollY + 12, topAlignedTop)
        : bottomAlignedTop;

    const unclampedLeft = window.scrollX + rect.left;
    const left = Math.min(Math.max(unclampedLeft, viewportLeft), viewportRight - node.offsetWidth);

    node.style.top = `${top}px`;
    node.style.left = `${left}px`;
  }

  function showLinkChoice(word, anchor) {
    extension.tooltip.hideTooltip();
    cancelHideTooltip();
    hideLinkChoice();

    const node = ensureLinkChoice();
    state.linkChoiceWord = word;
    state.linkChoiceAnchor = anchor;

    node.querySelector('[data-action="follow"]').textContent = extension.i18n.getMessage("followLink");
    node.querySelector('[data-action="show"]').textContent = extension.i18n.getMessage("showTranslation");

    node.classList.add("is-visible");
    positionLinkChoice(word);
  }

  function hideLinkChoice() {
    const node = document.getElementById(extension.constants.classes.linkChoice);
    if (node) {
      node.classList.remove("is-visible");
    }

    state.linkChoiceWord = null;
    state.linkChoiceAnchor = null;
  }

  function handleLinkChoiceClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    event.stopPropagation();

    const word = state.linkChoiceWord;
    const anchor = state.linkChoiceAnchor;

    if (button.dataset.action === "follow" && anchor) {
      if (anchor.target === "_blank") {
        window.open(anchor.href, "_blank");
      } else {
        window.location.assign(anchor.href);
      }
    } else if (button.dataset.action === "show" && word) {
      cancelHideTooltip();
      showTooltipForWord(word);
    }

    hideLinkChoice();
  }

  function bindEvents() {
    if (state.initialized) {
      return;
    }

    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("keydown", handleKeyDown, true);

    extension.tooltip.onMouseEnter = handleTooltipMouseEnter;
    extension.tooltip.onMouseLeave = handleTooltipMouseLeave;

    extension.storage.onSettingsChanged((settings) => {
      state.settings = settings;
      scheduleRefresh();
    });

    function insertTestText() {
      const id = "tibetan-lens-test-sample";
      const existing = document.getElementById(id);
      if (existing) {
        existing.remove();
      }

      const container = document.createElement("div");
      container.id = id;
      container.lang = "bo";
      container.style.cssText = "margin:1rem;padding:1rem;border-radius:12px;background:#fff7e8;color:#2c2117;font:18px/1.6 Georgia,\"Palatino Linotype\",serif;";
      container.innerHTML = `
        <p style="margin:0 0 .5rem;color:#7a2f2a;font-weight:700;">Tibetan Lens test text</p>
        <p>བོད་སྐད་ཡིག་ལ་མི་མང་པོས་དགའ་པོ་བྱེད།</p>
        <p>ཆོས་དང་ཞི་བདེ་ནི་གལ་ཆེན་པོ་རེད།</p>
        <p>དགེ་རྒན་ཞིག་གིས་བོད་སྐད་བསླབས།</p>
        <p>ཨོཾ་ག་ཏེ་ག་ཏེ་པཱ་ར་ག་ཏེ་པཱ་ར་སཾ་ག་ཏེ་བོ་དྷི་སྭཱ་ཧཱ།</p>
      `;

      const target = document.body || document.documentElement;
      target.insertBefore(container, target.firstChild);
    }

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!message?.type) {
        return undefined;
      }

      if (message.type === extension.constants.messages.refreshAnnotations) {
        refreshAnnotations().then((stats) => {
          sendResponse({
            ok: true,
            stats,
            settings: state.settings
          });
        });
        return true;
      }

      if (message.type === extension.constants.messages.insertTestText) {
        insertTestText();
        refreshAnnotations().then((stats) => {
          sendResponse({
            ok: true,
            stats,
            settings: state.settings
          });
        });
        return true;
      }

      return undefined;
    });

    state.initialized = true;
  }

  async function bootstrap() {
    console.log('[TibetanLens] bootstrap starting...');
    console.log('[TibetanLens] extension object keys:', Object.keys(extension));
    console.log('[TibetanLens] tokenizer:', typeof extension.tokenizer, extension.tokenizer ? Object.keys(extension.tokenizer) : 'MISSING');
    console.log('[TibetanLens] dictionary:', typeof extension.dictionary, extension.dictionary ? Object.keys(extension.dictionary) : 'MISSING');
    console.log('[TibetanLens] botokLookup:', typeof extension.botokLookup, extension.botokLookup ? Object.keys(extension.botokLookup) : 'MISSING');
    console.log('[TibetanLens] replacementEngine:', typeof extension.replacementEngine, extension.replacementEngine ? Object.keys(extension.replacementEngine) : 'MISSING');
    console.log('[TibetanLens] tibetan:', typeof extension.tibetan, extension.tibetan ? Object.keys(extension.tibetan) : 'MISSING');
    console.log('[TibetanLens] storage:', typeof extension.storage, extension.storage ? Object.keys(extension.storage) : 'MISSING');
    console.log('[TibetanLens] tooltip:', typeof extension.tooltip, extension.tooltip ? Object.keys(extension.tooltip) : 'MISSING');
    console.log('[TibetanLens] botokPackManifest:', typeof extension.botokPackManifest, extension.botokPackManifest ? 'present' : 'MISSING');
    console.log('[TibetanLens] defaults:', typeof extension.defaults, extension.defaults ? JSON.stringify(extension.defaults).slice(0, 200) : 'MISSING');
    bindEvents();
    observeDocument();
    await refreshAnnotations();
    console.log('[TibetanLens] bootstrap complete');
  }

  if (document.readyState === "loading") {
    console.log('[TibetanLens] waiting for DOMContentLoaded...');
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    console.log('[TibetanLens] document already ready, bootstrapping now');
    bootstrap();
  }
})();
