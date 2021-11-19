// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

'use strict';

// Rain-related code heavily modified from http://tympanus.net/codrops/2015/11/04/rain-water-effect-experiments/

(function (exports) {
  const INNER_PAGE_SCROLL_TOP_MARGIN = 20;
  const INNER_PAGE_SCROLL_MAX_NUM_PASSES = 30;
  const INNER_PAGE_SCROLL_SPEED_ALPHA = 5;
  const INNER_PAGE_SCROLL_SPEED_DELTA = 20;

  exports.CanvasController = class CanvasController {
    static RainEngineClientClass;

    #main;
    #viewport;
    #pageHolder;

    #fontBlobPromises;
    #pagesStyleSheetPromise;
    #pageSourcePromise;

    #page;
    #lastWidthDots;
    #lastHeightDots;

    #dppx;

    #scrollRequestAnimationFrameId;

    #currentAbortController = new AbortController();

    #currentScrollOffsetDots = 0;

    #mainOffsetForPaperBackground = 0;

    #fullPageBitmap;
    #viewportPageCanvas = $e('canvas');

    #rainEngineClient;

    #paperBackgroundPromise = Promise.resolve(new Image());

    onLoadingState = () => {};
    getPaperBackgroundSVGURL = () => {};

    raining = true;

    get #rasterizationWidthDots() {
      return this.#pageHolder.getBoundingClientRect().width * this.#dppx;
    }

    get #rasterizationHeightDots() {
      return this.#viewportPageCanvas.height;
    }

    ready() {
      this.#main = $('#main');
      this.#viewport = $('#viewport');
      this.#pageHolder = $('#page-holder');

      this.#rainEngineClient = new CanvasController.RainEngineClientClass(
        this.#viewport
      );
    }

    start() {
      this.onResize();
      this.#startRainEngine();
    }

    async onResize() {
      const dppx = window.devicePixelRatio;
      this.#dppx = dppx;

      this.#mainOffsetForPaperBackground =
        this.#main.getBoundingClientRect().left;

      this.#setCanvasSize();

      this.#preparePagePaperBackground();

      if (this.#rasterizationHeightDots !== this.#lastHeightDots) {
        this.#page?.requestResizeHRasterization(
          this.#rasterizationHeightDots,
          this.#dppx
        );
        this.#lastHeightDots = this.#rasterizationHeightDots;
      }

      if (this.#rasterizationWidthDots !== this.#lastWidthDots) {
        this.#page?.requestResizeWRasterization(
          this.#rasterizationWidthDots,
          this.#dppx
        );
        this.#lastWidthDots = this.#rasterizationWidthDots;
      }
    }

    async stopPage() {
      this.#currentAbortController.abort();

      this.#detachEvents();
      clearInterval(this.#scrollRequestAnimationFrameId);

      await this.#renderPagePaperBackground();

      this.#updateRainEngineContent();

      document.documentElement.scrollTop = this.#currentScrollOffsetDots = 0;
    }

    async startPage() {
      this.#currentAbortController = new AbortController();
      const thisAbortSignal = this.#currentAbortController.signal;

      await this.#deserializePage(thisAbortSignal, this.#dppx);

      if (thisAbortSignal.aborted) {
        return;
      }

      this.#attachEvents();

      this.#receiveActualPageBitmaps(thisAbortSignal);
    }

    #startRainEngine() {
      return this.#rainEngineClient.start(
        this.#viewportPageCanvas.width,
        this.#viewportPageCanvas.height,
        this.#dppx,
        this.raining
      );
    }

    #destroyRainEngine() {
      this.#rainEngineClient?.destroy();
    }

    async restartRainEngine() {
      this.#destroyRainEngine();
      await this.#startRainEngine();

      this.#updateRainEngineContent();
    }

    set pageSourcePromise(pageSourcePromise) {
      this.#pageSourcePromise = pageSourcePromise;
    }

    set fontBlobPromises(fontBlobPromises) {
      this.#fontBlobPromises = fontBlobPromises;
    }

    set pagesStyleSheetPromise(styleSheetPromise) {
      this.#pagesStyleSheetPromise = styleSheetPromise;
    }

    inPageSwitchView(action) {
      this.#page.switchView(action);
    }

    #setCanvasSize() {
      const dppx = window.devicePixelRatio;

      const width = this.#main.getBoundingClientRect().width * dppx;
      const height = window.innerHeight * dppx;

      this.#rainEngineClient.resize(width, height, dppx);

      this.#viewportPageCanvas.width = width;
      this.#viewportPageCanvas.height = height;
    }

    async #renderViewportPageCanvas() {
      await this.#renderPagePaperBackground();
      const canvasCtx = this.#viewportPageCanvas.getContext('2d', {
        alpha: false,
      });
      const { width: widthDots, height: canvasHeightDots } =
        this.#viewportPageCanvas;

      const drawingHeightDots = Math.min(
        this.#page.contentHeightDots,
        canvasHeightDots
      );

      // - 1 to get around with chrome's mysterious 1px black line at the bottom

      if (this.#currentScrollOffsetDots >= 0) {
        canvasCtx.drawImage(
          this.#fullPageBitmap,
          0,
          this.#currentScrollOffsetDots,
          widthDots,
          drawingHeightDots - 1,
          0,
          0,
          widthDots,
          drawingHeightDots
        );
      } else {
        canvasCtx.drawImage(
          this.#fullPageBitmap,
          0,
          0,
          widthDots,
          drawingHeightDots + this.#currentScrollOffsetDots - 1,
          0,
          -this.#currentScrollOffsetDots,
          widthDots,
          drawingHeightDots + this.#currentScrollOffsetDots
        );
      }
    }

    async #renderPagePaperBackground() {
      const canvasCtx = this.#viewportPageCanvas.getContext('2d', {
        alpha: false,
      });

      const paperBackground = await this.#paperBackgroundPromise;

      const { width, height } = this.#viewportPageCanvas;

      canvasCtx.drawImage(
        paperBackground,
        this.#mainOffsetForPaperBackground,
        0,
        paperBackground.width,
        paperBackground.height,
        0,
        0,
        width,
        height
      );
    }

    #preparePagePaperBackground() {
      this.#paperBackgroundPromise = new Promise((resolve, reject) => {
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
        const height = this.#rasterizationHeightDots / this.#dppx;
        img.src = this.getPaperBackgroundSVGURL(width, height);

        img.width = width - this.#mainOffsetForPaperBackground;
        img.height = height;
      });
    }

    async #deserializePage(abortSignal, dppx) {
      const fontDataURLArray = await Promise.all(
        Array.from(this.#fontBlobPromises.values()).map((promise) =>
          promise.then((blob) => blob.asDataURL())
        )
      );

      if (abortSignal.aborted) {
        return;
      }

      const styleSheet = await this.#pagesStyleSheetPromise;

      if (abortSignal.aborted) {
        return;
      }

      const fontDataURLs = new Map(
        Array.from(this.#fontBlobPromises.keys()).map((fontName, idx) => [
          fontName,
          fontDataURLArray[idx],
        ])
      );

      const pageSource = await this.#pageSourcePromise;

      if (abortSignal.aborted) {
        return;
      }

      this.#page = pageSource.deserialize(
        styleSheet,
        fontDataURLs,
        {
          dppx,
          widthDots: this.#rasterizationWidthDots,
          heightDots: this.#rasterizationHeightDots,
        },
        abortSignal,
        (loading) => {
          this.onLoadingState(loading);
        }
      );

      this.#page.addEventListener('click', this.#onPageClick);
    }

    async #receiveActualPageBitmaps(abortSignal) {
      const page = this.#page;
      for await (const bitmap of page.actualImagesGenerator()) {
        if (abortSignal.aborted) {
          break;
        }

        this.#main.style.height = `${
          this.#page.contentHeightDots / this.#dppx
        }px`;

        this.#fullPageBitmap = bitmap;
        await this.#renderViewportPageCanvas();
        this.#updateRainEngineContent();
      }
    }

    async #updateRainEngineContent() {
      this.#rainEngineClient.updateContent(
        await 〆.convertToImageBitmapIfPossible(this.#viewportPageCanvas)
      );
    }

    #attachEvents() {
      window.addEventListener('scroll', this.#onScroll);
    }

    #detachEvents() {
      window.removeEventListener('scroll', this.#onScroll);
    }

    #onPageClick = (evt) => {
      const { target } = evt;

      if (
        target instanceof HTMLAnchorElement &&
        target.closest('.in-page-menu')
      ) {
        let margin = INNER_PAGE_SCROLL_TOP_MARGIN;

        if (〆.isSmallView()) {
          margin += 〆.computedStyle(
            'html',
            '--small-view-header-height',
            parseFloat
          );
        }

        const targetSelector = target.href.substr(target.href.indexOf('#'));

        this.#smoothScrollTop(
          〆.normalizeDOMRect($(targetSelector)).top - margin
        );

        evt.preventDefault();
      }
    };

    #onScroll = async () => {
      const dppx = window.devicePixelRatio;

      const newOffset = document.documentElement.scrollTop * dppx;

      if (this.#currentScrollOffsetDots === newOffset) return;
      this.#currentScrollOffsetDots = newOffset;

      await this.#renderViewportPageCanvas();
      this.#updateRainEngineContent();
    };

    // Safari (macOS / iOS) doesn't support scrollTo behavior: smooth, so impl'ing it ourselves
    #smoothScrollTop(targetTop) {
      cancelAnimationFrame(this.#scrollRequestAnimationFrameId);

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

      this.#scrollRequestAnimationFrameId = requestAnimationFrame(scrollPass);
    }
  };
})(window);
