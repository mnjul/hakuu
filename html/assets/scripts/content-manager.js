// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018 Min-Zhong Lu

'use strict';

;(function(exports){

const FONTS = {
  Latin: 'latin.ttf',
  CJK: 'cjk.otf',
};

let _;

class ContentManager {
  constructor() {
    _(this)._pageSources = {}; // pagename => PageSource
    this.fonts = Object.seal(FONTS);
  }

  async getPageSourcePromise(name) {
    if (!(name in _(this)._pageSources)) {
      _(this)._pageSources[name] = await _(this)._loadPage(name);
    }

    return _(this)._pageSources[name];
  }

  async _loadPage(name) {
    return new window.PageSource(await (await fetch(`pages/${name}.xhtml`)).text());
  }

  // Resolution of these fetch promises should be handled separately (as long
  // as one font is ready, we attach it to index css), so no wrapping with
  // Promise.all or async.
  getFontBlobPromises() {
    return FONTS.mapValues(
      filename => fetch(`assets/fonts/${filename}`).then(resp => resp.blob())
    );
  }

  async getPageStyleSheetPromise() {
    return await(await fetch('assets/styles/pages.css')).text();
  }
}

_ = window.createInternalFunction(ContentManager);
if (window.DEBUG) window.internalFunctions[ContentManager] = _;

exports.ContentManager = ContentManager;

})(window);
