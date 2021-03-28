// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

'use strict';

(function (exports) {
  let Page;
  let PageRasterizationDetector;

  const PREFETCH_ADJACENT_OFFSET = 2;

  // this should ideally be one em calculated when computing sizing
  // this has to be large enough to account for safari's random vertical offsetting
  // but small enough to not reach beyond what we should check
  const RASTERIZE_DETECT_SIZE = 20;
  const RASTERIZE_DETECT_OFFSET = RASTERIZE_DETECT_SIZE / 2;

  (function () {
    let _;

    const PAGE_CLASSES_SETTER = new Map([
      [
        'appendix',
        (bodyElem, { width }) => {
          bodyElem.classList.toggle('appendix-narrow', width <= 840);

          return [];
        },
      ],
    ]);

    Page = class {
      constructor(
        name,
        pageSource,
        { dppx, widthDots, heightDots },
        abortSignal,
        onLoadingState
      ) {
        _(this)._name = name;
        _(this)._doc = new DOMParser().parseFromString(
          pageSource,
          'image/svg+xml'
        ).documentElement;
        _(this)._isFlatPage =
          _(this)._doc.$('html').dataset.isFlatPage !== 'false';

        _(this)._dppx = dppx;
        _(this)._contentWidthDots = widthDots;
        _(this)._contentHeightDots = _(this)._isFlatPage
          ? undefined
          : heightDots;

        _(this)._onLoadingState = onLoadingState;

        _(this)._rasterizationDetector = new PageRasterizationDetector(dppx);
        _(this)._image = undefined;
        this.actualImagesGenerator = undefined;
        _(this)._xmlSerializer = new XMLSerializer();

        _(this)._rasterizationRequests = [];

        _(this)._requestInitialRasterization();
        _(this)._startRasterizationLoop(abortSignal);

        if (_(this)._isFlatPage) {
          _(this)._setContentImagesToInlineBlank(false);
          _(this)._fetchContentImagesInBackgorund();

          _(this)._handleImageLoads(abortSignal);
        } else {
          _(this)._setContentImagesToInlineBlank(true);

          _(this)._activeFigureIndex = 0;
          _(this)._figures = Array.from(_(this)._doc.$$('figure'));
          Array.from(_(this)._doc.$$('figure')).forEach((elem) =>
            elem.remove()
          );

          _(this)._fetchAdjacentImagesInBackground(_(this)._activeFigureIndex);

          _(this)._switchToFigure(_(this)._activeFigureIndex);
        }

        const computer = $('#page-holder');
        computer.empty();
        computer.appendChild(document.adoptNode(_(this)._doc));

        _(this)._rasterizationDetector.setSecondaryBGColor(
          〆.$computedStyle('html', '--empty-image-background')
        );

        _(this)._doc.style.fontSize = `${_(this)._dppx * 〆.$REM_SCALE}px`;

        $('#page-body').classList.add(_(this)._name);

        _(this)._rasterizers = new Map([
          [
            'initial',
            {
              rasterizer: _(this)._rasterizeOnInitial.bind(_(this)),
              getRasterizerArgs: () => [],
              detector: _(this)._rasterizationDetector.detectText,
              getDetectorArgs: () => [],
            },
          ],
          [
            'resize-w',
            {
              rasterizer: _(this)._rasterizeOnWidthResize.bind(_(this)),
              getRasterizerArgs: ({ widthDots, dppx }) => [widthDots, dppx],
              detector: _(this)._rasterizationDetector.detectText,
              getDetectorArgs: () => [],
            },
          ],
          [
            'resize-h',
            {
              rasterizer: _(this)._rasterizeOnHeightResize.bind(_(this)),
              getRasterizerArgs: ({ heightDots, dppx }) => [heightDots, dppx],
              detector: _(this)._rasterizationDetector.detectText,
              getDetectorArgs: () => [],
            },
          ],
          [
            'deactivate-figure',
            {
              rasterizer: _(this)._rasterizeWhileDeactivatingFigure.bind(
                _(this)
              ),
              getRasterizerArgs: () => [],
              detector: _(this)._rasterizationDetector.detectImageToBeBlank,
              getDetectorArgs: () => [0],
            },
          ],
          [
            'activate-figure',
            {
              rasterizer: _(this)._rasterizeOnActiveFigure.bind(_(this)),
              getRasterizerArgs: () => [],
              detector: _(this)._rasterizationDetector.detectImage,
              getDetectorArgs: () => [0],
            },
          ],
          [
            'image-loaded',
            {
              rasterizer: _(this)._rasterizeOnImageLoaded.bind(_(this)),
              getRasterizerArgs: ({ imgIndex, imgURL }) => [imgIndex, imgURL],
              detector: _(this)._rasterizationDetector.detectImage,
              getDetectorArgs: ({ imgIndex }) => [imgIndex],
            },
          ],
        ]);
      }

      get contentHeightDots() {
        return _(this)._contentHeightDots;
      }

      addEventListener(...args) {
        _(this)._doc.addEventListener(...args);
      }

      _fetchContentImagesInBackgorund() {
        const imgElems = _(this)._doc.$$('img');
        imgElems.forEach((elem) =>
          〆.$cachedFetchImageToDataURL(elem.dataset.originalSrc)
        );
      }

      _setContentImagesToInlineBlank(dimensionless) {
        const imgElems = _(this)._doc.$$('img');
        imgElems.forEach((elem) => {
          elem.dataset.originalSrc = elem.src;
          elem.src = 〆.$generateBlankSVGInDataURI(
            dimensionless ? 1 : elem.dataset.width,
            dimensionless ? 1 : elem.dataset.height
          );
        });
      }

      switchView(direction) {
        if (_(this)._isFlatPage) return;

        if (direction === 'next') {
          _(this)._switchToFigure(
            (_(this)._activeIndex + 1) % _(this)._figures.length
          );
        } else if (direction === 'prev') {
          _(this)._switchToFigure(
            (_(this)._activeIndex - 1 + _(this)._figures.length) %
              _(this)._figures.length
          );
        }
      }

      _fetchAdjacentImagesInBackground(index) {
        const fetchIndex = (idx) => {
          const url = _(this)._figures[idx].$('img').dataset.originalSrc;
          if (url && !url.startsWith('data')) {
            〆.$cachedFetchImageToDataURL(url);
          }
        };

        fetchIndex(index);

        for (
          let i = index - PREFETCH_ADJACENT_OFFSET;
          i <= index + PREFETCH_ADJACENT_OFFSET;
          i++
        ) {
          if (i === index) continue;

          const indexInDOM =
            (i + _(this)._figures.length) % _(this)._figures.length;

          fetchIndex(indexInDOM);
        }
      }

      _switchToFigure(index) {
        const container = _(this)._doc.$('#page-main-container');
        container.empty();
        container.appendChild(_(this)._figures[index]);
        _(this)._activeIndex = index;

        _(this)._fetchAdjacentImagesInBackground(index);

        _(this)._requestSwitchFigureRasterization();
      }

      // Only used for blank inlines for sizing calculation.
      _waitForAllImagesLoaded() {
        return Promise.all(
          Array.from(_(this)._doc.$$('img')).map(
            (elem) =>
              new Promise((resolve, reject) => {
                if (elem.complete) resolve();
                elem.addEventListener('load', resolve, { once: true });
                elem.addEventListener(
                  'error',
                  reject.bind(null, `Image ${elem.src} fails to load`),
                  { once: true }
                );
              })
          )
        );
      }

      _setRasterizationParameters() {
        const bodyElem = $('#page-body');

        const smallPageViewPaddingTop =
          (〆.$computedStyle(
            'html',
            '--small-view-top-content-padding',
            parseFloat
          ) +
            〆.$computedStyle(
              'html',
              '--small-view-header-height',
              parseFloat
            )) /
          〆.$REM_SCALE;

        const smallPageViewPaddingHorizontal =
          〆.$computedStyle(
            'html',
            '--small-view-content-horizontal-padding',
            parseFloat
          ) / 〆.$REM_SCALE;

        const regularPageViewPaddingTop =
          〆.$computedStyle('#sidebar', '--regular-view-top', parseFloat) /
          〆.$REM_SCALE;

        const regularPageViewPaddingHorizontal =
          〆.$computedStyle('html', '--page-horizontal-padding', parseFloat) /
          〆.$REM_SCALE;

        const articleFigcaptionFontSize =
          〆.$computedStyle(
            'html',
            '--sidebar-controls-and-artical-figcaption-font-size',
            parseFloat
          ) / 〆.$REM_SCALE;

        const textColor = 〆.$computedStyle('html', '--text-color');
        const secondaryTextColor = 〆.$computedStyle(
          'html',
          '--secondary-text-color'
        );

        const dynamicStyleSheet = `
          #page-body.page-small {
            --padding-top: ${smallPageViewPaddingTop}rem;
            --padding-horizontal: ${smallPageViewPaddingHorizontal}rem;
          }

          #page-body {
            --dppx: ${_(this)._dppx};
            --width: ${
              _(this)._contentWidthDots / 〆.$REM_SCALE / _(this)._dppx
            }rem;
            --height: ${
              _(this)._contentHeightDots
                ? `${
                    _(this)._contentHeightDots / 〆.$REM_SCALE / _(this)._dppx
                  }rem`
                : 'auto'
            };
            --padding-top: ${regularPageViewPaddingTop}rem;
            --padding-horizontal: ${regularPageViewPaddingHorizontal}rem;
            --article-figcaption-font-size: ${articleFigcaptionFontSize}rem;            
            --text-color: ${textColor};
            --secondary-text-color: ${secondaryTextColor};
          }
        `;

        bodyElem.classList.toggle('page-small', 〆.$isSmallView());

        _(this)._doc.$('#dynamic-page-css').firstChild?.remove();
        _(this)
          ._doc.$('#dynamic-page-css')
          .appendChild(
            bodyElem.ownerDocument.createTextNode(dynamicStyleSheet)
          );

        // eslint-disable-next-line no-empty-function
        (PAGE_CLASSES_SETTER.get(_(this)._name) ?? function () {})(bodyElem, {
          width: _(this)._contentWidthDots / _(this)._dppx,
        });
      }

      async _computeSizingForSVGRendering(abortSignal) {
        $('html').style.fontSize = `${_(this)._dppx * 〆.$REM_SCALE}px`;

        try {
          // It appears that for android, one requestAnimationFrame call is not
          // enough, and we need two separate return-to-event-queue constructs.
          await 〆.$time(1);

          if (abortSignal.aborted) return;

          await 〆.$frame();

          if (abortSignal.aborted) return;

          if (_(this)._isFlatPage) {
            _(this)._contentHeightDots = Math.ceil(
              〆.$normalizeDOMRect(_(this)._doc.$('#page-main-container'))
                .height
            );
          }

          _(this)._rasterizationDetector.setTextTargetPoints(
            _(this)._getTargetPointsFromSelectors(
              _(this)._doc,
              _(this)._isFlatPage
                ? [
                    '.rasterization-detector-target',
                    '.blockquote-detector-target',
                  ]
                : ['p:first-of-type'],
              _(this)._isFlatPage
                ? 'left'
                : 〆.$isSmallView()
                ? 'left'
                : 'right'
            )
          );

          _(this)._rasterizationDetector.setImageTargetPoints(
            _(this)._getTargetPointsFromSelectors(_(this)._doc, ['img'])
          );
        } finally {
          $('html').style.removeProperty('font-size');
        }
      }

      async _handleImageLoads(abortSignal) {
        if (!_(this)._isFlatPage)
          throw new Error('Non-flat page does not streamed img loading');

        const imgElems = Array.from(_(this)._doc.$$('img'));

        let fetchPromises = imgElems.map((elem, idx) => [
          idx,
          〆
            .$cachedFetchImageToDataURL(elem.dataset.originalSrc)
            .then((dataURL) => [idx, dataURL]),
        ]);

        while (fetchPromises.length > 0) {
          const [imgElemIdx, dataURL] = await Promise.race(
            fetchPromises.map(([, promise]) => promise)
          );
          if (abortSignal.aborted) return;

          fetchPromises = fetchPromises.filter(
            ([idxInDoc]) => idxInDoc !== imgElemIdx
          );

          _(this)._requestImageLoadedRasterization(imgElemIdx, dataURL);
        }
      }

      _requestInitialRasterization() {
        _(this)._rasterizationRequests.push({ type: 'initial' });
      }

      _requestSwitchFigureRasterization() {
        _(this)._rasterizationRequests = _(this)._rasterizationRequests.filter(
          ({ type }) => type !== 'activate-figure'
        );
        _(this)._rasterizationRequests = _(this)._rasterizationRequests.filter(
          ({ type }) => type !== 'deactivate-figure'
        );
        _(this)._rasterizationRequests.push({ type: 'deactivate-figure' });
        _(this)._rasterizationRequests.push({ type: 'activate-figure' });
      }

      requestResizeWRasterization(widthDots, dppx) {
        _(this)._rasterizationRequests = _(this)._rasterizationRequests.filter(
          ({ type }) => type !== 'resize-w'
        );
        _(this)._rasterizationRequests.push({
          type: 'resize-w',
          widthDots,
          dppx,
        });
      }

      requestResizeHRasterization(heightDots, dppx) {
        _(this)._rasterizationRequests = _(this)._rasterizationRequests.filter(
          ({ type }) => type !== 'resize-h'
        );
        _(this)._rasterizationRequests.push({
          type: 'resize-h',
          heightDots,
          dppx,
        });
      }

      _requestImageLoadedRasterization(imgIndex, imgURL) {
        _(this)._rasterizationRequests.push({
          type: 'image-loaded',
          imgIndex,
          imgURL,
        });
      }

      _startRasterizationLoop(abortSignal) {
        this.actualImagesGenerator = async function* () {
          while (true) {
            if (abortSignal.aborted) return;

            await 〆.$frame();

            try {
              if (abortSignal.aborted) return;

              if (_(this)._rasterizationRequests.length === 0) {
                _(this)._onLoadingState(false);
                continue;
              } else {
                _(this)._onLoadingState(true);
              }

              const request = _(this)._rasterizationRequests.shift();

              const {
                rasterizer,
                getRasterizerArgs,
                detector,
                getDetectorArgs,
              } = _(this)._rasterizers.get(request.type);
              const detectorArgs = getDetectorArgs(request);

              await rasterizer(abortSignal, ...getRasterizerArgs(request));

              if (abortSignal.aborted) return;
              yield _(this)._image;
              if (abortSignal.aborted) return;

              if (!(await detector(_(this)._image, ...detectorArgs))) {
                _(this)._rasterizationRequests.unshift(request);
              } else {
                if (abortSignal.aborted) return;
                yield _(this)._image;
              }

              if (abortSignal.aborted) return;
            } catch (e) {
              console.error(e);
              continue;
            }
          }
        }.bind(this);
      }

      async _rasterizeOnInitial(abortSignal) {
        _(this)._setRasterizationParameters();

        if (_(this)._isFlatPage) {
          await _(this)._waitForAllImagesLoaded(abortSignal);
          if (abortSignal.aborted) return;
        }

        await _(this)._computeSizingForSVGRendering(abortSignal);
        if (abortSignal.aborted) return;

        _(this)._doc.setAttribute('width', _(this)._contentWidthDots);

        _(this)._doc.setAttribute('height', _(this)._contentHeightDots);

        _(this)._image = await _(this)._rasterizeDoc();
      }

      async _rasterizeOnWidthResize(abortSignal, widthDots, dppx) {
        _(this)._contentWidthDots = widthDots;
        _(this)._dppx = dppx;

        _(this)._setRasterizationParameters();
        await _(this)._computeSizingForSVGRendering(abortSignal);
        if (abortSignal.aborted) return;

        _(this)._doc.setAttribute('width', _(this)._contentWidthDots);

        if (_(this)._isFlatPage) {
          _(this)._doc.setAttribute('height', _(this)._contentHeightDots);
        }

        _(this)._image = await _(this)._rasterizeDoc();
      }

      async _rasterizeOnHeightResize(abortSignal, heightDots, dppx) {
        if (_(this)._isFlatPage) return;

        _(this)._contentHeightDots = heightDots;
        _(this)._dppx = dppx;

        _(this)._setRasterizationParameters();
        await _(this)._computeSizingForSVGRendering(abortSignal);
        if (abortSignal.aborted) return;

        _(this)._doc.setAttribute('height', _(this)._contentHeightDots);

        _(this)._image = await _(this)._rasterizeDoc();
      }

      async _rasterizeWhileDeactivatingFigure(abortSignal) {
        if (_(this)._isFlatPage)
          throw new Error('Flat page does not have active figure');

        const img = _(this)._doc.$('img');

        if (!img.dataset.originalSrc) {
          img.dataset.originalSrc = img.src;
          img.src = 〆.$generateBlankSVGInDataURI(1, 1);
        }

        _(this)._image = await _(this)._rasterizeDoc();
      }

      async _rasterizeOnActiveFigure(abortSignal) {
        if (_(this)._isFlatPage)
          throw new Error('Flat page does not have active figure');

        const img = _(this)._doc.$('img');

        let src = img.src;
        if (img.dataset.originalSrc) {
          src = img.dataset.originalSrc;
          delete img.dataset.originalSrc;
        }

        if (src.startsWith('data:')) {
          img.src = src;
        } else {
          const dataURL = await 〆.$cachedFetchImageToDataURL(src);
          if (abortSignal.aborted) return;
          img.src = dataURL;
        }

        _(this)._image = await _(this)._rasterizeDoc();
      }

      async _rasterizeOnImageLoaded(abortSignal, imgIndex, imgURL) {
        if (!_(this)._isFlatPage)
          throw new Error('Non-flat page does not streamed img loading');

        const img = _(this)._doc.$$('img')[imgIndex];
        img.src = imgURL;

        _(this)._image = await _(this)._rasterizeDoc();
      }

      _getTargetPointsFromSelectors(doc, selectors, xRefEdge) {
        return selectors
          .flatMap((selector) => Array.from(doc.$$(selector)))
          .map((elem) => {
            const rect = 〆.$normalizeDOMRect(elem);

            if (elem.dataset.rasterizationDetectorUseFullRect) {
              return {
                x: rect.left,
                y: rect.top,
                w: rect.width - RASTERIZE_DETECT_OFFSET,
                h: rect.height - RASTERIZE_DETECT_OFFSET,
              };
            } else {
              xRefEdge ??= 'left';

              return {
                x:
                  (elem.tagName.toLowerCase() === 'p'
                    ? rect[xRefEdge] +
                      parseFloat(getComputedStyle(elem).textIndent) *
                        _(this)._dppx
                    : rect[xRefEdge]) +
                  parseFloat(
                    elem.dataset.rasterizationDetectorOffsetX ??
                      (xRefEdge === 'left'
                        ? '0'
                        : (-RASTERIZE_DETECT_SIZE).toString())
                  ) *
                    _(this)._dppx,
                y:
                  rect.top +
                  parseFloat(elem.dataset.rasterizationDetectorOffsetY ?? '0') *
                    _(this)._dppx,
              };
            }
          });
      }

      async _rasterizeDoc() {
        _(this)._doc.style.fontSize = `${_(this)._dppx * 〆.$REM_SCALE}px`;

        const url = 〆.$svgXMLToDataURL(
          _(this)._xmlSerializer.serializeToString(_(this)._doc)
        );

        return 〆.$convertImageURLToImageBitmap(
          url,
          〆.$convertSvgImageToImageBitmapIfPossible
        );
      }
    };

    _ = window.createInternalFunction(Page);
    if (window.DEBUG) {
      window.internalFunctions[Page] = _;
      exports.Page = Page;
    }
  })();

  (function () {
    let _;

    const RGB_DETECTION_THRESHOLD = 4;

    PageRasterizationDetector = class {
      constructor(dppx) {
        _(this)._textTargetPoints = [];
        _(this)._imageTargetPoints = [];
        _(this)._dppx = dppx;
        _(this)._secondaryBgColorRGB = [];
      }

      setTextTargetPoints(points) {
        _(this)._textTargetPoints = points;
      }

      setImageTargetPoints(points) {
        _(this)._imageTargetPoints = points;
      }

      setSecondaryBGColor(bgColor) {
        bgColor = bgColor.trim();
        _(this)._secondaryBgColorRGB = bgColor
          .slice('rgba('.length, bgColor.length - 1)
          .split(',')
          .slice(0, 3)
          .map((val) => val.trim())
          .map((val) => parseInt(val));

        if (
          _(this)._secondaryBgColorRGB[0] !== _(this)._secondaryBgColorRGB[1] ||
          _(this)._secondaryBgColorRGB[0] !== _(this)._secondaryBgColorRGB[2] ||
          _(this)._secondaryBgColorRGB[1] !== _(this)._secondaryBgColorRGB[2]
        ) {
          throw new Error(
            'expecting secondary bg color to be grayscale, but got',
            _(this)._secondaryBgColorRGB
          );
        }
      }

      detectText = async (rasterization) => {
        const promises = _(this)._textTargetPoints.map((point) =>
          _(this)._detectPoint(rasterization, point)
        );
        return (await Promise.all(promises)).every((detected) => detected);
      };

      detectImage = async (rasterization, index) =>
        _(this)._detectPoint(rasterization, _(this)._imageTargetPoints[index]);

      detectImageToBeBlank = async (rasterization, index) =>
        _(this)._detectPoint(
          rasterization,
          _(this)._imageTargetPoints[index],
          _(this)._secondaryBgColorRGB
        );

      async _detectPoint(rasterization, point, invertedDetectionBGColor) {
        const detectWidth = point.w ?? RASTERIZE_DETECT_SIZE * _(this)._dppx;
        const detectHeight = point.h ?? RASTERIZE_DETECT_SIZE * _(this)._dppx;
        const detectOffset = RASTERIZE_DETECT_OFFSET * _(this)._dppx;

        const canvas = $e('canvas');
        canvas.width = detectWidth;
        canvas.height = detectHeight;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
          rasterization,
          point.x + detectOffset,
          point.y + detectOffset,
          detectWidth,
          detectHeight,
          0,
          0,
          detectWidth,
          detectHeight
        );

        const { data: sample } = ctx.getImageData(
          0,
          0,
          detectWidth,
          detectHeight
        );

        const sampleRGBs = [];
        for (let i = 0; i < sample.length; i += 4) {
          sampleRGBs.push([
            sample[i],
            sample[i + 1],
            sample[i + 2],
            sample[i + 3],
          ]);
        }

        let detectedRasterization;
        if (invertedDetectionBGColor) {
          const [bgR, bgG, bgB] = invertedDetectionBGColor;
          detectedRasterization = sampleRGBs.every(
            ([sampleR, sampleG, sampleB]) =>
              Math.abs(sampleR - bgR) <= RGB_DETECTION_THRESHOLD &&
              Math.abs(sampleG - bgG) <= RGB_DETECTION_THRESHOLD &&
              Math.abs(sampleB - bgB) <= RGB_DETECTION_THRESHOLD &&
              sampleR === sampleG &&
              sampleR === sampleB
          );
        } else {
          const [bg2R, bg2G, bg2B] = _(this)._secondaryBgColorRGB;
          detectedRasterization = sampleRGBs.some(
            ([sampleR, sampleG, sampleB, sampleA]) =>
              sampleA !== 0 && // regular bg
              (Math.abs(sampleR - bg2R) > RGB_DETECTION_THRESHOLD ||
                Math.abs(sampleG - bg2G) > RGB_DETECTION_THRESHOLD ||
                Math.abs(sampleB - bg2B) > RGB_DETECTION_THRESHOLD)
          );
        }

        if (detectedRasterization) {
          console.log('Rasterization detected');
        } else {
          console.log('Failed to detect rasterization');
        }

        return detectedRasterization;
      }
    };

    _ = window.createInternalFunction(PageRasterizationDetector);
    if (window.DEBUG) {
      window.internalFunctions[PageRasterizationDetector] = _;
      exports.PageRasterizationDetector = PageRasterizationDetector;
    }
  })();

  (function () {
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
      return new RegExp(`/\\*!%${tag}%\\*/\\s*0`, 'i');
    }

    function insertFonts(source, fontDataURLs) {
      fontDataURLs.forEach((dataURL, fontName) => {
        source = source.replace(
          getCSSPlaceholderRegexp(`${fontName}FONT`),
          dataURL
        );
      });

      return source;
    }

    let _;

    class PageSource {
      constructor(source, name) {
        // firefox issue (in document DOM, cjk + newline + space + cjk is treated as
        // cjkfull + cjkfull, but not in SVG foreignObject; this has issues with
        // parenthsis/quotation marks+space and resulting in sizing computation issuess)
        _(this)._source = source.replace(/\n\s+/g, ' ');
        _(this)._name = name;
      }

      get source() {
        return _(this)._source;
      }

      deserialize(styleSheet, fontDataURLs, ...args) {
        let source = _(this)._source.replace('/*PAGES-CSS*/', styleSheet);

        source = insertFonts(source, fontDataURLs);

        source = wrapSVGSource(source);

        return new Page(_(this)._name, source, ...args);
      }
    }

    _ = window.createInternalFunction(PageSource);
    if (window.DEBUG) window.internalFunctions[PageSource] = _;

    exports.PageSource = PageSource;
  })();
})(window);
