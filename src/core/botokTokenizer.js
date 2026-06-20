(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});
  const HASH = "#";
  const TSEK = "\u0f0b";
  const NAMCHE = "\u0f7f";
  const EDGE_MARK_PATTERN =
    /^[\s\u0f0b\u0f0d\u0f0e\u0f0f\u0f10\u0f11\u0f14,.;:!?()"'\u2018\u2019\u201c\u201d]+|[\s\u0f0b\u0f0d\u0f0e\u0f0f\u0f10\u0f11\u0f14,.;:!?()"'\u2018\u2019\u201c\u201d]+$/gu;
  const POPULATION_ORDER = ["words", "words_non_inflected", "words_skrt", "remove"];
  const AFFIX_MAP = {
    "\u0f62": { len: 1, type: "la" },
    "\u0f66": { len: 1, type: "gis" },
    "\u0f60\u0f72": { len: 2, type: "gi" },
    "\u0f60\u0f58": { len: 2, type: "am" },
    "\u0f60\u0f44": { len: 2, type: "ang" },
    "\u0f60\u0f7c": { len: 2, type: "o" },
    "\u0f60\u0f72\u0f60\u0f7c": { len: 4, type: "gi+o" },
    "\u0f60\u0f72\u0f60\u0f58": { len: 4, type: "gi+am" },
    "\u0f60\u0f72\u0f60\u0f44": { len: 4, type: "gi+ang" },
    "\u0f60\u0f7c\u0f60\u0f58": { len: 4, type: "o+am" },
    "\u0f60\u0f7c\u0f60\u0f44": { len: 4, type: "o+ang" }
  };

  const runtime = {
    loadPromise: null,
    pack: null,
    trieCache: new Map()
  };

  function normalizeForm(text) {
    const trimmed = (text || "").trim().replace(EDGE_MARK_PATTERN, "");
    return trimmed.replace(/\u0f0b{2,}/gu, TSEK).replace(/\u0f0b$/u, "");
  }

  function cleanSyllableText(text) {
    return (text || "").replace(/[\u0f0b\s\u0f0d\u0f0e\u0f0f\u0f10\u0f11\u0f14]/gu, "");
  }

  function stripBom(text) {
    return text.replace(/^\ufeff/u, "");
  }

  function cleanDataLines(sourceText) {
    return stripBom(sourceText)
      .split(/\r?\n/u)
      .map((line) => {
        const commentIndex = line.indexOf(HASH);
        return commentIndex >= 0 ? line.slice(0, commentIndex).trim() : line.trim();
      })
      .filter(Boolean);
  }

  function parseDelimitedLine(line, delimiter) {
    return line.split(delimiter).map((cell) => (cell === "" ? null : cell));
  }

  function parseWordRow(line) {
    const rawFields = [null, null, null, null, null];
    const parsed = line.includes("\t")
      ? parseDelimitedLine(line, "\t")
      : line.includes(",")
        ? parseDelimitedLine(line, ",")
        : [line];

    parsed.forEach((cell, index) => {
      rawFields[index] = cell;
    });

    const [form, pos, lemma, sense, freq] = rawFields;
    const normalizedFreq = Number.isFinite(Number(freq)) ? Number(freq) : null;

    return {
      form: form || "",
      pos,
      lemma,
      sense,
      freq: normalizedFreq,
      formKey: normalizeForm(form || "")
    };
  }

  function parseRemoveRow(line) {
    return {
      form: line,
      formKey: normalizeForm(line)
    };
  }

  function isTibetanPunctuation(char) {
    return /[\u0f0d\u0f0e\u0f0f\u0f10\u0f11\u0f14]/u.test(char);
  }

  function splitGlosses(sense) {
    return (sense || "")
      .split(";")
      .map((gloss) => gloss.trim())
      .filter(Boolean);
  }

  function joinNotes(parts) {
    return parts.filter(Boolean).join(" | ");
  }

  function getEnabledDictionaryIds(settings) {
    if (settings && Array.isArray(settings.enabledDictionaries) && settings.enabledDictionaries.length) {
      return settings.enabledDictionaries;
    }

    return extension.defaults.settings.enabledDictionaries;
  }

  async function fetchText(path) {
    const url = chrome.runtime.getURL(path);
    console.log('[TibetanLens:tokenizer] fetching:', path, '->', url);
    const response = await fetch(url);

    if (!response.ok) {
      console.error('[TibetanLens:tokenizer] FAILED to load:', path, 'status:', response.status);
      throw new Error(`Failed to load extension resource: ${path}`);
    }

    const text = await response.text();
    console.log('[TibetanLens:tokenizer] loaded:', path, '(' + text.length + ' chars)');
    return text;
  }

  async function fetchJson(path) {
    const url = chrome.runtime.getURL(path);
    console.log('[TibetanLens:tokenizer] fetching JSON:', path, '->', url);
    const response = await fetch(url);

    if (!response.ok) {
      console.error('[TibetanLens:tokenizer] FAILED to load JSON:', path, 'status:', response.status);
      throw new Error(`Failed to load extension resource: ${path}`);
    }

    return response.json();
  }

  async function loadFileEntries(fileDescriptor, component, category) {
    console.log('[TibetanLens:tokenizer] loadFileEntries:', fileDescriptor.path, 'dictId:', fileDescriptor.dictionaryId);
    const text = await fetchText(fileDescriptor.path);
    const rows = cleanDataLines(text);
    console.log('[TibetanLens:tokenizer] parsed', rows.length, 'rows from', fileDescriptor.path);

    return rows
      .map((line) => (category === "remove" ? parseRemoveRow(line) : parseWordRow(line)))
      .filter((entry) => entry.formKey)
      .map((entry) => ({
        ...entry,
        component,
        category,
        dictionaryId: fileDescriptor.dictionaryId || null,
        dictionaryLabel: fileDescriptor.dictionaryLabel || null,
        sourcePath: fileDescriptor.path
      }));
  }

  async function loadComponentFiles(component, filesByCategory = {}) {
    const categoryEntries = await Promise.all(
      Object.entries(filesByCategory).map(async ([category, files]) => {
        const loaded = await Promise.all(
          (files || []).map((fileDescriptor) => loadFileEntries(fileDescriptor, component, category))
        );

        return [category, loaded.flat()];
      })
    );

    return Object.fromEntries(categoryEntries);
  }

  function uniqueCategories(componentMap = {}) {
    const keys = Object.keys(componentMap);
    return [
      ...POPULATION_ORDER.filter((category) => keys.includes(category)),
      ...keys.filter((category) => !POPULATION_ORDER.includes(category) && category !== "rules")
    ];
  }

  class TokChunks {
    constructor(string) {
      this.string = string || "";
    }

    getSyls() {
      const syllables = [];
      let buffer = "";

      for (const char of this.string) {
        if (/\s/u.test(char)) {
          if (buffer) {
            syllables.push(buffer);
            buffer = "";
          }

          continue;
        }

        if (isTibetanPunctuation(char)) {
          if (buffer) {
            syllables.push(buffer);
            buffer = "";
          }

          continue;
        }

        if (char === TSEK) {
          if (buffer) {
            syllables.push(buffer);
            buffer = "";
          }

          continue;
        }

        if (!/[\u0f00-\u0fff]/u.test(char)) {
          if (buffer) {
            syllables.push(buffer);
            buffer = "";
          }

          continue;
        }

        const cleanedChar = cleanSyllableText(char);
        if (!cleanedChar) {
          continue;
        }

        buffer += cleanedChar;
      }

      if (buffer) {
        syllables.push(buffer);
      }

      return syllables;
    }
  }

  function isNestedSolutions(components) {
    return Array.isArray(components) && Array.isArray(components[0]);
  }

  class SylComponents {
    constructor(data) {
      this.dadrag = data.dadrag;
      this.roots = data.roots;
      this.suffixes = data.suffixes;
      this.Csuffixes = data.Csuffixes;
      this.special = data.special;
      this.wazurs = data.wazurs;
      this.exceptions = [...this.special, ...this.wazurs];
      this.ambiguous = data.ambiguous;
      this.m_roots = data.m_roots;
      this.m_exceptions = data.m_exceptions;
      this.m_wazurs = data.m_wazurs;
      this.mingzhis = {
        ...this.m_roots,
        ...this.m_exceptions,
        ...this.m_wazurs
      };
    }

    getParts(syl) {
      if (!this.exceptions.includes(syl) && !Object.prototype.hasOwnProperty.call(this.ambiguous, syl)) {
        const roots = [];
        const suffixes = [];
        const solutions = [];

        [6, 5, 4, 3, 2, 1].forEach((length) => {
          if (syl.length >= length) {
            const candidate = syl.slice(0, length);
            if (Object.prototype.hasOwnProperty.call(this.roots, candidate)) {
              roots.push(candidate);
            }
          }
        });

        if (syl.length > 1) {
          [1, 2, 3, 4, 5].forEach((length) => {
            if (syl.length >= length) {
              const candidate = syl.slice(-length);
              if (this.suffixes.includes(candidate)) {
                suffixes.push(candidate);
              }
            }
          });
        }

        if (roots.length && this.roots[roots[0]] === "C") {
          if (roots[0] === syl) {
            return [roots[0], ""];
          }

          for (const suffix of suffixes) {
            if (this.Csuffixes.includes(suffix) && `${roots[0]}${suffix}` === syl) {
              return [roots[0], suffix];
            }
          }
        }

        if (suffixes.length && roots.length) {
          roots.forEach((root) => {
            suffixes.forEach((suffix) => {
              if (this.roots[root] === "A" && suffix === "\u0f60" && `${root}${suffix}` === syl) {
                return;
              }

              if (`${root}${suffix}` === syl) {
                const exists = solutions.some(
                  ([savedRoot, savedSuffix]) => savedRoot === root && savedSuffix === suffix
                );

                if (!exists) {
                  solutions.push([root, suffix]);
                }
              }
            });
          });

          if (!solutions.length) {
            return null;
          }

          return solutions.length > 1 ? solutions : solutions[0];
        }

        if (roots.length) {
          roots.forEach((root) => {
            if (root === syl && this.roots[root] !== "NB") {
              const exists = solutions.some(
                ([savedRoot, savedSuffix]) => savedRoot === root && savedSuffix === ""
              );

              if (!exists) {
                solutions.push([root, ""]);
              }
            }
          });

          if (!solutions.length) {
            return null;
          }

          return solutions.length > 1 ? solutions : solutions[0];
        }

        return null;
      }

      if (Object.prototype.hasOwnProperty.call(this.ambiguous, syl)) {
        return this.ambiguous[syl];
      }

      return [syl, "x"];
    }

    getMingzhi(syl) {
      let components = this.getParts(syl);

      if (isNestedSolutions(components) || !components) {
        if (syl && syl.endsWith("\u0f51")) {
          components = this.getParts(syl.slice(0, -1));
          if (isNestedSolutions(components) || !components) {
            return null;
          }

          return this.mingzhis[components[0]];
        }

        return null;
      }

      return this.mingzhis[components[0]];
    }

    getInfo(syl) {
      const mingzhi = this.getMingzhi(syl);
      if (!mingzhi) {
        return null;
      }

      if (this.dadrag.includes(syl)) {
        return "dadrag";
      }

      const thamePattern = new RegExp(
        `${mingzhi}([\u0fb1\u0fb2\u0fb3\u0fad\u0fb7]?[\u0f72\u0f74\u0f7a\u0f7c]?(\u0f60?[\u0f72\u0f74\u0f7c]?\u0f62?\u0f66?|(\u0f60[\u0f58\u0f44])|(\u0f60\u0f7c\u0f60[\u0f58\u0f44])|(\u0f60\u0f72\u0f60[\u0f7c\u0f58\u0f44])))$`,
        "u"
      );

      if (thamePattern.test(syl)) {
        return "thame";
      }

      return syl;
    }

    isThame(syl) {
      return this.getInfo(syl) === "thame";
    }
  }

  function endsWithAnyDisallowedSuffix(syl) {
    return ["\u0f62", "\u0f66", "\u0f60\u0f72", "\u0f60\u0f7c", "\u0f58", "\u0f44"].some(
      (ending) => syl.length > ending.length && syl.endsWith(ending)
    );
  }

  class BoSyl extends SylComponents {
    constructor(data) {
      super(data);
      this.affixes = AFFIX_MAP;
    }

    isAffixable(syl) {
      if (!this.isThame(syl)) {
        return false;
      }

      return !endsWithAnyDisallowedSuffix(syl);
    }

    getAllAffixed(syl) {
      if (!this.isAffixable(syl)) {
        return null;
      }

      let normalizedSyllable = syl;
      let aa = false;

      if (normalizedSyllable.endsWith("\u0f60") && normalizedSyllable.length > 1) {
        normalizedSyllable = normalizedSyllable.slice(0, -1);
        aa = true;
      }

      return Object.entries(this.affixes).map(([affix, metadata]) => [
        `${normalizedSyllable}${affix}`,
        {
          ...metadata,
          aa
        }
      ]);
    }
  }

  class Node {
    constructor(label = null, leaf = false, data = null) {
      this.label = label;
      this.leaf = leaf;
      this.data = data || { _: {} };
      this.children = Object.create(null);
    }

    addChild(key, leaf = false) {
      this.children[key] = new Node(key, leaf);
    }

    isMatch() {
      return this.leaf;
    }
  }

  class BasicTrie {
    constructor() {
      this.head = new Node();
    }

    add(word, data = null) {
      let currentNode = this.head;
      let wordFinished = true;
      let index = 0;

      for (index = 0; index < word.length; index += 1) {
        const part = word[index];

        if (Object.prototype.hasOwnProperty.call(currentNode.children, part)) {
          currentNode = currentNode.children[part];
        } else {
          wordFinished = false;
          break;
        }
      }

      if (!wordFinished) {
        while (index < word.length) {
          currentNode.addChild(word[index]);
          currentNode = currentNode.children[word[index]];
          index += 1;
        }
      }

      currentNode.leaf = true;

      if (data) {
        currentNode.data = {
          ...currentNode.data,
          ...data
        };
      }
    }

    walk(part, currentNode = this.head) {
      if (Object.prototype.hasOwnProperty.call(currentNode.children, part)) {
        return currentNode.children[part];
      }

      return null;
    }

    addData(word, data) {
      if (!word || !word.length) {
        return false;
      }

      let currentNode = this.head;

      for (const syllable of word) {
        if (Object.prototype.hasOwnProperty.call(currentNode.children, syllable)) {
          currentNode = currentNode.children[syllable];
        } else {
          return false;
        }
      }

      if (!currentNode.leaf) {
        return false;
      }

      if (!Array.isArray(currentNode.data.senses)) {
        currentNode.data.senses = [];
      }

      return this.addMeaning(currentNode.data.senses, data);
    }

    addMeaning(meanings, meaning) {
      if (meanings.length) {
        for (const existingMeaning of meanings) {
          if (this.isDiffMeaning(meaning, existingMeaning)) {
            meanings.push(meaning);
            return true;
          }
        }

        return false;
      }

      meanings.push(meaning);
      return true;
    }

    isDiffMeaning(left, right) {
      return Object.entries(left).some(
        ([key, value]) => !Object.prototype.hasOwnProperty.call(right, key) || right[key] !== value
      );
    }

    deactivate(word) {
      let currentNode = this.head;

      for (const syllable of word) {
        if (Object.prototype.hasOwnProperty.call(currentNode.children, syllable)) {
          currentNode = currentNode.children[syllable];
        } else {
          return false;
        }
      }

      currentNode.leaf = false;
      return true;
    }
  }

  class BrowserTrie extends BasicTrie {
    constructor(boSyl, pack, profile) {
      super();
      this.boSyl = boSyl;
      this.pack = pack;
      this.profile = profile;
      this.tmpInflected = new Map();
      this.head.data._.profile = profile;
      this.populate(pack.dictionary);
      this.populate(pack.adjustments);
      this.tmpInflected = new Map();
    }

    populate(componentEntries = {}) {
      uniqueCategories(componentEntries).forEach((category) => {
        (componentEntries[category] || []).forEach((entry) => {
          this.addEntry(entry, category);
        });
      });
    }

    addEntry(entry, category) {
      if (category === "words") {
        this.inflectAndModify(entry.form);
        this.inflectAndAddData(entry);
        return;
      }

      if (category === "words_non_inflected") {
        this.addNonInflectible(entry.form);
        this.inflectAndAddData(entry, false);
        return;
      }

      if (category === "words_skrt") {
        this.inflectAndModify(entry.form, false, true);
        this.inflectAndAddData(entry);
        return;
      }

      if (category === "remove") {
        this.inflectAndModify(entry.form, true);
      }
    }

    addNonInflectible(word) {
      const syllables = new TokChunks(word).getSyls();

      if (!syllables.length) {
        return null;
      }

      this.add(syllables);
      return syllables;
    }

    inflectAndModify(word, deactivate = false, skrt = false) {
      const inflected = this.getInflected(word);

      if (!inflected) {
        return;
      }

      inflected.forEach(([inflectedWord, data]) => {
        if (deactivate) {
          this.deactivate(inflectedWord);
          return;
        }

        if (skrt) {
          const nextData = data ? { ...data, skrt: true } : { skrt: true };
          this.add(inflectedWord, nextData);
          return;
        }

        this.add(inflectedWord, data || undefined);
      });
    }

    inflectAndAddData(entry, inflect = true) {
      const lemmaSyllables = entry.lemma ? new TokChunks(entry.lemma).getSyls() : null;
      const normalizedLemma = lemmaSyllables ? this.joinSyllables(lemmaSyllables) : null;
      const inflected = inflect ? this.getInflected(entry.form) : [[new TokChunks(entry.form).getSyls(), null]];

      if (!inflected) {
        return;
      }

      inflected.forEach(([inflectedWord, affixData]) => {
        const data = Object.fromEntries(
          Object.entries({
            lemma: normalizedLemma,
            pos: entry.pos,
            freq: entry.freq,
            sense: entry.sense,
            affixed: Boolean(affixData),
            dictionaryId: entry.dictionaryId,
            dictionaryLabel: entry.dictionaryLabel,
            sourcePath: entry.sourcePath
          }).filter(([, value]) => value !== null && value !== undefined && value !== "")
        );

        this.addData(inflectedWord, data);
      });
    }

    getInflected(word) {
      if (this.tmpInflected.has(word)) {
        return this.tmpInflected.get(word);
      }

      const syllables = new TokChunks(word).getSyls();
      if (!syllables.length) {
        return null;
      }

      const inflected = [[syllables, null]];
      const affixed = this.boSyl.getAllAffixed(syllables.at(-1));

      if (affixed) {
        affixed.forEach(([inflectedSyllable, data]) => {
          inflected.push([[...syllables.slice(0, -1), inflectedSyllable], { affixation: data }]);
        });
      }

      this.tmpInflected.set(word, inflected);
      return inflected;
    }

    joinSyllables(syllables) {
      return syllables.map((syllable) => (syllable.endsWith(NAMCHE) ? syllable : `${syllable}${TSEK}`)).join("");
    }
  }

  function buildRunUnits(run, offset = 0) {
    const units = [];
    let buffer = "";
    let bufferStart = offset;

    function flushBuffer(endOffset) {
      if (!buffer) {
        return;
      }

      units.push({
        type: "syllable",
        text: buffer,
        cleanText: cleanSyllableText(buffer),
        start: bufferStart,
        end: endOffset
      });
      buffer = "";
    }

    for (let index = 0; index < run.length; index += 1) {
      const char = run[index];
      const absoluteIndex = offset + index;

      if (/\s/u.test(char)) {
        flushBuffer(absoluteIndex);
        units.push({
          type: "space",
          text: char,
          start: absoluteIndex,
          end: absoluteIndex + 1
        });
        continue;
      }

      if (isTibetanPunctuation(char)) {
        flushBuffer(absoluteIndex);
        units.push({
          type: "punctuation",
          text: char,
          start: absoluteIndex,
          end: absoluteIndex + 1
        });
        continue;
      }

      if (!buffer) {
        bufferStart = absoluteIndex;
      }

      buffer += char;

      if (char === TSEK) {
        flushBuffer(absoluteIndex + 1);
      }
    }

    flushBuffer(offset + run.length);
    return units;
  }

  function joinSurfaceSyllables(syllables) {
    return syllables.map((syllable) => syllable.text).join("");
  }

  function findLongestMatch(syllables, startIndex, trie) {
    let currentNode = trie.head;
    let bestMatch = null;

    for (let endIndex = startIndex; endIndex < syllables.length; endIndex += 1) {
      currentNode = trie.walk(syllables[endIndex].cleanText, currentNode);

      if (!currentNode) {
        break;
      }

      if (currentNode.isMatch()) {
        bestMatch = {
          endIndex,
          node: currentNode
        };
      }
    }

    return bestMatch;
  }

  function chooseDefaultSense(senses) {
    const affixed = [];
    const nonAffixed = [];
    const noAffixFlag = [];

    senses.forEach((sense) => {
      if (Object.prototype.hasOwnProperty.call(sense, "affixed")) {
        if (sense.affixed) {
          affixed.push(sense);
        } else {
          nonAffixed.push(sense);
        }

        return;
      }

      noAffixFlag.push(sense);
    });

    const group = nonAffixed.length ? nonAffixed : noAffixFlag.length ? noAffixFlag : affixed;
    if (!group.length) {
      return null;
    }

    return [...group].sort((left, right) => Object.keys(right).length - Object.keys(left).length)[0];
  }

  function createWordToken(syllables, match) {
    const surfaceText = joinSurfaceSyllables(syllables);
    const formKey = normalizeForm(surfaceText);
    const trieData = match?.node?.data ? structuredClone(match.node.data) : { _: {} };
    const senses = Array.isArray(trieData.senses) ? trieData.senses : [];
    const defaultSense = chooseDefaultSense(senses);

    return {
      type: "word",
      text: formKey || surfaceText,
      surfaceText,
      lookupKey: normalizeForm(defaultSense?.lemma || formKey || surfaceText),
      matched: Boolean(match),
      start: syllables[0].start,
      end: syllables[syllables.length - 1].end,
      lemma: defaultSense?.lemma || null,
      pos: defaultSense?.pos || null,
      senses
    };
  }

  function tokenizeSyllableGroup(syllables, trie) {
    const tokens = [];
    let index = 0;

    while (index < syllables.length) {
      const match = findLongestMatch(syllables, index, trie);

      if (match) {
        tokens.push(createWordToken(syllables.slice(index, match.endIndex + 1), match));
        index = match.endIndex + 1;
        continue;
      }

      tokens.push(createWordToken([syllables[index]], null));
      index += 1;
    }

    return tokens;
  }

  function tokenizeRun(run, trie) {
    const units = buildRunUnits(run, 0);
    const tokens = [];
    let syllables = [];

    function flushSyllables() {
      if (!syllables.length) {
        return;
      }

      tokens.push(...tokenizeSyllableGroup(syllables, trie));
      syllables = [];
    }

    units.forEach((unit) => {
      if (unit.type === "syllable") {
        syllables.push(unit);
        return;
      }

      flushSyllables();
      tokens.push({
        type: unit.type,
        text: unit.text,
        start: unit.start,
        end: unit.end
      });
    });

    flushSyllables();
    return tokens;
  }

  function filterComponent(componentEntries = {}, enabledDictionaryIds) {
    const filtered = Object.create(null);

    Object.entries(componentEntries).forEach(([category, entries]) => {
      filtered[category] = (entries || []).filter(
        (entry) => !entry.dictionaryId || enabledDictionaryIds.has(entry.dictionaryId)
      );
    });

    return filtered;
  }

  function getTrieForSettings(settings) {
    const enabledDictionaryIds = new Set(getEnabledDictionaryIds(settings));
    const cacheKey = [...enabledDictionaryIds].sort().join("|") || "__default__";

    if (!runtime.trieCache.has(cacheKey)) {
      runtime.trieCache.set(
        cacheKey,
        new BrowserTrie(
          runtime.pack.boSyl,
          {
            dictionary: filterComponent(runtime.pack.dictionary, enabledDictionaryIds),
            adjustments: filterComponent(runtime.pack.adjustments, enabledDictionaryIds)
          },
          runtime.pack.profile
        )
      );
    }

    return runtime.trieCache.get(cacheKey);
  }

  async function loadPack() {
    const manifest = extension.botokPackManifest;

    if (!manifest) {
      throw new Error("Botok pack manifest is missing.");
    }

    const [sylComponents, dictionary, adjustments] = await Promise.all([
      fetchJson(manifest.resources.sylComponents),
      loadComponentFiles("dictionary", manifest.files.dictionary),
      loadComponentFiles("adjustments", manifest.files.adjustments)
    ]);

    runtime.pack = {
      profile: manifest.profile,
      catalog: manifest.dictionaryCatalog,
      dictionary,
      adjustments,
      boSyl: new BoSyl(sylComponents)
    };
    runtime.trieCache.clear();
    return runtime.pack;
  }

  async function ensureReady() {
    if (runtime.pack) {
      return runtime.pack;
    }

    if (!runtime.loadPromise) {
      runtime.loadPromise = loadPack().catch((error) => {
        runtime.loadPromise = null;
        throw error;
      });
    }

    return runtime.loadPromise;
  }

  function getDictionaryLabel(entry) {
    if (entry.dictionaryLabel) {
      return entry.dictionaryLabel;
    }

    if (entry.dictionaryId && runtime.pack?.catalog?.[entry.dictionaryId]?.label) {
      return runtime.pack.catalog[entry.dictionaryId].label;
    }

    return "Botok Demo Pack";
  }

  function lookupFromPack(term, settings) {
    if (!runtime.pack) {
      return [];
    }

    const enabledDictionaryIds = new Set(getEnabledDictionaryIds(settings));
    const headword = normalizeForm(term);
    const unique = new Map();

    [runtime.pack.dictionary, runtime.pack.adjustments].forEach((componentEntries) => {
      Object.values(componentEntries || {}).forEach((entries) => {
        (entries || []).forEach((entry) => {
          if (entry.dictionaryId && !enabledDictionaryIds.has(entry.dictionaryId)) {
            return;
          }

          const matchTargets = [entry.formKey, normalizeForm(entry.lemma || "")].filter(Boolean);
          if (!matchTargets.includes(headword)) {
            return;
          }

          const glosses = splitGlosses(entry.sense);
          const dictionaryId = entry.dictionaryId || "pack-grammar";
          const notes = joinNotes([
            entry.lemma && normalizeForm(entry.lemma) !== headword ? `Lemma: ${normalizeForm(entry.lemma)}` : "",
            entry.pos ? `POS: ${entry.pos}` : ""
          ]);

          if (!glosses.length && !notes) {
            return;
          }

          const normalizedEntry = {
            dictionaryId,
            dictionaryLabel: getDictionaryLabel(entry),
            headword,
            glosses: glosses.length ? glosses : [normalizeForm(entry.lemma || entry.form)],
            notes
          };
          const key = JSON.stringify(normalizedEntry);
          unique.set(key, normalizedEntry);
        });
      });
    });

    return [...unique.values()];
  }

  extension.botokLookup = {
    ensureReady,
    lookup(term, settings) {
      return lookupFromPack(term, settings);
    }
  };

  extension.tokenizer = {
    ensureReady,
    segment(run, settings) {
      if (!runtime.pack) {
        throw new Error("Botok tokenizer used before it was ready.");
      }

      return tokenizeRun(run, getTrieForSettings(settings));
    }
  };
})();
