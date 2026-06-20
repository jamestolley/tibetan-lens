(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});
  const TIBETAN_RUN_PATTERN = /[\u0F00-\u0FFF]+/gu;
  const TIBETAN_CHAR_PATTERN = /[\u0F00-\u0FFF]/u;
  const TIBETAN_PUNCTUATION_PATTERN = /[།༎༏༐༑༔]/u;
  const EDGE_MARK_PATTERN = /^[\s་།༎༏༐༑༔,.;:!?()"'\u2018\u2019\u201c\u201d]+|[\s་།༎༏༐༑༔,.;:!?()"'\u2018\u2019\u201c\u201d]+$/gu;

  function splitByTibetanRuns(text) {
    const segments = [];
    let lastIndex = 0;

    for (const match of text.matchAll(TIBETAN_RUN_PATTERN)) {
      const index = match.index ?? 0;

      if (index > lastIndex) {
        segments.push({ type: "text", text: text.slice(lastIndex, index) });
      }

      segments.push({ type: "tibetan", text: match[0] });
      lastIndex = index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({ type: "text", text: text.slice(lastIndex) });
    }

    return segments;
  }

  function normalizeLookupKey(text) {
    const trimmed = text.trim().replace(EDGE_MARK_PATTERN, "");
    return trimmed.replace(/་{2,}/gu, "་").replace(/་$/u, "");
  }

  extension.tibetan = {
    containsTibetan(text) {
      return TIBETAN_CHAR_PATTERN.test(text);
    },

    splitByTibetanRuns,

    normalizeLookupKey,

    countSyllables(text) {
      return normalizeLookupKey(text).split("་").filter(Boolean).length;
    },

    isTibetanPunctuation(char) {
      return TIBETAN_PUNCTUATION_PATTERN.test(char);
    }
  };
})();
