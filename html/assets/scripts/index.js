// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018 Min-Zhong Lu

'use strict';

;(function(exports){

const INIT_PAGE_NAME = 'home';

let contentManager = new window.ContentManager();
let canvasController = new window.CanvasController();
let siteController = new window.SiteController(
  INIT_PAGE_NAME, contentManager, canvasController
);

siteController.init();

if (window.DEBUG) {
  exports.index = {
    contentManager,
    canvasController,
    siteController
  };
}

})(window);
