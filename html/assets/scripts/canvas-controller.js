// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

'use strict';

// Rain-related code heavily modified from http://tympanus.net/codrops/2015/11/04/rain-water-effect-experiments/

(function (exports) {
  const INNER_PAGE_SCROLL_TOP_MARGIN = 20;
  const INNER_PAGE_SCROLL_MAX_NUM_PASSES = 30;
  const INNER_PAGE_SCROLL_SPEED_ALPHA = 5;
  const INNER_PAGE_SCROLL_SPEED_DELTA = 20;

  let _;

  class CanvasController {
    constructor(RainEngineClientClass) {
      _(this)._main = undefined;
      _(this)._viewport = undefined;
      _(this)._pageHolder = undefined;

      _(this)._fontBlobPromises = undefined;
      _(this)._pagesStyleSheetPromise = undefined;
      _(this)._pageSourcePromise = undefined;

      _(this)._page = undefined;
      _(this)._lastWidthDots = undefined;
      _(this)._lastHeightDots = undefined;

      _(this)._dppx = undefined;

      _(this)._scrollRequestAnimationFrameId = undefined;

      _(this)._currentAbortController = new AbortController();

      _(this)._currentScrollOffsetDots = 0;

      _(this)._mainOffsetForPaperBackground = 0;

      _(this)._fullPageBitmap = undefined;
      _(this)._viewportPageCanvas = $e('canvas');
      _(this)._RainEngineClientClass = RainEngineClientClass;
      _(this)._rainEngineClient = undefined;

      _(this)._paperBackgroundPromise = Promise.resolve(new Image());

      // eslint-disable-next-line no-empty-function
      this.onLoadingState = () => {};
      // eslint-disable-next-line no-empty-function
      this.getPaperBackgroundSVGURL = () => {};

      this.raining = true;

      Object.defineProperty(_(this), '_rasterizationWidthDots', {
        get() {
          return this._pageHolder.getBoundingClientRect().width * this._dppx;
        },
      });

      Object.defineProperty(_(this), '_rasterizationHeightDots', {
        get() {
          return this._viewportPageCanvas.height;
        },
      });
    }

    ready() {
      _(this)._main = $('#main');
      _(this)._viewport = $('#viewport');
      _(this)._pageHolder = $('#page-holder');

      _(this)._rainEngineClient = new (_(this)._RainEngineClientClass)(
        _(this)._viewport
      );
    }

    start() {
      this.onResize();
      _(this)._startRainEngine();
    }

    async onResize() {
      const dppx = window.devicePixelRatio;
      _(this)._dppx = dppx;

      _(this)._mainOffsetForPaperBackground = _(
        this
      )._main.getBoundingClientRect().left;

      _(this)._setCanvasSize();

      _(this)._preparePagePaperBackground();

      if (_(this)._rasterizationHeightDots !== _(this)._lastHeightDots) {
        _(this)._page?.requestResizeHRasterization(
          _(this)._rasterizationHeightDots,
          _(this)._dppx
        );
        _(this)._lastHeightDots = _(this)._rasterizationHeightDots;
      }

      if (_(this)._rasterizationWidthDots !== _(this)._lastWidthDots) {
        _(this)._page?.requestResizeWRasterization(
          _(this)._rasterizationWidthDots,
          _(this)._dppx
        );
        _(this)._lastWidthDots = _(this)._rasterizationWidthDots;
      }
    }

    async stopPage() {
      _(this)._currentAbortController.abort();

      _(this)._detachEvents();
      clearInterval(_(this)._scrollRequestAnimationFrameId);

      await _(this)._renderPagePaperBackground();

      _(this)._updateRainEngineContent();

      document.documentElement.scrollTop = _(this)._currentScrollOffsetDots = 0;
    }

    async startPage() {
      _(this)._currentAbortController = new AbortController();
      const thisAbortSignal = _(this)._currentAbortController.signal;

      await _(this)._deserializePage(thisAbortSignal, _(this)._dppx);

      if (thisAbortSignal.aborted) {
        return;
      }

      _(this)._attachEvents();

      _(this)._receiveActualPageBitmaps(thisAbortSignal);
    }

    _startRainEngine() {
      return _(this)._rainEngineClient.start(
        _(this)._viewportPageCanvas.width,
        _(this)._viewportPageCanvas.height,
        _(this)._dppx,
        this.raining
      );
    }

    _destroyRainEngine() {
      _(this)._rainEngineClient?.destroy();
    }

    async restartRainEngine() {
      _(this)._destroyRainEngine();
      await _(this)._startRainEngine();

      _(this)._updateRainEngineContent();
    }

    set pageSourcePromise(pageSourcePromise) {
      _(this)._pageSourcePromise = pageSourcePromise;
    }

    set fontBlobPromises(fontBlobPromises) {
      _(this)._fontBlobPromises = fontBlobPromises;
    }

    set pageStyleSheetPromise(styleSheetPromise) {
      _(this)._pageStyleSheetPromise = styleSheetPromise;
    }

    inPageSwitchView(action) {
      _(this)._page.switchView(action);
    }

    _setCanvasSize() {
      const dppx = window.devicePixelRatio;

      const width = _(this)._main.getBoundingClientRect().width * dppx;
      const height = window.innerHeight * dppx;

      _(this)._rainEngineClient.resize(width, height, dppx);

      _(this)._viewportPageCanvas.width = width;
      _(this)._viewportPageCanvas.height = height;
    }

    async _renderViewportPageCanvas() {
      await _(this)._renderPagePaperBackground();
      const canvasCtx = _(this)._viewportPageCanvas.getContext('2d', {
        alpha: false,
      });
      const { width: widthDots, height: canvasHeightDots } = _(
        this
      )._viewportPageCanvas;

      const drawingHeightDots = Math.min(
        _(this)._page.contentHeightDots,
        canvasHeightDots
      );

      // - 1 to get around with chrome's mysterious 1px black line at the bottom

      if (_(this)._currentScrollOffsetDots >= 0) {
        canvasCtx.drawImage(
          _(this)._fullPageBitmap,
          0,
          _(this)._currentScrollOffsetDots,
          widthDots,
          drawingHeightDots - 1,
          0,
          0,
          widthDots,
          drawingHeightDots
        );
      } else {
        canvasCtx.drawImage(
          _(this)._fullPageBitmap,
          0,
          0,
          widthDots,
          drawingHeightDots + _(this)._currentScrollOffsetDots - 1,
          0,
          -_(this)._currentScrollOffsetDots,
          widthDots,
          drawingHeightDots + _(this)._currentScrollOffsetDots
        );
      }
    }

    async _renderPagePaperBackground() {
      const canvasCtx = _(this)._viewportPageCanvas.getContext('2d', {
        alpha: false,
      });

      const paperBackground = await _(this)._paperBackgroundPromise;

      const { width, height } = _(this)._viewportPageCanvas;

      canvasCtx.drawImage(
        paperBackground,
        _(this)._mainOffsetForPaperBackground,
        0,
        paperBackground.width,
        paperBackground.height,
        0,
        0,
        width,
        height
      );
    }

    _preparePagePaperBackground() {
      _(this)._paperBackgroundPromise = new Promise((resolve, reject) => {
        const img = new Image();

        img.addEventListener('error', reject, { once: true });
        img.addEventListener(
          'load',
          () => {
            resolve(img);
          },
          { once: true }
        );

        // these dimensions are in logic pixels because svgs don't have that scaling concept when rendered onto a canvas
        const width = window.innerWidth;
        const height = _(this)._rasterizationHeightDots / _(this)._dppx;
        img.src = this.getPaperBackgroundSVGURL(width, height);

        img.width = width - _(this)._mainOffsetForPaperBackground;
        img.height = height;
      });
    }

    async _deserializePage(abortSignal, dppx) {
      const fontDataURLArray = await Promise.all(
        Array.from(_(this)._fontBlobPromises.values()).map((promise) =>
          promise.then((blob) => blob.asDataURL())
        )
      );

      if (abortSignal.aborted) {
        return;
      }

      const styleSheet = await _(this)._pageStyleSheetPromise;

      if (abortSignal.aborted) {
        return;
      }

      const fontDataURLs = new Map(
        Array.from(_(this)._fontBlobPromises.keys()).map((fontName, idx) => [
          fontName,
          fontDataURLArray[idx],
        ])
      );

      const pageSource = await _(this)._pageSourcePromise;

      if (abortSignal.aborted) {
        return;
      }

      _(this)._page = pageSource.deserialize(
        styleSheet,
        fontDataURLs,
        {
          dppx,
          widthDots: _(this)._rasterizationWidthDots,
          heightDots: _(this)._rasterizationHeightDots,
        },
        abortSignal,
        (loading) => {
          this.onLoadingState(loading);
        }
      );

      _(this)._page.addEventListener('click', this.onPageClick);
    }

    async _receiveActualPageBitmaps(abortSignal) {
      const page = _(this)._page;
      for await (const bitmap of page.actualImagesGenerator()) {
        if (abortSignal.aborted) {
          break;
        }

        _(this)._main.style.height = `${
          _(this)._page.contentHeightDots / _(this)._dppx
        }px`;

        _(this)._fullPageBitmap = bitmap;
        await _(this)._renderViewportPageCanvas();
        _(this)._updateRainEngineContent();
      }
    }

    async _updateRainEngineContent() {
      _(this)._rainEngineClient.updateContent(
        await 〆.$convertToImageBitmapIfPossible(_(this)._viewportPageCanvas)
      );
    }

    _attachEvents() {
      window.addEventListener('scroll', this.onScroll);
    }

    _detachEvents() {
      window.removeEventListener('scroll', this.onScroll);
    }

    onPageClick = (evt) => {
      const { target } = evt;

      if (
        target instanceof HTMLAnchorElement &&
        target.closest('.in-page-menu')
      ) {
        let margin = INNER_PAGE_SCROLL_TOP_MARGIN;

        if (〆.$isSmallView()) {
          margin += 〆.$computedStyle(
            'html',
            '--small-view-header-height',
            parseFloat
          );
        }

        const targetSelector = target.href.substr(target.href.indexOf('#'));

        _(this)._smoothScrollTop(
          〆.$normalizeDOMRect($(targetSelector)).top - margin
        );

        evt.preventDefault();
      }
    };

    onScroll = async () => {
      const dppx = window.devicePixelRatio;

      const newOffset = document.documentElement.scrollTop * dppx;

      if (_(this)._currentScrollOffsetDots === newOffset) return;
      _(this)._currentScrollOffsetDots = newOffset;

      await _(this)._renderViewportPageCanvas();
      _(this)._updateRainEngineContent();
    };

    // Safari (macOS / iOS) doesn't support scrollTo behavior: smooth, so impl'ing it ourselves
    _smoothScrollTop(targetTop) {
      cancelAnimationFrame(_(this)._scrollRequestAnimationFrameId);

      let currentPass = 0;

      const scrollPass = () => {
        const currentScrollTop = document.documentElement.scrollTop;
        const distance = targetTop - currentScrollTop;

        let thisPassScrollDistance;
        if (currentPass === INNER_PAGE_SCROLL_MAX_NUM_PASSES - 1) {
          thisPassScrollDistance = distance;
        } else {
          thisPassScrollDistance = Math.min(
            distance,
            distance / INNER_PAGE_SCROLL_SPEED_ALPHA +
              INNER_PAGE_SCROLL_SPEED_DELTA
          );
        }

        document.documentElement.scrollTop =
          currentScrollTop + thisPassScrollDistance;

        if (
          currentPass <= INNER_PAGE_SCROLL_MAX_NUM_PASSES &&
          thisPassScrollDistance < distance
        ) {
          currentPass++;
          requestAnimationFrame(scrollPass);
        }
      };

      _(this)._scrollRequestAnimationFrameId = requestAnimationFrame(
        scrollPass
      );
    }
  }

  _ = window.createInternalFunction(CanvasController);
  if (window.DEBUG) window.internalFunctions[CanvasController] = _;

  exports.CanvasController = CanvasController;
})(window);
