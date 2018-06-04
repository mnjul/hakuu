// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018 Min-Zhong Lu

'use strict';

;(function(exports){

let Page;

(function(){

let _;

Page = class {
  constructor(pageSource, dppx, widthDots, abortSignal) {
    _(this)._doc = undefined;
    _(this)._dppx = dppx;
    _(this)._contentWidthDots = widthDots;
    _(this)._contentHeightDots = undefined;
    _(this)._actionables = undefined;
    _(this)._rasterizedBitmap = undefined;

    this.bitmapPromise = new Promise(async resolve => {
      _(this)._doc = new DOMParser().parseFromString(pageSource, 'image/svg+xml');

      await _(this)._fetchImages();

      if (abortSignal.aborted) { resolve(); }

      await _(this)._computeSVGRendering();

      if (abortSignal.aborted) { resolve(); }

      await _(this)._rasterize();

      resolve(_(this)._rasterizedBitmap);
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
      // XXX: hardcoded mime
      elem.setAttribute('src', `data:image/jpeg;base64,${imgBase64}`);
    });
  }

  async _computeSVGRendering() {
    let dppx = window.devicePixelRatio;
    $('html').style.fontSize = `${dppx * 100}px`;

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

    [_(this)._contentHeightDots, _(this)._actionables] = await new Promise(resolve => {
      // It appears that for android, requestAnimationFrame is not enough, and we
      // need two separate return-to-event-queue constructs.
      setTimeout(() => {
        requestAnimationFrame(() => {
          let contentHeightDots = Math.ceil(
            doc.$('#svg-main-container').getBoundingClientRect().height
          );

          let actionables = [
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

          container.remove();

          resolve([contentHeightDots, actionables]);
        });
      }, 1);
    });
  }

  async _rasterize() {
    _(this)._doc.documentElement.setAttribute('width', _(this)._contentWidthDots);
    _(this)._doc.documentElement.setAttribute('height', _(this)._contentHeightDots);

    let serializer = new XMLSerializer();
    let img = new Image();

    // not using utf8 + simple encodeuricomponent for data uri; seems incompatible with the utf-8 chars in the xml
    // so we use a rather convolved way to achieve something like python's decode().
    let url = 'data:image/svg+xml;base64,' + btoa(
      unescape(encodeURIComponent(serializer.serializeToString(_(this)._doc)))
    );

    // chrome complains about tainted canvas, so we can't use this:
    // img.crossOrigin = 'anonymous';
    // let url = URL.createObjectURL(new Blob([_(this)._doc], { type: 'image/svg+xml' }));

    _(this)._rasterizedBitmap = await new Promise((resolve, reject) => {
      img.src = url;
      img.addEventListener('error', reject);     
      img.addEventListener('load', () => {
        // URL.revokeObjectURL(url);
        let canvas = $e('canvas');
        canvas.width = _(this)._contentWidthDots;
        canvas.height = _(this)._contentHeightDots;
        canvas.getContext('2d', {alpha: false}).drawImage(img, 0, 0);

        // ImageBitmap is more efficient, but unsupported by Edge (at least on Windows 10 1803)
        // or Safari (at least on macOS High Sierra), so we may resolve into a
        // canvas instead.
        // We're cheating here, since the way we consume the resultant object
        // is the same whether it's an ImageBitmap or a canvas. Thanks duck-typing!
        if (window.createImageBitmap) {
          createImageBitmap(canvas, 0, 0, _(this)._contentWidthDots, _(this)._contentHeightDots)
            .then(imgBmp => resolve(imgBmp))
            .catch(e => reject(e));
        } else {
          resolve(canvas);
        }
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


(function(){

// static functions

const SMALL_VIEW_STYLE_PARAMS = Object.freeze({
  pMarginBottom: 0.12,
  fontSize: 0.16,
  lineHeight: 1.4,
});

const REGULAR_VIEW_STYLE_PARAMS = Object.freeze({
  pMarginBottom: 0.14,
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
  constructor(source) {
    _(this)._source = source;
  }

  asRenderedPage(styleSheet, isSmallView, styleParams, abortSignal, fontDataURLs) {
    let source = _(this)._source.replace('/*PAGES-CSS*/', styleSheet);

    Object.assign(
      styleParams,
      isSmallView ? SMALL_VIEW_STYLE_PARAMS : REGULAR_VIEW_STYLE_PARAMS
    );

    Object.entries(styleParams).forEach(([name, value]) => {
      source = source.replace(getCSSPlaceholderRegexp(name), value);
    });

    source = insertFonts(source, fontDataURLs);

    source = wrapSVGSource(source);

    return new Page(source, styleParams.dppx, styleParams.widthDots, abortSignal);
  }
}

_ = window.createInternalFunction(PageSource);
if (window.DEBUG) window.internalFunctions[PageSource] = _;

exports.PageSource = PageSource;

})();

})(window);
