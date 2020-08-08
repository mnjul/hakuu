// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2020 Min-Zhong Lu

'use strict';

(function (exports) {
  const INIT_RAINING = true;

  let _;

  // TODO: Streamline state transitions
  class SiteController {
    constructor(initPageName, contentManager, canvasController, audioManager) {
      _(this)._initPageName = initPageName;

      _(this)._canvasController = canvasController;
      _(this)._contentManager = contentManager;
      _(this)._audioManager = audioManager;

      Object.defineProperty(_(this), '_raining', {
        get() {
          return $('#rain-control').dataset.raining === 'true';
        },
        set(__raining) {
          $('#rain-control').dataset.raining = __raining;
        },
      });

      Object.defineProperty(_(this), '_volumeLevel', {
        get() {
          return $('#volume-control').dataset.level;
        },
        set(__volumeLevel) {
          $('#volume-control').dataset.level = __volumeLevel;
        },
      });

      Object.defineProperty(_(this), '_loading', {
        set(__loading) {
          if (__loading) {
            $('body').classList.add('loading');
          } else {
            $('body').classList.remove('loading');
          }
        },
      });

      Object.defineProperty(_(this), '_audioAvailable', {
        set(__audioAvailable) {
          if (__audioAvailable) {
            $('body').classList.add('audio-available');
          } else {
            $('body').classList.remove('audio-available');
          }
        },
      });

      Object.defineProperty(_(this), '_currentPage', {
        set(__currentPage) {
          $('#main-menu').dataset.currentPage = __currentPage;
          $('#small-view-header-page-title').textContent = $(
            `#main-menu [data-page="${__currentPage}"]`
          ).textContent;
        },
      });
    }

    _initEventListeners() {
      // requestAnimationFrame: sometimes Chrome doesn't have proper
      // getBoundingRect just at DOMContentLoaded
      document.addEventListener('DOMContentLoaded', async () => {
        await $frame();
        _(this)._onReady();
      });

      window.addEventListener('resize', _(this)._onResize.bind(this));

      $('#main-menu').addEventListener(
        'click',
        _(this)._onMainMenuClick.bind(this)
      );

      $('#rain-control').addEventListener(
        'click',
        _(this)._onRainMenuClick.bind(this)
      );

      $('#volume-control').addEventListener(
        'click',
        _(this)._onVolumeMenuClick.bind(this)
      );

      $('#small-view-sidebar-toggle').addEventListener(
        'click',
        _(this)._onSmallViewSidebarToggleClick.bind(this)
      );

      // hack to trigger mobile safari's :active status
      $('#sidebar').addEventListener('touchstart', () => undefined);

      // disallow scrolling on sidebar and small header
      Array.from($$('#sidebar, #small-view-header')).forEach((elem) => {
        elem.addEventListener('touchmove', (evt) => {
          evt.preventDefault();
        });
      });
    }

    async _restart(resetScroll) {
      _(this)._loading = true;
      _(this)._canvasController.destroy();
      await _(this)._canvasController.start(_(this)._raining, resetScroll);
      _(this)._loading = false;
    }

    _onReady() {
      _(this)._raining = INIT_RAINING;

      _(this)._canvasController.ready();

      _(this)._switchPage(_(this)._initPageName);
    }

    _onResize() {
      _(this)._restart();
    }

    _onMainMenuClick(evt) {
      if (
        !(evt.target instanceof HTMLSpanElement) &&
        !(evt.target instanceof HTMLLIElement)
      ) {
        return;
      }

      _(this)._switchPage(evt.target.dataset.page);
      $('body').classList.remove('small-view-sidebar-visible');
    }

    _onRainMenuClick(evt) {
      if (!(evt.target instanceof HTMLSpanElement)) {
        return;
      }

      if (evt.target.id.endsWith('stop') && _(this)._raining) {
        _(this)._raining = false;
        _(this)._restart();
      } else if (evt.target.id.endsWith('start') && !_(this)._raining) {
        _(this)._raining = true;
        _(this)._restart();
      }
    }

    _onVolumeMenuClick(evt) {
      if (!(evt.target instanceof HTMLSpanElement)) {
        return;
      }

      const level = evt.target.dataset.level;

      _(this)._volumeLevel = level;

      if (level === 'silent') {
        _(this)._audioManager.stop();
      } else {
        _(this)._audioManager.playAndSetVolume(level);
      }
    }

    // eslint-disable-next-line class-methods-use-this
    _onSmallViewSidebarToggleClick() {
      $('body').classList.toggle('small-view-sidebar-visible');
    }

    // eslint-disable-next-line class-methods-use-this
    _handleFontBlobPromises(fontBlobPromises) {
      fontBlobPromises.forEach((promise, fontName) => {
        promise.then((blob) => {
          const styleElem = $e('style');

          const url = URL.createObjectURL(blob);

          styleElem.textContent = `
          @font-face {
            font-family: 'MIH ${fontName.toUpperCase()}';
            font-weight: ${$computedStyle('body', 'font-weight')};
            src: url('${url}') format('woff2');
          }
        `;

          $('head').appendChild(styleElem);
        });
      });
    }

    async _handleAudioAvailablePromise(audioAvailablePromise) {
      await audioAvailablePromise;

      _(this)._audioAvailable = true;

      $('#volume-control > span[data-level="silent"]').click();
    }

    async _switchPage(pageName) {
      _(this)._loading = true;
      const pageSourcePromise = _(this)._contentManager.getPageSourcePromise(
        pageName
      );

      _(this)._canvasController.pageSourcePromise = pageSourcePromise;
      _(this)._restart(true);

      await pageSourcePromise;
      _(this)._currentPage = pageName;
    }

    init() {
      _(this)._loading = true;

      const fontBlobPromises = _(this)._contentManager.getFontBlobPromises();
      _(this)._canvasController.fontBlobPromises = fontBlobPromises;

      _(this)._canvasController.pageStyleSheetPromise = _(
        this
      )._contentManager.getPageStyleSheetPromise();

      _(this)._initEventListeners();

      _(this)._handleFontBlobPromises(fontBlobPromises);

      _(this)._handleAudioAvailablePromise(
        _(this)._audioManager.getAudioAvailablePromise()
      );
    }
  }

  _ = window.createInternalFunction(SiteController);
  if (window.DEBUG) window.internalFunctions[SiteController] = _;

  exports.SiteController = SiteController;
})(window);
