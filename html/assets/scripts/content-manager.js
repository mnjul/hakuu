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

  exports.ContentManager = class ContentManager {
    static PageSourceClass;

    #pageSources = new Map(); // pagename => PageSource

    #pageFetchPromises; // pagename => Promise
    #styleSheetFetchPromise;
    #fontFetchPromises; // fontname => Promise

    constructor() {
      this.#load();
    }

    #load() {
      this.#pageFetchPromises = new Map(
        PAGES.map((name) => [name, fetch(`pages/${name}.xhtml`)])
      );

      this.#prefetchPrehensionFigures();

      this.#styleSheetFetchPromise = fetch('assets/styles/pages.css');

      this.#fontFetchPromises = new Map(
        Array.from(FONTS.entries()).map(([name, filename]) => [
          name,
          fetch(`assets/fonts/${filename}`),
        ])
      );
    }

    getPageSourcePromise(name) {
      if (!this.#pageSources.has(name)) {
        this.#pageSources.set(name, this.#loadPage(name));
      }

      return this.#pageSources.get(name);
    }

    #loadPage(name) {
      return this.#pageFetchPromises
        .get(name)
        .then((resp) => resp.text())
        .then((source) => new ContentManager.PageSourceClass(source, name));
    }

    async #prefetchPrehensionFigures() {
      const source = (await this.getPageSourcePromise('prehension')).source;
      const allMatches = Array.from(source.matchAll(/src="([^"]+)"/g));
      const fetchMatch = (index) =>
        〆.cachedFetchToDataURL(allMatches[index][1]);
      fetchMatch(0);
      fetchMatch(allMatches.length - 1);
      fetchMatch(1);
    }

    // Resolution of these fetch promises should be handled separately (as long
    // as one font is ready, we attach it to index css), so no wrapping with
    // Promise.all or async.
    getFontBlobPromises() {
      return new Map(
        Array.from(this.#fontFetchPromises.entries()).map(([name, promise]) => [
          name,
          promise.then((resp) => resp.blob()),
        ])
      );
    }

    getPagesStyleSheetPromise() {
      return this.#styleSheetFetchPromise.then((resp) => resp.text());
    }
  };
})(window);
