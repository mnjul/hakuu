// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018 Min-Zhong Lu

'use strict';

;(function(exports){

const FONT_WEIGHT = 200;
const INIT_RAINING = true;

let _;

// TODO: Streamline state transitions
class SiteController {
  constructor(initPageName, contentManager, canvasController) {
    _(this)._initPageName = initPageName;

    _(this)._canvasController = canvasController;
    _(this)._contentManager = contentManager;

    Object.defineProperty(_(this), '_raining', {
      get() {
        return $('#rain-control').dataset.raining === 'true';
      },
      set(__raining) {
        $('#rain-control').dataset.raining = __raining;
      }
    });

    Object.defineProperty(_(this), '_loading', {
      set(__loading) {
        if (__loading) {
          $('body').classList.add('loading');
        }else {
          $('body').classList.remove('loading');
        }
      }
    });
  }

  _initEventListeners() {
    // requestAnimationFrame: sometimes Chrome doesn't have proper getBoundingRect just at DOMContentLoaded
    document.addEventListener(
      'DOMContentLoaded',
      () => requestAnimationFrame(_(this)._onReady.bind(this))
    );

    window.addEventListener('resize', _(this)._onResize.bind(this));

    $('#rain-control').addEventListener('click', _(this)._onRainContainerClick.bind(this));

    $('#main-menu').addEventListener('click', _(this)._onMenuContainerClick.bind(this));

    // hack to trigger mobile safari's :active status
    $('#sidebar').addEventListener('touchstart', () => undefined);
  }

  async _restart() {
    _(this)._loading = true;
    _(this)._canvasController.destroy();
    await _(this)._canvasController.start(_(this)._raining);
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

  _onRainContainerClick(evt) {
    if (!(evt.target instanceof HTMLSpanElement)){
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

  _onMenuContainerClick(evt) {
    if (!(evt.target instanceof HTMLSpanElement)){
      return;
    }

    _(this)._switchPage(evt.target.dataset.page);
  }

  _handleFontBlobPromises(fontBlobPromises) {
    Object.entries(fontBlobPromises).forEach(([fontName, promise]) => {
      promise.then(blob => {
        var styleElem = $e('style');

        var format = _(this)._contentManager.fonts[fontName].endsWith('.otf') ?
          'opentype': 'truetype';

        var url = URL.createObjectURL(blob);

        styleElem.textContent = `
          @font-face {
            font-family: 'MIH ${fontName.toUpperCase()}';
            font-weight: ${FONT_WEIGHT};
            src: url('${url}') format('${format}');
          }
        `;

        $('head').appendChild(styleElem);
      });
    });
  }

  async _switchPage(pageName) {
    _(this)._loading = true;
    let pageSourcePromise = _(this)._contentManager.getPageSourcePromise(pageName);

    _(this)._canvasController.pageSourcePromise = pageSourcePromise;
    _(this)._restart();

    await pageSourcePromise;
    $('#main-menu').dataset.currentPage = pageName;
  }

  init() {
    _(this)._loading = true;

    let fontBlobPromises = _(this)._contentManager.getFontBlobPromises();
    _(this)._canvasController.fontBlobPromises = fontBlobPromises;

    _(this)._canvasController.pageStyleSheetPromise =
      _(this)._contentManager.getPageStyleSheetPromise();

    _(this)._initEventListeners();
    _(this)._handleFontBlobPromises(fontBlobPromises);
  }
}

_ = window.createInternalFunction(SiteController);
if (window.DEBUG) window.internalFunctions[SiteController] = _;

exports.SiteController = SiteController;

})(window);
