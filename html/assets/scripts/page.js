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
    const PAGE_CLASSES_SETTER = new Map([
      [
        'appendix',
        (bodyElem, { width }) => {
          bodyElem.classList.toggle('appendix-narrow', width <= 840);

          return [];
        },
      ],
    ]);

    exports.Page = Page = class {
      #name;
      #doc;
      #isFlatPage;

      #dppx;
      #contentWidthDots;
      #contentHeightDots;

      #onLoadingState;

      #rasterizationDetector;
      #image;
      actualImagesGenerator;
      #xmlSerializer = new XMLSerializer();

      #rasterizationRequests = [];

      #activeFigureIndex;
      #figures;

      #rasterizers;

      constructor(
        name,
        pageSource,
        { dppx, widthDots, heightDots },
        abortSignal,
        onLoadingState
      ) {
        this.#name = name;
        this.#doc = new DOMParser().parseFromString(
          pageSource,
          'image/svg+xml'
        ).documentElement;
        this.#isFlatPage = this.#doc.$('html').dataset.isFlatPage !== 'false';

        this.#dppx = dppx;
        this.#contentWidthDots = widthDots;
        this.#contentHeightDots = this.#isFlatPage ? undefined : heightDots;

        this.#onLoadingState = onLoadingState;

        this.#rasterizationDetector = new PageRasterizationDetector(dppx);

        this.#requestInitialRasterization();
        this.#startRasterizationLoop(abortSignal);

        if (this.#isFlatPage) {
          this.#setContentImagesToInlineBlank(false);
          this.#fetchContentImagesInBackgorund();

          this.#handleImageLoads(abortSignal);
        } else {
          this.#setContentImagesToInlineBlank(true);

          this.#activeFigureIndex = 0;
          this.#figures = Array.from(this.#doc.$$('figure'));
          Array.from(this.#doc.$$('figure')).forEach((elem) => elem.remove());

          this.#fetchAdjacentImagesInBackground(this.#activeFigureIndex);

          this.#switchToFigure(this.#activeFigureIndex);
        }

        const computer = $('#page-holder');
        computer.replaceChildren(document.adoptNode(this.#doc));

        this.#rasterizationDetector.setSecondaryBGColor(
          〆.computedStyle('html', '--empty-image-background')
        );

        this.#doc.style.fontSize = `${this.#dppx * 〆.REM_SCALE}px`;

        $('#page-body').classList.add(this.#name);

        this.#rasterizers = new Map([
          [
            'initial',
            {
              rasterizer: this.#rasterizeOnInitial,
              getRasterizerArgs: () => [],
              detector: this.#rasterizationDetector.detectText,
              getDetectorArgs: () => [],
            },
          ],
          [
            'resize-w',
            {
              rasterizer: this.#rasterizeOnWidthResize,
              getRasterizerArgs: ({ widthDots, dppx }) => [widthDots, dppx],
              detector: this.#rasterizationDetector.detectText,
              getDetectorArgs: () => [],
            },
          ],
          [
            'resize-h',
            {
              rasterizer: this.#rasterizeOnHeightResize,
              getRasterizerArgs: ({ heightDots, dppx }) => [heightDots, dppx],
              detector: this.#rasterizationDetector.detectText,
              getDetectorArgs: () => [],
            },
          ],
          [
            'deactivate-figure',
            {
              rasterizer: this.#rasterizeWhileDeactivatingFigure,
              getRasterizerArgs: () => [],
              detector: this.#rasterizationDetector.detectImageToBeBlank,
              getDetectorArgs: () => [0],
            },
          ],
          [
            'activate-figure',
            {
              rasterizer: this.#rasterizeOnActiveFigure,
              getRasterizerArgs: () => [],
              detector: this.#rasterizationDetector.detectImage,
              getDetectorArgs: () => [0],
            },
          ],
          [
            'image-loaded',
            {
              rasterizer: this.#rasterizeOnImageLoaded,
              getRasterizerArgs: ({ imgIndex, imgURL }) => [imgIndex, imgURL],
              detector: this.#rasterizationDetector.detectImage,
              getDetectorArgs: ({ imgIndex }) => [imgIndex],
            },
          ],
        ]);
      }

      get contentHeightDots() {
        return this.#contentHeightDots;
      }

      addEventListener(...args) {
        this.#doc.addEventListener(...args);
      }

      #fetchContentImagesInBackgorund() {
        const imgElems = this.#doc.$$('img');
        imgElems.forEach((elem) =>
          〆.cachedFetchToDataURL(elem.dataset.originalSrc)
        );
      }

      #setContentImagesToInlineBlank(dimensionless) {
        const imgElems = this.#doc.$$('img');
        imgElems.forEach((elem) => {
          elem.dataset.originalSrc = elem.src;
          elem.src = 〆.generateBlankSVGInDataURI(
            dimensionless ? 1 : elem.dataset.width,
            dimensionless ? 1 : elem.dataset.height
          );
        });
      }

      switchView(direction) {
        if (this.#isFlatPage) return;

        if (direction === 'next') {
          this.#switchToFigure(
            (this.#activeFigureIndex + 1) % this.#figures.length
          );
        } else if (direction === 'prev') {
          this.#switchToFigure(
            (this.#activeFigureIndex - 1 + this.#figures.length) %
              this.#figures.length
          );
        }
      }

      #fetchAdjacentImagesInBackground(index) {
        const fetchIndex = (idx) => {
          const url = this.#figures[idx].$('img').dataset.originalSrc;
          if (url && !url.startsWith('data')) {
            〆.cachedFetchToDataURL(url);
          }
        };

        fetchIndex(index);

        for (
          let i = index - PREFETCH_ADJACENT_OFFSET;
          i <= index + PREFETCH_ADJACENT_OFFSET;
          i++
        ) {
          if (i === index) continue;

          const indexInDOM = (i + this.#figures.length) % this.#figures.length;

          fetchIndex(indexInDOM);
        }
      }

      #switchToFigure(index) {
        const container = this.#doc.$('#page-main-container');
        container.replaceChildren(this.#figures[index]);

        this.#activeFigureIndex = index;

        this.#fetchAdjacentImagesInBackground(index);

        this.#requestSwitchFigureRasterization();
      }

      // Only used for blank inlines for sizing calculation.
      #waitForAllImagesLoaded() {
        return Promise.all(
          Array.from(this.#doc.$$('img')).map(
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

      #setRasterizationParameters() {
        const bodyElem = $('#page-body');

        const smallViewHeaderHeight =
          〆.computedStyle('html', '--small-view-header-height', parseFloat) /
          〆.REM_SCALE;

        const smallPageViewPaddingTop =
          (〆.computedStyle(
            'html',
            '--small-view-top-content-padding',
            parseFloat
          ) +
            〆.computedStyle(
              'html',
              '--small-view-header-height',
              parseFloat
            )) /
          〆.REM_SCALE;

        const smallPageViewPaddingHorizontal =
          〆.computedStyle(
            'html',
            '--small-view-content-horizontal-padding',
            parseFloat
          ) / 〆.REM_SCALE;

        const regularPageViewPaddingTop =
          〆.computedStyle('#sidebar', '--regular-view-top', parseFloat) /
          〆.REM_SCALE;

        const regularPageViewPaddingHorizontal =
          〆.computedStyle('html', '--page-horizontal-padding', parseFloat) /
          〆.REM_SCALE;

        const articleFigcaptionFontSize =
          〆.computedStyle(
            'html',
            '--sidebar-controls-and-article-figcaption-font-size',
            parseFloat
          ) / 〆.REM_SCALE;

        const textColor = 〆.computedStyle('html', '--text-color');
        const secondaryTextColor = 〆.computedStyle(
          'html',
          '--secondary-text-color'
        );

        const dynamicStyleSheet = `
          #page-body.page-small {
            --small-view-header-height: ${smallViewHeaderHeight}rem;
            --padding-top: ${smallPageViewPaddingTop}rem;
            --padding-horizontal: ${smallPageViewPaddingHorizontal}rem;
          }

          #page-body {
            --dppx: ${this.#dppx};
            --width: ${this.#contentWidthDots / 〆.REM_SCALE / this.#dppx}rem;
            --height: ${
              this.#contentHeightDots
                ? `${this.#contentHeightDots / 〆.REM_SCALE / this.#dppx}rem`
                : 'auto'
            };
            --padding-top: ${regularPageViewPaddingTop}rem;
            --padding-horizontal: ${regularPageViewPaddingHorizontal}rem;
            --article-figcaption-font-size: ${articleFigcaptionFontSize}rem;            
            --text-color: ${textColor};
            --secondary-text-color: ${secondaryTextColor};
          }
        `;

        bodyElem.classList.toggle('page-small', 〆.isSmallView());

        this.#doc.$('#dynamic-page-css').firstChild?.remove();
        this.#doc
          .$('#dynamic-page-css')
          .appendChild(
            bodyElem.ownerDocument.createTextNode(dynamicStyleSheet)
          );

        // eslint-disable-next-line no-empty-function
        (PAGE_CLASSES_SETTER.get(this.#name) ?? function () {})(bodyElem, {
          width: this.#contentWidthDots / this.#dppx,
        });
      }

      async #computeSizingForSVGRendering(abortSignal) {
        $('html').style.fontSize = `${this.#dppx * 〆.REM_SCALE}px`;

        try {
          // It appears that for android, one requestAnimationFrame call is not
          // enough, and we need two separate return-to-event-queue constructs.
          await 〆.time(1);

          if (abortSignal.aborted) return;

          await 〆.frame();

          if (abortSignal.aborted) return;

          if (this.#isFlatPage) {
            this.#contentHeightDots = Math.ceil(
              〆.normalizeDOMRect(this.#doc.$('#page-main-container')).height
            );
          }

          this.#rasterizationDetector.setTextTargetPoints(
            this.#getTargetPointsFromSelectors(
              this.#doc,
              this.#isFlatPage
                ? [
                    '.rasterization-detector-target',
                    '.blockquote-detector-target',
                  ]
                : ['p:first-of-type']
            )
          );

          this.#rasterizationDetector.setImageTargetPoints(
            this.#getTargetPointsFromSelectors(this.#doc, ['img'])
          );
        } finally {
          $('html').style.removeProperty('font-size');
        }
      }

      async #handleImageLoads(abortSignal) {
        if (!this.#isFlatPage)
          throw new Error('Non-flat page does not streamed img loading');

        const imgElems = Array.from(this.#doc.$$('img'));

        let fetchPromises = imgElems.map((elem, idx) => [
          idx,
          〆
            .cachedFetchToDataURL(elem.dataset.originalSrc)
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

          this.#requestImageLoadedRasterization(imgElemIdx, dataURL);
        }
      }

      #requestInitialRasterization() {
        this.#rasterizationRequests.push({ type: 'initial' });
      }

      #requestSwitchFigureRasterization() {
        this.#rasterizationRequests = this.#rasterizationRequests.filter(
          ({ type }) => type !== 'activate-figure'
        );
        this.#rasterizationRequests = this.#rasterizationRequests.filter(
          ({ type }) => type !== 'deactivate-figure'
        );
        this.#rasterizationRequests.push({ type: 'deactivate-figure' });
        this.#rasterizationRequests.push({ type: 'activate-figure' });
      }

      requestResizeWRasterization(widthDots, dppx) {
        this.#rasterizationRequests = this.#rasterizationRequests.filter(
          ({ type }) => type !== 'resize-w'
        );
        this.#rasterizationRequests.push({
          type: 'resize-w',
          widthDots,
          dppx,
        });
      }

      requestResizeHRasterization(heightDots, dppx) {
        this.#rasterizationRequests = this.#rasterizationRequests.filter(
          ({ type }) => type !== 'resize-h'
        );
        this.#rasterizationRequests.push({
          type: 'resize-h',
          heightDots,
          dppx,
        });
      }

      #requestImageLoadedRasterization(imgIndex, imgURL) {
        this.#rasterizationRequests.push({
          type: 'image-loaded',
          imgIndex,
          imgURL,
        });
      }

      #startRasterizationLoop(abortSignal) {
        this.actualImagesGenerator = async function* () {
          while (true) {
            if (abortSignal.aborted) return;

            await 〆.frame();

            try {
              if (abortSignal.aborted) return;

              if (this.#rasterizationRequests.length === 0) {
                this.#onLoadingState(false);
                continue;
              } else {
                this.#onLoadingState(true);
              }

              const request = this.#rasterizationRequests.shift();

              const {
                rasterizer,
                getRasterizerArgs,
                detector,
                getDetectorArgs,
              } = this.#rasterizers.get(request.type);
              const detectorArgs = getDetectorArgs(request);

              await rasterizer(abortSignal, ...getRasterizerArgs(request));

              if (abortSignal.aborted) return;
              yield this.#image;
              if (abortSignal.aborted) return;

              if (!(await detector(this.#image, ...detectorArgs))) {
                this.#rasterizationRequests.unshift(request);
              } else {
                if (abortSignal.aborted) return;
                yield this.#image;
              }

              if (abortSignal.aborted) return;
            } catch (e) {
              console.error(e);
              continue;
            }
          }
        }.bind(this);
      }

      #rasterizeOnInitial = async (abortSignal) => {
        this.#setRasterizationParameters();

        if (this.#isFlatPage) {
          await this.#waitForAllImagesLoaded(abortSignal);
          if (abortSignal.aborted) return;
        }

        await this.#computeSizingForSVGRendering(abortSignal);
        if (abortSignal.aborted) return;

        this.#doc.setAttribute('width', this.#contentWidthDots);

        this.#doc.setAttribute('height', this.#contentHeightDots);

        this.#image = await this.#rasterizeDoc();
      };

      #rasterizeOnWidthResize = async (abortSignal, widthDots, dppx) => {
        this.#contentWidthDots = widthDots;
        this.#dppx = dppx;

        this.#setRasterizationParameters();
        await this.#computeSizingForSVGRendering(abortSignal);
        if (abortSignal.aborted) return;

        this.#doc.setAttribute('width', this.#contentWidthDots);

        if (this.#isFlatPage) {
          this.#doc.setAttribute('height', this.#contentHeightDots);
        }

        this.#image = await this.#rasterizeDoc();
      };

      #rasterizeOnHeightResize = async (abortSignal, heightDots, dppx) => {
        if (this.#isFlatPage) return;

        this.#contentHeightDots = heightDots;
        this.#dppx = dppx;

        this.#setRasterizationParameters();
        await this.#computeSizingForSVGRendering(abortSignal);
        if (abortSignal.aborted) return;

        this.#doc.setAttribute('height', this.#contentHeightDots);

        this.#image = await this.#rasterizeDoc();
      };

      #rasterizeWhileDeactivatingFigure = async (abortSignal) => {
        if (this.#isFlatPage)
          throw new Error('Flat page does not have active figure');

        const img = this.#doc.$('img');

        if (!img.dataset.originalSrc) {
          img.dataset.originalSrc = img.src;
          img.src = 〆.generateBlankSVGInDataURI(1, 1);
        }

        await this.#computeSizingForSVGRendering(abortSignal);
        if (abortSignal.aborted) return;

        this.#image = await this.#rasterizeDoc();
      };

      #rasterizeOnActiveFigure = async (abortSignal) => {
        if (this.#isFlatPage)
          throw new Error('Flat page does not have active figure');

        const img = this.#doc.$('img');

        let src = img.src;
        if (img.dataset.originalSrc) {
          src = img.dataset.originalSrc;
          delete img.dataset.originalSrc;
        }

        if (src.startsWith('data:')) {
          img.src = src;
        } else {
          const dataURL = await 〆.cachedFetchToDataURL(src);
          if (abortSignal.aborted) return;
          img.src = dataURL;
        }

        await this.#computeSizingForSVGRendering(abortSignal);
        if (abortSignal.aborted) return;

        this.#image = await this.#rasterizeDoc();
      };

      #rasterizeOnImageLoaded = async (abortSignal, imgIndex, imgURL) => {
        if (!this.#isFlatPage)
          throw new Error('Non-flat page does not streamed img loading');

        const img = this.#doc.$$('img')[imgIndex];
        img.src = imgURL;

        this.#image = await this.#rasterizeDoc();
      };

      #getTargetPointsFromSelectors(doc, selectors) {
        return selectors
          .flatMap((selector) => Array.from(doc.$$(selector)))
          .map((elem) => {
            const rect = 〆.normalizeDOMRect(elem);

            if (elem.dataset.rasterizationDetectorUseFullRect) {
              return {
                x: rect.left,
                y: rect.top,
                w: rect.width - RASTERIZE_DETECT_OFFSET,
                h: rect.height - RASTERIZE_DETECT_OFFSET,
              };
            } else {
              const xRefEdge =
                elem.tagName.toLowerCase() === 'p' &&
                getComputedStyle(elem).textAlign === 'right'
                  ? 'right'
                  : 'left';

              return {
                x:
                  (elem.tagName.toLowerCase() === 'p'
                    ? rect[xRefEdge] +
                      parseFloat(getComputedStyle(elem).textIndent) * this.#dppx
                    : rect[xRefEdge]) +
                  parseFloat(
                    elem.dataset.rasterizationDetectorOffsetX ??
                      (xRefEdge === 'left'
                        ? '0'
                        : (-RASTERIZE_DETECT_SIZE).toString())
                  ) *
                    this.#dppx,
                y:
                  rect.top +
                  parseFloat(elem.dataset.rasterizationDetectorOffsetY ?? '0') *
                    this.#dppx,
              };
            }
          });
      }

      async #rasterizeDoc() {
        this.#doc.style.fontSize = `${this.#dppx * 〆.REM_SCALE}px`;

        const url = 〆.svgXMLToDataURL(
          this.#xmlSerializer.serializeToString(this.#doc)
        );

        return 〆.convertImageURLToImageBitmap(
          url,
          〆.convertSvgImageToImageBitmapIfPossible
        );
      }
    };
  })();

  (function () {
    const RGB_DETECTION_THRESHOLD = 4;

    PageRasterizationDetector = class {
      #textTargetPoints = [];
      #imageTargetPoints = [];
      #dppx;
      #secondaryBgColorRGB = [];

      constructor(dppx) {
        this.#dppx = dppx;
      }

      setTextTargetPoints(points) {
        this.#textTargetPoints = points;
      }

      setImageTargetPoints(points) {
        this.#imageTargetPoints = points;
      }

      setSecondaryBGColor(bgColor) {
        bgColor = bgColor.trim();
        this.#secondaryBgColorRGB = bgColor
          .slice('rgba('.length, bgColor.length - 1)
          .split(',')
          .slice(0, 3)
          .map((val) => val.trim())
          .map((val) => parseInt(val));

        if (
          this.#secondaryBgColorRGB[0] !== this.#secondaryBgColorRGB[1] ||
          this.#secondaryBgColorRGB[0] !== this.#secondaryBgColorRGB[2] ||
          this.#secondaryBgColorRGB[1] !== this.#secondaryBgColorRGB[2]
        ) {
          throw new Error(
            'expecting secondary bg color to be grayscale, but got',
            this.#secondaryBgColorRGB
          );
        }
      }

      detectText = async (rasterization) => {
        const promises = this.#textTargetPoints.map((point) =>
          this.#detectPoint(rasterization, point)
        );
        return (await Promise.all(promises)).every((detected) => detected);
      };

      detectImage = async (rasterization, index) =>
        this.#detectPoint(rasterization, this.#imageTargetPoints[index]);

      detectImageToBeBlank = async (rasterization, index) =>
        this.#detectPoint(
          rasterization,
          this.#imageTargetPoints[index],
          this.#secondaryBgColorRGB
        );

      async #detectPoint(rasterization, point, invertedDetectionBGColor) {
        const detectWidth = point.w ?? RASTERIZE_DETECT_SIZE * this.#dppx;
        const detectHeight = point.h ?? RASTERIZE_DETECT_SIZE * this.#dppx;
        const detectOffset = RASTERIZE_DETECT_OFFSET * this.#dppx;

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
          const [bg2R, bg2G, bg2B] = this.#secondaryBgColorRGB;
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

    if (window.DEBUG) {
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

    exports.PageSource = class PageSource {
      #source;
      #name;

      constructor(source, name) {
        // firefox issue (in document DOM, cjk + newline + space + cjk is treated as
        // cjkfull + cjkfull, but not in SVG foreignObject; this has issues with
        // parenthsis/quotation marks+space and resulting in sizing computation issuess)
        this.#source = source.replace(/\n\s+/g, ' ');
        this.#name = name;
      }

      get source() {
        return this.#source;
      }

      deserialize(styleSheet, fontDataURLs, ...args) {
        let source = this.#source.replace('/*PAGES-CSS*/', styleSheet);

        source = insertFonts(source, fontDataURLs);

        source = wrapSVGSource(source);

        return new Page(this.#name, source, ...args);
      }
    };
  })();
})(window);
