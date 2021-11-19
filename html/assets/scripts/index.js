// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

'use strict';

(function (exports) {
  const INIT_PAGE_NAME = 'preface';

  const RainEngineClient = window.RainEngineClient;

  window.ContentManager.PageSourceClass = window.PageSource;
  window.RainEngineClient.rainEngine = window.rainEngine;
  window.CanvasController.RainEngineClientClass = RainEngineClient;

  const contentManager = new window.ContentManager();
  const canvasController = new window.CanvasController();
  const audioManager = new window.AudioManager();
  const siteController = new window.SiteController(
    INIT_PAGE_NAME,
    contentManager,
    canvasController,
    audioManager
  );

  siteController.init();

  if (window.DEBUG) {
    exports.index = {
      contentManager,
      canvasController,
      audioManager,
      siteController,
    };
  } else {
    delete window.rainEngine;
    delete window.RainEngineClient;
    delete window.Page;
    delete window.PageSource;
    delete window.ContentManager;
    delete window.CanvasController;
    delete window.AudioManager;
    delete window.SiteController;
  }
})(window);
