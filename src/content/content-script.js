(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  const state = {
    initialized: false,
    isRendering: false,
    ignoreMutationsUntil: 0,
    observer: null,
    refreshTimer: null,
    settings: null,
    stats: {
      processedNodes: 0,
      annotatedWords: 0
    }
  };

  function createWordElement(token) {
    const element = document.createElement("span");
    const posClass = token.pos ? `pos-${token.pos.toLowerCase()}` : "pos-unknown";
    element.className = [
      extension.constants.classes.word,
      token.matched ? extension.constants.classes.wordMatched : extension.constants.classes.wordUnmatched,
      posClass
    ].join(" ");
    element.tabIndex = 0;
    element.setAttribute("role", "button");
    element.dataset.term = token.text;
    element.dataset.lookupKey = token.lookupKey || token.text;
    if (token.pos) {
      element.dataset.pos = token.pos;
    }
    element.textContent = token.text;
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

  async function refreshAnnotations() {
    if (state.isRendering) {
      console.log('[TibetanLens] refreshAnnotations skipped — already rendering');
      return state.stats;
    }

    state.isRendering = true;
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
    if (!state.settings?.showTooltips) {
      return;
    }

    const lookupTerm = wordElement.dataset.lookupKey || wordElement.dataset.term || "";
    const entries = mergeTooltipEntries(
      extension.dictionary.lookup(lookupTerm, state.settings),
      typeof extension.botokLookup?.lookup === "function"
        ? extension.botokLookup.lookup(lookupTerm, state.settings)
        : []
    );

    extension.tooltip.showTooltip(wordElement, {
      term: wordElement.dataset.term || wordElement.textContent || "",
      entries,
      language: state.settings.targetLanguage
    });
  }

  function handleDocumentClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const word = target.closest(`.${extension.constants.classes.word}`);
    if (word) {
      showTooltipForWord(word);
      return;
    }

    if (!extension.tooltip.isTooltipElement(target)) {
      extension.tooltip.hideTooltip();
    }
  }

  function handleFocusIn(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const word = target.closest(`.${extension.constants.classes.word}`);
    if (word) {
      showTooltipForWord(word);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      extension.tooltip.hideTooltip();
    }
  }

  function shouldRefreshForMutation(mutation) {
    if (mutation.type === "characterData") {
      const parent = mutation.target.parentElement;
      if (parent?.closest(`.${extension.constants.classes.processedNode}, #${extension.constants.classes.tooltip}`)) {
        return false;
      }

      return extension.tibetan.containsTibetan(mutation.target.textContent || "");
    }

    return Array.from(mutation.addedNodes).some((node) => {
      if (node instanceof Element) {
        if (node.closest(`.${extension.constants.classes.processedNode}, #${extension.constants.classes.tooltip}`)) {
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

  function bindEvents() {
    if (state.initialized) {
      return;
    }

    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("keydown", handleKeyDown, true);

    extension.storage.onSettingsChanged((settings) => {
      state.settings = settings;
      scheduleRefresh();
    });

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!message?.type) {
        return undefined;
      }

      if (message.type === extension.constants.messages.getAnnotationStats) {
        sendResponse({
          ok: true,
          stats: state.stats,
          settings: state.settings
        });
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
