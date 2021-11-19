// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

'use strict';

(async function (exports) {
  exports.$ = document.querySelector.bind(document);
  exports.$$ = document.querySelectorAll.bind(document);
  exports.$e = document.createElement.bind(document);

  exports.〆.frame = () =>
    new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
  exports.〆.time = (time) =>
    new Promise((resolve) => {
      setTimeout(resolve, time);
    });

  const _cachedComputedStyle = new Map();

  exports.〆.computedStyle = (selector, property, transform) => {
    if (!_cachedComputedStyle.has(selector)) {
      _cachedComputedStyle.set(selector, new Map());
    }

    const cachedElemComputedStyle = _cachedComputedStyle.get(selector);

    if (!cachedElemComputedStyle.has(property)) {
      cachedElemComputedStyle.set(
        property,
        (
          transform ??
          function (val) {
            return val;
          }
        )(getComputedStyle($(selector)).getPropertyValue(property))
      );
    }

    return cachedElemComputedStyle.get(property);
  };

  const _fetchCache = new Map();
  exports.〆.cachedFetchToDataURL = (src) => {
    if (!src.match(/^https?:\/\//)) {
      src = new URL(src, document.baseURI).href;
    }

    if (!_fetchCache.has(src)) {
      const promise = fetch(new Request(src))
        .then((resp) => resp.blob())
        .then((blog) => blog.asDataURL());
      _fetchCache.set(src, promise);
    }

    return _fetchCache.get(src);
  };

  const _isWebPSupported = new Promise((resolve) => {
    const img = new Image();
    img.addEventListener(
      'load',
      () => {
        resolve(img.width > 0 && img.height > 0);
      },
      { once: true }
    );
    img.addEventListener(
      'error',
      () => {
        resolve(false);
      },
      { once: true }
    );
    img.src =
      'data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==';
  });

  exports.〆.cachedFetchImageToDataURL = async (src) => {
    if (await _isWebPSupported) {
      src = src.replace(/\.(jpg|png)$/, '.webp');
    }
    return 〆.cachedFetchToDataURL(src);
  };

  exports.〆.generateBlankSVGInDataURI = (width, height) =>
    〆.svgXMLToDataURL(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
        <rect width="${width}" height="${height}" fill="${〆.computedStyle(
      'html',
      '--empty-image-background'
    )}" />
      </svg>
  `);

  exports.〆.normalizeDOMRect = (elem) => {
    const rect = elem.getBoundingClientRect();
    const rootRect = $('#page-root').getBoundingClientRect();

    return {
      x: rect.x - rootRect.x,
      y: rect.y - rootRect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top - rootRect.top,
      right: rect.right - rootRect.left,
      bottom: rect.bottom - rootRect.top,
      left: rect.left - rootRect.left,
    };
  };

  exports.〆.indexStyleSheet = (async () => {
    let sheet;

    do {
      await 〆.frame();
      sheet = Array.from(document.styleSheets).find(({ href }) =>
        href?.includes('index')
      );
    } while (!sheet);

    return sheet;
  })();

  let SMALL_VIEW_WIDTH_CUTOFF;

  〆.indexStyleSheet
    .then((sheet) => {
      const mediaText = Array.from(sheet.rules).find(({ media }) => !!media)
        .media.mediaText;

      SMALL_VIEW_WIDTH_CUTOFF = parseInt(mediaText.match(/(\d+)px/)[1]);
    })
    .catch((e) => {
      throw e;
    });

  exports.〆.isSmallView = () => window.innerWidth <= SMALL_VIEW_WIDTH_CUTOFF;

  const SVG_ESCAPE_CHARS = new Map([
    ['%20', ' '],
    ['%2F', '/'],
    ['%3A', ':'],
    ['%3D', '='],
  ]);

  // inspired by https://codepen.io/tigt/post/optimizing-svgs-in-data-uris
  exports.〆.svgXMLToDataURL = (xmlString) => {
    xmlString = xmlString.trim().replace(/\s+/g, ' ');
    xmlString = encodeURIComponent(xmlString);
    xmlString = xmlString.replace(/%(?:20|2F|3A|3D)/g, (match) =>
      SVG_ESCAPE_CHARS.get(match)
    );

    return `data:image/svg+xml,${xmlString}`;
  };

  exports.〆.convertImageURLToImageBitmap = (url, converter) =>
    new Promise((resolve, reject) => {
      let img = new Image();
      img.src = url;

      // being pedantic -- the img/url string can be huge so better not leak
      const errorHandler = (e) => {
        // eslint-disable-next-line no-use-before-define
        img.removeEventListener('load', loadHandler);
        reject(e);
        img = url = null;
      };

      const loadHandler = () => {
        img.removeEventListener('error', errorHandler);
        resolve(converter(img));
        img = url = null;
      };

      img.addEventListener('error', errorHandler, { once: true });
      img.addEventListener('load', loadHandler, { once: true });
    });

  exports.〆.convertToImageBitmapIfPossible = (img) => {
    if (window.createImageBitmap) return createImageBitmap(img);
    else return img;
  };

  let CAN_USE_CREATE_IMAGE_BITMAP_WITH_SVG_FOREIGN_OBJECT = false;

  exports.〆.convertSvgImageToImageBitmapIfPossible = (img) => {
    if (CAN_USE_CREATE_IMAGE_BITMAP_WITH_SVG_FOREIGN_OBJECT) {
      // if createImageBitmap fails, return the img (firefox fails if the svg is too large)
      return createImageBitmap(img).catch(() => img);
    }
    return img;
  };

  CAN_USE_CREATE_IMAGE_BITMAP_WITH_SVG_FOREIGN_OBJECT =
    window.createImageBitmap &&
    !〆.isSafari15 && // Safari 15 actually can't canvas-render the image if it's too large, not sure why
    (await new Promise((resolve, reject) => {
      const img = new Image();

      img.addEventListener('load', async () => {
        const bitmap = await createImageBitmap(img);
        const canvas = $e('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d', { alpha: false });

        ctx.drawImage(bitmap, 0, 0, 10, 10);
        try {
          ctx.getImageData(0, 0, 10, 10);
          resolve(true);
        } catch (e) {
          resolve(false);
        }
      });

      img.addEventListener('error', reject);

      img.src = 〆.svgXMLToDataURL(`
        <svg xmlns="http://www.w3.org/2000/svg" height="10" width="10">
          <foreignObject></foreignObject>
        </svg>
      `);
    }));
})(window);
