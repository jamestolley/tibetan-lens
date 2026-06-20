(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});
  const { processedNode, tooltip } = extension.constants.classes;
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "OPTION", "CODE", "PRE"]);

  function shouldSkipTextNode(node) {
    const parent = node.parentElement;

    if (!parent) {
      return true;
    }

    if (SKIP_TAGS.has(parent.tagName)) {
      return true;
    }

    if (parent.closest(`.${processedNode}`) || parent.closest(`#${tooltip}`)) {
      return true;
    }

    if (parent.closest("[contenteditable]")) {
      return true;
    }

    return !extension.tibetan.containsTibetan(node.textContent || "");
  }

  extension.replacementEngine = {
    collectTextNodes(root) {
      const nodes = [];

      if (!root) {
        return nodes;
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return shouldSkipTextNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
      });

      let current = walker.nextNode();
      while (current) {
        nodes.push(current);
        current = walker.nextNode();
      }

      return nodes;
    },

    replaceTextNode(textNode, fragment) {
      const wrapper = document.createElement("span");
      wrapper.className = processedNode;
      wrapper.dataset.originalText = textNode.textContent || "";
      wrapper.appendChild(fragment);
      textNode.replaceWith(wrapper);
      return wrapper;
    },

    restoreProcessedNodes(root) {
      const scope = root || document;
      const nodes = scope.querySelectorAll(`.${processedNode}`);

      nodes.forEach((node) => {
        const originalText = node.dataset.originalText || node.textContent || "";
        node.replaceWith(document.createTextNode(originalText));
      });
    }
  };
})();
