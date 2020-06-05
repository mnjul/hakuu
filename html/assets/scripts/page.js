// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2020 Min-Zhong Lu

'use strict';

;(function(exports){

let Page;

(function(){

let _;

Page = class {
  constructor(pageSource, {dppx, widthDots}, abortSignal) {
    _(this)._doc = undefined;
    _(this)._dppx = dppx;
    _(this)._contentWidthDots = widthDots;
    _(this)._contentHeightDots = undefined;
    _(this)._rasterizationDetector = new PageRasterizationDetector(dppx);
    _(this)._actionables = undefined;
    _(this)._image = undefined;

    this.imagePromise = new Promise(async resolve => {
      _(this)._doc = new DOMParser().parseFromString(pageSource, 'image/svg+xml');

      await _(this)._fetchImages();

      if (abortSignal.aborted) { resolve(); }

      await _(this)._computeSVGRendering();

      if (abortSignal.aborted) { resolve(); }

      await _(this)._produceImage();

      resolve(_(this)._image);
    });
  }

  get contentHeightDots() {
    return _(this)._contentHeightDots;
  }

  isActionable(x, y) {
    return _(this)._getActionable(x, y) !== undefined;
  }

  triggerActionable(x, y, callback) {
    let actionable = _(this)._getActionable(x, y);

    if (actionable) {
      callback(Object.seal(actionable));
    }
  }

  async _fetchImages() {
    let imgElems = Array.from(_(this)._doc.querySelectorAll('img'));
    let responses = await Promise.all(
      imgElems.map(elem => fetch(new Request(elem.getAttribute('src'))))
    );

    responses = await Promise.all(
      responses.map(r => r.blob().then(blob => blob.asDataURL()))
    );

    imgElems.forEach((elem, idx) => {
      let imgBase64 = responses[idx];
      elem.setAttribute('src', imgBase64);
    });
  }

  async _computeSVGRendering() {
    let dppx = _(this)._dppx;
    $('html').style.fontSize = `${dppx * REM_SCALE}px`;

    let doc = document.importNode(_(this)._doc.documentElement, true);
    let container = $e('div');
    container.id = 'svg-computer';
    container.appendChild(doc);
    $('body').appendChild(container);

    await Promise.all(Array.from(doc.$$('img')).map(
      elem => new Promise((resolve, reject) => {
        elem.addEventListener('load', resolve);
        elem.addEventListener('error', reject.bind(`Image ${elem.src} fails to load`));
      })
    ));

    _(this)._rasterizationDetector.setBGColor(
      getComputedStyle($('#svg-computer-body')).backgroundColor
    );

    await new Promise(
      resolve => {
        // It appears that for android, one requestAnimationFrame call is not
        // enough, and we need two separate return-to-event-queue constructs.
        setTimeout(() => {
          requestAnimationFrame(() => {
            _(this)._contentHeightDots = Math.ceil(
              doc.$('#svg-main-container').getBoundingClientRect().height
            );

            _(this)._actionables = [
              ...Array.from(doc.$$('[data-action]'))
                .map(elem => ({
                  action: elem.dataset.action,
                  target: elem.dataset.target,
                  rects: Array.from(elem.getClientRects())
                })),
              ...Array.from(doc.$$('a'))
                .map(elem => ({
                  action: 'open-link',
                  target: elem.href,
                  rects: Array.from(elem.getClientRects())
                })),
            ];

            _(this)._rasterizationDetector.setTargetPoints(
              [
                ...Array.from(doc.$$('.rasterization-detector-target')),
                ...Array.from(doc.$$('img'))
              ].map(elem => {
                let rect = elem.getBoundingClientRect();
                return {
                  x: rect.left,
                  y: rect.top,
                };
              })
            );

            container.remove();

            resolve();
          });
        }, 1);
      });
  }

  async _produceImage() {
    _(this)._doc.documentElement.setAttribute('width', _(this)._contentWidthDots);
    _(this)._doc.documentElement.setAttribute('height', _(this)._contentHeightDots);

    let serializer = new XMLSerializer();
    let img = new Image();

    let url =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(serializer.serializeToString(_(this)._doc));

    _(this)._image = await new Promise((resolve, reject) => {
      img.src = url;
      img.addEventListener('error', reject);     
      
      img.addEventListener('load', async () => {
        await _(this)._rasterizationDetector.detect(img);
        resolve(img);
      });
    });
  }

  _getActionable(x, y) {
    return _(this)._actionables.find(
      actionable => actionable.rects.some(
        rect => x >= rect.left &&
                x <= rect.right &&
                y >= rect.top &&
                y <= rect.bottom
      )
    );
  }
};

_ = window.createInternalFunction(Page);
if (window.DEBUG) {
  window.internalFunctions[Page] = _;
  exports.Page = Page;
}

})();

let PageRasterizationDetector;

(function(){

let _;

const RASTERIZE_TIMEOUT_MS = 200;
const RASTERIZE_DETECT_SIZE = 20;
const RASTERIZE_DETECT_OFFSET = RASTERIZE_DETECT_SIZE / 2;

PageRasterizationDetector = class {
  constructor(dppx) {
    _(this)._targetPoints = [];
    _(this)._dppx = dppx;
    _(this)._bgColorRGB = [];
  }

  setTargetPoints(points) {
    _(this)._targetPoints = points;
  }

  setBGColor(bgColor) {
    _(this)._bgColorRGB =
      bgColor.substr('rgb('.length).split(',')
        .map(val => val.trim())
        .map(val => parseInt(val));
  }

  async detect(image) {
    const promises =
      _(this)._targetPoints.map(point => _(this)._detectPoint(image, point));
    return Promise.all(promises);
  }

  _detectPoint(image, point) {
    return new Promise((resolve) => {
      const detectSize = RASTERIZE_DETECT_SIZE * _(this)._dppx;
      const detectOffset = RASTERIZE_DETECT_OFFSET * _(this)._dppx;

      let canvas = $e('canvas');
      canvas.width = canvas.height = detectSize;
      let ctx = canvas.getContext('2d', {alpha: false});

      let rasterizationStart = performance.now();
      let rasterizationTries = 0;

      const tryRasterize = () => {
        rasterizationTries++;

        ctx.drawImage(image,
                      point.x + detectOffset, point.y + detectOffset,
                      detectSize, detectSize,
                      0, 0,
                      detectSize, detectSize);

        let {data: sample} = ctx.getImageData(0, 0, detectSize, detectSize);

        let sampleRGBs = [];
        for (let i = 0; i < sample.length; i +=4) {
          sampleRGBs.push([sample[i], sample[i+1], sample[i+2]]);
        }

        let detectedRasterization =
          sampleRGBs.some(([sampleR, sampleG, sampleB]) => {
            let [bgR, bgG, bgB] = _(this)._bgColorRGB;
            return sampleR !== bgR ||
                   sampleG !== bgG ||
                   sampleB !== bgB;
          });

        if (detectedRasterization) {
          console.log(`Rasterization detected after ${rasterizationTries} tries for x=${point.x}, y=${point.y}`);
          resolve();
        } else {
          if (performance.now() - rasterizationStart > RASTERIZE_TIMEOUT_MS) {
            console.warn(`Rasterization timed out after ${rasterizationTries} tries for x=${point.x}, y=${point.y}, resolving anyway`);
            resolve();
          } else {
            requestAnimationFrame(tryRasterize);
          }
        }
      }

      requestAnimationFrame(tryRasterize);         
    });
  }
};

_ = window.createInternalFunction(PageRasterizationDetector);
if (window.DEBUG) {
  window.internalFunctions[PageRasterizationDetector] = _;
  exports.PageRasterizationDetector = PageRasterizationDetector;
}

})();

(function(){

// static functions

const PAGE_CLASSES_GETTER = Object.freeze({
  home: () => [],
  review: ({isSmallView, width}) => {
    if (isSmallView) {
      return ['review-small'];
    }

    if (width <= 840) {
      return ['review-narrow'];
    }

    return [];
  },
  finale: () => [],
})

const SMALL_VIEW_STYLE_PARAMS = Object.freeze({
  pMarginBottom: 0.25,
  paddingTop: 0.25,
  paddingBottom: 1.3,
  paddingHorizontal: 0.24,
  fontSize: 0.17,
  lineHeight: 1.65,
});

const REGULAR_VIEW_STYLE_PARAMS = Object.freeze({
  paddingBottom: 0.6,
  pMarginBottom: 0.14,
  paddingHorizontal: 0.12,
  fontSize: 0.18,
  lineHeight: 1.6,
});

function wrapSVGSource(html) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg">
    <foreignObject width="100%" height="100%">
    ${html}
    </foreignObject>
    </svg>
  `;
}

function getCSSPlaceholderRegexp(tag) {
  return new RegExp(`/\\*!%${tag}%\\*/0`, 'i');
}

function insertFonts(source, fontDataURLs) {
  Object.entries(fontDataURLs).forEach(([fontName, dataURL]) => {
    source = source.replace(getCSSPlaceholderRegexp(`${fontName}FONT`), dataURL); 
  });

  return source;
}

let _;

class PageSource {
  constructor(source, name) {
    _(this)._source = source;
    _(this)._name = name;

    _(this)._smallViewStyleParams = Object.freeze(Object.assign({}, SMALL_VIEW_STYLE_PARAMS, {
      paddingTop:
        parseFloat(
          getComputedStyle($('html')).getPropertyValue('--small-view-top-content-padding')
        ) / REM_SCALE,

      paddingHorizontal:
        parseFloat(
          getComputedStyle($('html')).getPropertyValue('--small-view-content-horizontal-padding')
        ) / REM_SCALE,
    }));

    _(this)._regularViewStyleParams = REGULAR_VIEW_STYLE_PARAMS;
  }

  asRenderedPage(styleSheet, isSmallView, styleParams, abortSignal, fontDataURLs) {
    let classes = PAGE_CLASSES_GETTER[_(this)._name]({isSmallView, width: styleParams.widthDots / styleParams.dppx});

    let source = _(this)._source.replace('/*PAGES-CSS*/', styleSheet).replace('/*PAGES-CLASSES*/', classes.join(' '));

    Object.assign(
      styleParams,
      isSmallView ? _(this)._smallViewStyleParams : _(this)._regularViewStyleParams
    );

    Object.entries(styleParams).forEach(([name, value]) => {
      source = source.replace(getCSSPlaceholderRegexp(name), value);
    });

    source = insertFonts(source, fontDataURLs);

    source = wrapSVGSource(source);

    return new Page(source, styleParams, abortSignal);
  }
}

_ = window.createInternalFunction(PageSource);
if (window.DEBUG) window.internalFunctions[PageSource] = _;

exports.PageSource = PageSource;

})();

})(window);
