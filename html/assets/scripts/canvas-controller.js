// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2020 Min-Zhong Lu

'use strict';

// Rain-related code heavily modified from http://tympanus.net/codrops/2015/11/04/rain-water-effect-experiments/

;(function(exports){

const SMALL_VIEW_WIDTH_CUTOFF = 600;
const INNER_PAGE_SCROLL_TOP_MARGIN = 20;
const INNER_PAGE_SCROLL_MAX_NUM_PASSES = 30;
const INNER_PAGE_SCROLL_SPEED_ALPHA = 5;
const INNER_PAGE_SCROLL_SPEED_DELTA = 20;

function isSmallView() {
  return window.innerWidth < SMALL_VIEW_WIDTH_CUTOFF;
}

let RainEngineClient;

(function(){

let _;

RainEngineClient = class {
  constructor(contentCanvas, viewportCanvas, raining, dppx){
    let raindrops = _(this)._raindrops = new window.RainEngine.Raindrops(
      viewportCanvas.width,
      viewportCanvas.height,
      (isSmallView() ? 0.6 : 0.8) * dppx, {
        raining: raining,
        minR: 10,
        maxR: 40,
        rainChance: 0.4,
        rainLimit: 10,
        dropletsRate: 0.5,
        dropletsSize: [2, 6],
        collisionRadiusIncrease: 0.0002,
        trailRate: 10,
        trailScaleRange: [0.2, 0.45],
        collisionRadius: 0.45,
        dropletsCleaningRadiusMultiplier: 0.28,
        dropFallMultiplier:5,
        globalTimeScale: 1.2,
      }
    );

    this.constructsPromise = raindrops.initedPromise.then(() => {
      _(this)._renderer = new window.RainEngine.RainRenderer(
        viewportCanvas,
        raindrops.canvas,
        contentCanvas,
        {
          brightness: 0.985,
          alphaMultiply: 6,
          alphaSubtract: 3,
          minRefraction: 1,
          maxRefraction: 20,
        }
      );
    });
  }

  get raindrops() {
    return _(this)._raindrops;
  }

  get renderer() {
    return _(this)._renderer;
  }

  destroy() {
    _(this)._raindrops.destroy();
    if (_(this)._renderer) {
      _(this)._renderer.destroy();
    }
  }
};

_ = window.createInternalFunction(RainEngineClient);

if (window.DEBUG) {
  window.internalFunctions[RainEngineClient] = _;
  exports.RainEngineClient = RainEngineClient;
}

})();

(function(){

let _;

class CanvasController {
  constructor() {
    _(this)._viewport = undefined;

    _(this)._fontBlobPromises = undefined;
    _(this)._pagesStyleSheetPromise = undefined;
    _(this)._pageSourcePromise = undefined;

    _(this)._pageOfCurrentWidth = undefined;
    _(this)._lastWidthDots = undefined;
    _(this)._lastPageSourcePromise = undefined;

    _(this)._bgColor = undefined;

    _(this)._scrollRequestAnimationFrameId = undefined;

    _(this)._currentAbortController = new AbortController();

    _(this)._currentScrollOffsetDots = 0;

    _(this)._fullPageBitmap = undefined;
    _(this)._viewportPageCanvas = $e('canvas');
    _(this)._rainEngineClient = undefined;

    _(this)._lastTouchStartY = 0;

    _(this)._onScrollBound = _(this)._onScroll.bind(this);

    _(this)._onMousemoveBound = _(this)._onMousemove.bind(this);
    _(this)._onClickBound = _(this)._onClick.bind(this);
  }

  ready() {
    _(this)._viewport = $('#viewport');
    _(this)._bgColor = $computedStyle('body', 'background-color');
  }

  async start(raining, resetScroll) {
    let dppx = window.devicePixelRatio;

    _(this)._currentAbortController.abort();
    _(this)._currentAbortController = new AbortController();
    let thisAbortSignal = _(this)._currentAbortController.signal;

    _(this)._setCanvasSize();
    _(this)._prepareViewportPageCanvas();

    await Promise.all([
      _(this)._preparePageBitmap(thisAbortSignal, dppx),
      _(this)._prepareRainEngineClient(dppx, raining),
    ]);

    if (thisAbortSignal.aborted) { return; }

    if (resetScroll) {
      _(this)._currentScrollOffsetDots = 0;
      document.documentElement.scrollTop = 0;
    }

    _(this)._renderViewportPageCanvas();
    _(this)._rainEngineClient.raindrops.clearDrops();
    _(this)._rainEngineClient.renderer.updateTextures();

    _(this)._attachEvents();
  }

  destroy() {
    _(this)._detachEvents();

    clearInterval(_(this)._scrollRequestAnimationFrameId);

    if (_(this)._rainEngineClient) {
      _(this)._rainEngineClient.destroy();
    }
    _(this)._rainEngineClient = undefined;
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

  _setCanvasSize() {
    let dppx = window.devicePixelRatio;

    let {width: viewportWidth, height: viewportHeight} =
      _(this)._viewport.getBoundingClientRect();

    _(this)._viewportPageCanvas.width =
      _(this)._viewport.width =
      viewportWidth * dppx;

    _(this)._viewportPageCanvas.height =
      _(this)._viewport.height =
      viewportHeight * dppx;
  }

  _prepareViewportPageCanvas() {
    let canvasCtx = _(this)._viewportPageCanvas.getContext('2d', {alpha: false});
    canvasCtx.fillStyle = _(this)._bgColor;
    canvasCtx.fillRect(
                        0,
                        0,
                        _(this)._viewportPageCanvas.width,
                        _(this)._viewportPageCanvas.height
                      );
    canvasCtx = _(this)._viewport.getContext('webgl', {alpha: false}) || _(this)._viewport.getContext('experimental-webgl', {alpha: false});
    canvasCtx.clearColor(0.9804, 0.9804, 0.9804, 1.0);
    canvasCtx.viewport(0, 0, canvasCtx.drawingBufferWidth, canvasCtx.drawingBufferHeight);
    canvasCtx.clear(canvasCtx.COLOR_BUFFER_BIT);
  }

  _renderViewportPageCanvas() {
    let canvasCtx = _(this)._viewportPageCanvas.getContext('2d', {alpha: false});
    let {width: widthDots, height: canvasHeightDots} =
      _(this)._viewportPageCanvas;

      canvasCtx.fillStyle = _(this)._bgColor;
      canvasCtx.fillRect(
                          0,
                          0,
                          widthDots,
                          canvasHeightDots
                        );
  

    let drawingHeightDots = Math.min(
      _(this)._pageOfCurrentWidth.contentHeightDots, canvasHeightDots
    );

    // - 1 to get around with chrome's mysterious 1px black line at the bottom

    if (_(this)._currentScrollOffsetDots >= 0) {
      canvasCtx.drawImage(
        _(this)._fullPageBitmap,
        0, _(this)._currentScrollOffsetDots, widthDots, drawingHeightDots - 1,
        0, 0, widthDots, drawingHeightDots
      );
    } else {
      canvasCtx.drawImage(
        _(this)._fullPageBitmap,
        0, 0, widthDots, drawingHeightDots + _(this)._currentScrollOffsetDots - 1,
        0, -_(this)._currentScrollOffsetDots, widthDots, drawingHeightDots + _(this)._currentScrollOffsetDots
      );
    }
  }

  async _preparePageBitmap(abortSignal, dppx) {
    // this is tricky: in Promise.all we'll have to convert _fontBlobPromises
    // values to an array; this means we must be able to get _fontBlobPromises
    // keys with integer indices, while object keys don't have guaranteed order.
    // (We can alternatively use Maps though.)
    let fontNames = Object.keys(_(this)._fontBlobPromises);
    let fontDataURLArray = await Promise.all(
      (await Promise.all(
        fontNames.map(fontName => _(this)._fontBlobPromises[fontName])
      )).map(blob => blob.asDataURL())
    );

    if (abortSignal.aborted) { return; }

    let styleSheet = await _(this)._pageStyleSheetPromise;

    if (abortSignal.aborted) { return; }

    let fontDataURLs = {};

    fontNames.forEach((fontName, idx) => {
      fontDataURLs[fontName] = fontDataURLArray[idx];
    });

    if (_(this)._lastWidthDots !== _(this)._viewport.width || 
        _(this)._lastPageSourcePromise !== _(this)._pageSourcePromise){
      _(this)._pageOfCurrentWidth = (await _(this)._pageSourcePromise).asRenderedPage(
        styleSheet,
        isSmallView(),
        Object.assign({
          dppx,
          widthDots: _(this)._viewport.width,
        }, !isSmallView() ? { paddingTop: $computedStyle('#sidebar', 'top', parseFloat) / window.REM_SCALE} : {}),
        abortSignal,
        fontDataURLs
      );
   
      const resolvedBitmap = await _(this)._pageOfCurrentWidth.imagePromise;
      if (abortSignal.aborted) { return; }

      _(this)._fullPageBitmap = resolvedBitmap;
      _(this)._lastWidthDots = _(this)._viewport.width;
      _(this)._lastPageSourcePromise = _(this)._pageSourcePromise;
    }

    $('#main').style.setProperty(
      '--ghost-container-height', `${_(this)._pageOfCurrentWidth.contentHeightDots / dppx}px`);
  }

  async _prepareRainEngineClient(dppx, raining) {
    _(this)._rainEngineClient = new RainEngineClient(
      _(this)._viewportPageCanvas,
      _(this)._viewport,
      raining,
      dppx
    );

    await _(this)._rainEngineClient.constructsPromise;
  }

  _attachEvents() {
    window.addEventListener('scroll', _(this)._onScrollBound);
    _(this)._viewport.addEventListener('mousemove', _(this)._onMousemoveBound);
    _(this)._viewport.addEventListener('click', _(this)._onClickBound);
  }

  _detachEvents() {
    window.removeEventListener('scroll', _(this)._onScrollBound);
    _(this)._viewport.removeEventListener('mousemove', _(this)._onMousemoveBound);
    _(this)._viewport.removeEventListener('click', _(this)._onClickBound);
  }

  _onMousemove(evt) {
    let dppx = window.devicePixelRatio;

    let pageXDots = evt.offsetX * dppx;
    let pageYDots = evt.offsetY * dppx + _(this)._currentScrollOffsetDots;

    if (_(this)._pageOfCurrentWidth.isActionable(pageXDots, pageYDots)) {
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = 'auto';
    }
  }

  _onClick(evt) {
    let dppx = window.devicePixelRatio;

    let pageXDots = evt.offsetX * dppx;
    let pageYDots = evt.offsetY * dppx + _(this)._currentScrollOffsetDots;

    _(this)._triggerActionable(pageXDots, pageYDots);

    evt.preventDefault();
  }

  _onScroll() {
    let dppx = window.devicePixelRatio;

    _(this)._currentScrollOffsetDots = document.documentElement.scrollTop * dppx;

    _(this)._renderViewportPageCanvas();
    _(this)._rainEngineClient.renderer.updateTextures();
  }

  _triggerActionable(pageXDots, pageYDots) {
    _(this)._pageOfCurrentWidth.triggerActionable(
      pageXDots,
      pageYDots,
      actionable => {
        switch (actionable.action) {
          case 'open-link':
            window.open(actionable.target);
            break;
          case 'inner-nav':
            let target = _(this)._pageOfCurrentWidth.getInnerNavTarget(actionable.target);
            if (target) {
              let margin = INNER_PAGE_SCROLL_TOP_MARGIN;
              if (isSmallView()) {
                margin += $computedStyle('html', '--small-view-header-height', parseFloat);
              }
              _(this)._smoothScrollTop(target.top / window.devicePixelRatio - margin);
            }
            break;
        }
      }
    );
  }

  // Safari (macOS / iOS) doesn't support scrollTo behavior: smooth, so impl'ing it ourselves
  _smoothScrollTop(targetTop) {
    cancelAnimationFrame(_(this)._scrollRequestAnimationFrameId);

    let currentPass = 0;

    const scrollPass = () => {
      let currentScrollTop = document.documentElement.scrollTop;
      let distance = targetTop - currentScrollTop;

      let thisPassScrollDistance;
      if (currentPass === INNER_PAGE_SCROLL_MAX_NUM_PASSES - 1) {
        thisPassScrollDistance = distance;
      } else {
        thisPassScrollDistance = Math.min(distance, distance / INNER_PAGE_SCROLL_SPEED_ALPHA + INNER_PAGE_SCROLL_SPEED_DELTA);
      }

      document.documentElement.scrollTop = currentScrollTop + thisPassScrollDistance;

      if (currentPass === INNER_PAGE_SCROLL_MAX_NUM_PASSES - 1 || thisPassScrollDistance === distance) {
      } else {
        requestAnimationFrame(scrollPass)
      }
    }

    _(this)._scrollRequestAnimationFrameId = requestAnimationFrame(scrollPass);
  }
}

_ = window.createInternalFunction(CanvasController);
if (window.DEBUG) window.internalFunctions[CanvasController] = _;

exports.CanvasController = CanvasController;

})();

})(window);
