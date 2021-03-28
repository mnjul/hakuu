// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

'use strict';

(function (exports) {
  const FONTS = new Map([
    ['Latin', 'latin.woff2'],
    ['CJK', 'cjk.woff2'],
    ['LatinSans', 'latin-sans.woff2'],
    ['CJKSans', 'cjk-sans.woff2'],
  ]);

  const PAGES = [
    'preface',
    'portrayal',
    'moment',
    'prehension',
    'postface',
    'appendix',
  ];

  let _;

  class ContentManager {
    constructor() {
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

      _(this)._prefetchPrehensionFigures();

      _(this)._styleSheetFetchPromise = fetch('assets/styles/pages.css');

      _(this)._fontFetchPromises = new Map(
        Array.from(FONTS.entries()).map(([name, filename]) => [
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

    _loadPage(name) {
      return _(this)
        ._pageFetchPromises.get(name)
        .then((resp) => resp.text())
        .then((source) => new window.PageSource(source, name));
    }

    async _prefetchPrehensionFigures() {
      const source = (await this.getPageSourcePromise('prehension')).source;
      const allMatches = Array.from(source.matchAll(/src="([^"]+)"/g));
      const fetchMatch = (index) =>
        〆.$cachedFetchImageToDataURL(allMatches[index][1]);
      fetchMatch(0);
      fetchMatch(allMatches.length - 1);
      fetchMatch(1);
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

    getPageStyleSheetPromise() {
      return _(this)._styleSheetFetchPromise.then((resp) => resp.text());
    }
  }

  _ = window.createInternalFunction(ContentManager);
  if (window.DEBUG) window.internalFunctions[ContentManager] = _;

  exports.ContentManager = ContentManager;
})(window);
