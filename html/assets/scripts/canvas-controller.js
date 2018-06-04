// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018 Min-Zhong Lu

'use strict';

// Rain-related code heavily modified from http://tympanus.net/codrops/2015/11/04/rain-water-effect-experiments/

;(function(exports){

const SMALL_VIEW_WIDTH_CUTOFF = 600;

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
          brightness: 1.04,
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

const REM_SCALE = 100;
const SMALL_VIEW_PADDING_TOP = 6;

class CanvasController {
  constructor() {
    _(this)._viewport = undefined;

    _(this)._fontBlobPromises = undefined;
    _(this)._pagesStyleSheetPromise = undefined;
    _(this)._pageSourcePromise = undefined;

    _(this)._pageOfCurrentWidth = undefined;

    _(this)._bgColor = undefined;

    _(this)._currentAbortController = new AbortController();

    _(this)._currentScrollOffsetDots = 0;
    _(this)._currentScrollDepthRatio = 0;

    _(this)._fullPageBitmap = undefined;
    _(this)._viewportPageCanvas = $e('canvas');
    _(this)._rainEngineClient = undefined;

    _(this)._lastTouchStartY = 0;

    _(this)._onWheelBound = _(this)._onWheel.bind(this);
    _(this)._onTouchstartBound = _(this)._onTouchstart.bind(this);
    _(this)._onTouchmoveBound = _(this)._onTouchmove.bind(this);
    _(this)._onTouchendBound = _(this)._onTouchend.bind(this);
    _(this)._onMousemoveBound = _(this)._onMousemove.bind(this);
    _(this)._onClickBound = _(this)._onClick.bind(this);

    _(this)._isLastTouchOnActionable = undefined;
  }

  ready() {
    _(this)._viewport = $('#viewport');
    _(this)._bgColor = getComputedStyle($('body')).backgroundColor;
  }

  async start(raining) {
    _(this)._currentAbortController.abort();
    _(this)._currentAbortController = new AbortController();
    let thisAbortSignal = _(this)._currentAbortController.signal;

    let dppx = window.devicePixelRatio;
    let paddingTop = isSmallView() ?
      SMALL_VIEW_PADDING_TOP / REM_SCALE :
      parseFloat(getComputedStyle($('#sidebar')).top) / REM_SCALE;

    _(this)._setCanvasSize();
    _(this)._prepareViewportPageCanvas();

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

    if (thisAbortSignal.aborted) { return; }

    let styleSheet = await _(this)._pageStyleSheetPromise;

    if (thisAbortSignal.aborted) { return; }

    let fontDataURLs = {};

    fontNames.forEach((fontName, idx) => {
      fontDataURLs[fontName] = fontDataURLArray[idx];
    });

    _(this)._pageOfCurrentWidth = (await _(this)._pageSourcePromise).asRenderedPage(
      styleSheet,
      isSmallView(),
      {
        dppx,
        widthDots: _(this)._viewport.width,
        paddingTop,
      },
      thisAbortSignal,
      fontDataURLs
    );

    _(this)._fullPageBitmap = await _(this)._pageOfCurrentWidth.bitmapPromise;

    _(this)._currentScrollOffsetDots = Number.isNaN(_(this)._currentScrollDepthRatio) ?
      0 :
      _(this)._currentScrollDepthRatio *
       (_(this)._pageOfCurrentWidth.contentHeightDots -
        _(this)._viewport.height);

    if (thisAbortSignal.aborted) { return; }

    _(this)._renderViewportPageCanvas();

    _(this)._rainEngineClient = new RainEngineClient(
      _(this)._viewportPageCanvas,
      _(this)._viewport,
      raining,
      dppx
    );

    await _(this)._rainEngineClient.constructsPromise;

    if (thisAbortSignal.aborted) { return; }

    _(this)._rainEngineClient.raindrops.clearDrops();
    _(this)._rainEngineClient.renderer.updateTextures();

    _(this)._attachEvents();
  }

  destroy() {
    _(this)._detachEvents();

    if (_(this)._rainEngineClient) {
      _(this)._rainEngineClient.destroy();
    }
    _(this)._rainEngineClient = undefined;
  }

  set pageSourcePromise(pageSourcePromise) {
    _(this)._pageSourcePromise = pageSourcePromise;
    _(this)._currentScrollDepthRatio = 0;
  }

  set fontBlobPromises(fontBlobPromises) {
    _(this)._fontBlobPromises = fontBlobPromises;
  }

  set pageStyleSheetPromise(styleSheetPromise) {
    _(this)._pageStyleSheetPromise = styleSheetPromise;
  }

  _setCanvasSize() {
    let dppx = window.devicePixelRatio;

    let viewportWidth = _(this)._viewport.getBoundingClientRect().width;
    let viewportHeight = _(this)._viewport.getBoundingClientRect().height;

    _(this)._viewport.width = viewportWidth * dppx;
    _(this)._viewport.height = viewportHeight * dppx;

    _(this)._viewportPageCanvas.width = _(this)._viewport.width;
    _(this)._viewportPageCanvas.height = _(this)._viewport.height;
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
  }

  _renderViewportPageCanvas() {
    let canvasCtx = _(this)._viewportPageCanvas.getContext('2d', {alpha: false});
    let widthDots = _(this)._viewportPageCanvas.width;
    let canvasHeightDots = _(this)._viewportPageCanvas.height;
    let drawingHeightDots = Math.min(
      _(this)._pageOfCurrentWidth.contentHeightDots, canvasHeightDots
    );

    // - 1 to get around with chrome's mysterious 1px black line at the bottom
    canvasCtx.drawImage(
      _(this)._fullPageBitmap,
      0, _(this)._currentScrollOffsetDots, widthDots, drawingHeightDots - 1,
      0, 0, widthDots, drawingHeightDots
    );
  }

  _attachEvents() {
    _(this)._viewport.addEventListener('wheel', _(this)._onWheelBound);
    _(this)._viewport.addEventListener('touchstart', _(this)._onTouchstartBound);
    _(this)._viewport.addEventListener('touchmove', _(this)._onTouchmoveBound);
    _(this)._viewport.addEventListener('touchend', _(this)._onTouchendBound);
    _(this)._viewport.addEventListener('mousemove', _(this)._onMousemoveBound);
    _(this)._viewport.addEventListener('click', _(this)._onClickBound);
  }

  _detachEvents() {
    _(this)._viewport.removeEventListener('wheel', _(this)._onWheelBound);
    _(this)._viewport.removeEventListener('touchstart', _(this)._onTouchstartBound);
    _(this)._viewport.removeEventListener('touchmove', _(this)._onTouchmoveBound);
    _(this)._viewport.removeEventListener('touchend', _(this)._onTouchendBound);
    _(this)._viewport.removeEventListener('mousemove', _(this)._onMousemoveBound);
    _(this)._viewport.removeEventListener('click', _(this)._onClickBound);
  }

  _scrollBy(delta, evt) {
    let dppx = window.devicePixelRatio;
    let viewportHeightDots = _(this)._viewport.height;

    let newScrollOffsetDots = Math.max(
      0,
      Math.min(
        _(this)._pageOfCurrentWidth.contentHeightDots - viewportHeightDots,
        _(this)._currentScrollOffsetDots + delta * dppx
      )
    );

    if (_(this)._currentScrollOffsetDots === newScrollOffsetDots) return;

    _(this)._currentScrollOffsetDots = newScrollOffsetDots;
    _(this)._currentScrollDepthRatio =
      newScrollOffsetDots /
      (_(this)._pageOfCurrentWidth.contentHeightDots - viewportHeightDots);
    _(this)._renderViewportPageCanvas();
    _(this)._rainEngineClient.renderer.updateTextures();
    _(this)._onMousemove(evt);
  }

  _onWheel(evt) {
    let viewportHeightDots = _(this)._viewport.height;
    let deltaMultiplier = [1, 30, viewportHeightDots][evt.deltaMode];
    _(this)._scrollBy(evt.deltaY * deltaMultiplier, evt);
  }

  _onTouchstart(evt) {
    // The primary purpose of this event handler is for scrolling, but it
    // disables clicking too. So restoring clicking through an extra flag
    // revolving the touch events.
    let dppx = window.devicePixelRatio;

    let pageXDots =
      (evt.touches[0].clientX - _(this)._viewport.getBoundingClientRect().left) * dppx;
    let pageYDots =
      (evt.touches[0].clientY - _(this)._viewport.getBoundingClientRect().top) * dppx +
      _(this)._currentScrollOffsetDots;

    _(this)._isLastTouchOnActionable = _(this)._pageOfCurrentWidth.isActionable(pageXDots, pageYDots);

    if (!_(this)._isLastTouchOnActionable) {
      _(this)._lastTouchStartY = evt.touches[0].clientY;
    }

    evt.preventDefault();
  }

  _onTouchmove(evt) {
    if (!_(this)._isLastTouchOnActionable) {
      var currentY = evt.touches[0].clientY;
      var delta = _(this)._lastTouchStartY - currentY;

      _(this)._lastTouchStartY = currentY;

      _(this)._scrollBy(delta, evt);
    }

    evt.preventDefault();
  }

  _onTouchend(evt) {
    if (_(this)._isLastTouchOnActionable) {
      let dppx = window.devicePixelRatio;

      let pageXDots =
        (evt.changedTouches[0].clientX - _(this)._viewport.getBoundingClientRect().left) * dppx;
      let pageYDots =
        (evt.changedTouches[0].clientY - _(this)._viewport.getBoundingClientRect().top) * dppx +
        _(this)._currentScrollOffsetDots;

      _(this)._triggerActionable(pageXDots, pageYDots);
    }

    _(this)._isLastTouchOnActionable = undefined;

    evt.preventDefault();
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

  _triggerActionable(pageXDots, pageYDots) {
    _(this)._pageOfCurrentWidth.triggerActionable(
      pageXDots,
      pageYDots,
      actionable => {
        switch (actionable.action) {
          case 'open-link':
            window.open(actionable.target);
            break;
        }
      }
    );
  }
}

_ = window.createInternalFunction(CanvasController);
if (window.DEBUG) window.internalFunctions[CanvasController] = _;

exports.CanvasController = CanvasController;

})();

})(window);
