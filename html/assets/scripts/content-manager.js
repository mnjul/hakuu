// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2020 Min-Zhong Lu

'use strict';

;(function(exports){

const FONTS = Object.seal({
  Latin: 'latin.woff2',
  CJK: 'cjk.woff2',
});

const PAGES = ['home', 'review', 'finale'];

let _;

class ContentManager {
  constructor() {
    this.fonts = FONTS;

    _(this)._pageSources = {}; // pagename => PageSource

    _(this)._pageFetchPromises = {}; // pagename => Promise
    _(this)._styleSheetFetchPromise = undefined;
    _(this)._fontFetchPromises = {}; // fontname => Promise

   _(this)._load();
  }

  _load() {
    PAGES.forEach(name => {
      _(this)._pageFetchPromises[name] = fetch(`pages/${name}.xhtml`);
    });

    _(this)._styleSheetFetchPromise = fetch('assets/styles/pages.css');

    _(this)._fontFetchPromises = FONTS.mapValues(
      filename => fetch(`assets/fonts/${filename}`)
    );
  }

  async getPageSourcePromise(name) {
    if (!(name in _(this)._pageSources)) {
      _(this)._pageSources[name] = await _(this)._loadPage(name);
    }

    return _(this)._pageSources[name];
  }

  async _loadPage(name) {
    return new window.PageSource(await (await _(this)._pageFetchPromises[name]).text(), name);
  }

  // Resolution of these fetch promises should be handled separately (as long
  // as one font is ready, we attach it to index css), so no wrapping with
  // Promise.all or async.
  getFontBlobPromises() {
    return _(this)._fontFetchPromises.mapValues(
      promise => promise.then(resp => resp.blob())
    );
  }

  async getPageStyleSheetPromise() {
    return await(await _(this)._styleSheetFetchPromise).text();
  }
}

_ = window.createInternalFunction(ContentManager);
if (window.DEBUG) window.internalFunctions[ContentManager] = _;

exports.ContentManager = ContentManager;

})(window);
