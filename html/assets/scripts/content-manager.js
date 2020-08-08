// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2020 Min-Zhong Lu

'use strict';

(function (exports) {
  const FONTS = Object.seal({
    Latin: 'latin.woff2',
    CJK: 'cjk.woff2',
    LatinSans: 'latin-sans.woff2',
    CJKSans: 'cjk-sans.woff2',
  });

  const PAGES = ['preface', 'portrayal', 'moment', 'postface', 'appendix'];

  let _;

  class ContentManager {
    constructor() {
      this.fonts = FONTS;

      _(this)._pageSources = new Map(); // pagename => PageSource

      _(this)._pageFetchPromises = undefined; // pagename => Promise
      _(this)._styleSheetFetchPromise = undefined;
      _(this)._fontFetchPromises = undefined; // fontname => Promise

      _(this)._load();
    }

    _load() {
      _(this)._pageFetchPromises = new Map(
        PAGES.map((name) => [name, fetch(`pages/${name}.xhtml`)])
      );

      _(this)._styleSheetFetchPromise = fetch('assets/styles/pages.css');

      _(this)._fontFetchPromises = new Map(
        Object.entries(FONTS).map(([name, filename]) => [
          name,
          fetch(`assets/fonts/${filename}`),
        ])
      );
    }

    getPageSourcePromise(name) {
      if (!_(this)._pageSources.has(name)) {
        _(this)._pageSources.set(name, _(this)._loadPage(name));
      }

      return _(this)._pageSources.get(name);
    }

    async _loadPage(name) {
      return new window.PageSource(
        await (await _(this)._pageFetchPromises.get(name)).text(),
        name
      );
    }

    // Resolution of these fetch promises should be handled separately (as long
    // as one font is ready, we attach it to index css), so no wrapping with
    // Promise.all or async.
    getFontBlobPromises() {
      return new Map(
        Array.from(
          _(this)._fontFetchPromises.entries()
        ).map(([name, promise]) => [name, promise.then((resp) => resp.blob())])
      );
    }

    async getPageStyleSheetPromise() {
      return await (await _(this)._styleSheetFetchPromise).text();
    }
  }

  _ = window.createInternalFunction(ContentManager);
  if (window.DEBUG) window.internalFunctions[ContentManager] = _;

  exports.ContentManager = ContentManager;
})(window);
