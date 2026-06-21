/**
 * Test setup — stubs Chrome extension APIs and initializes globalThis.TibetanExtension
 * so the IIFE-based source modules can be loaded in a Node/jsdom environment.
 */

// Stub chrome.runtime, chrome.storage, chrome.action
globalThis.chrome = {
  runtime: {
    getURL(path) {
      return `chrome-extension://test-id/${path}`;
    },
    sendMessage() {},
    onMessage: {
      addListener() {},
      removeListener() {}
    }
  },
  storage: {
    sync: {
      async get(defaults) {
        return { ...defaults };
      },
      async set() {}
    },
    onChanged: {
      addListener() {},
      removeListener() {}
    }
  },
  action: {
    setIcon() {},
    setTitle() {}
  }
};

// Ensure a fresh TibetanExtension namespace before each test file
globalThis.TibetanExtension = {};
