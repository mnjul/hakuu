// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2020 Min-Zhong Lu

'use strict';

(async function (exports) {
  exports.$ = document.querySelector.bind(document);
  exports.$$ = document.querySelectorAll.bind(document);
  exports.$e = document.createElement.bind(document);

  exports.$frame = () =>
    new Promise((resolve) => requestAnimationFrame(resolve));
  exports.$time = (time) => new Promise((resolve) => setTimeout(resolve, time));

  const cachedComputedStyle = new Map();

  exports.$computedStyle = (selector, property, transform) => {
    if (!cachedComputedStyle.has(selector)) {
      cachedComputedStyle.set(selector, new Map());
    }

    const cachedElemComputedStyle = cachedComputedStyle.get(selector);

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

  Element.prototype.$ = Element.prototype.querySelector;
  Element.prototype.$$ = Element.prototype.querySelectorAll;

  Blob.prototype.asDataURL = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), {
        once: true,
      });
      reader.addEventListener('error', () => reject(reader.error), {
        once: true,
      });
      reader.readAsDataURL(this);
    });
  };

  exports.DEBUG = true;

  exports.REM_SCALE = 100;

  let CAN_USE_CREATE_IMAGE_BITMAP = false;

  exports.convertToImageBitmapIfPossible = async (img) => {
    if (CAN_USE_CREATE_IMAGE_BITMAP) {
      return await createImageBitmap(img);
    } else {
      return img;
    }
  };

  CAN_USE_CREATE_IMAGE_BITMAP =
    window.createImageBitmap &&
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

      img.src =
        'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20height%3D%2210%22%20width%3D%2210%22%3E%3CforeignObject%3E%3C%2FforeignObject%3E%3C%2Fsvg%3E';
    }));

  // https://bugs.chromium.org/p/chromium/issues/detail?id=738022
  let CACHED_SVN_FOREIGN_OBJECT_DPPX_FACTOR;
  exports.svgForeignObjectDppxFactor = async () => {
    if (CACHED_SVN_FOREIGN_OBJECT_DPPX_FACTOR !== undefined)
      return CACHED_SVN_FOREIGN_OBJECT_DPPX_FACTOR;

    const TEST_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
  <foreignObject width="100%" height="100%">
  <html id="foreign-object-dppx-factor-computation-root">
    <head><style>.foreign-object-dppx-factor-computation-root, .foreign-object-dppx-factor-computation-root body { margin: 0; padding: 0; width: 10px; } #foreign-object-dppx-factor-computation-target { width: 10px; height: 10px; }</style></head>
    <body><div id="foreign-object-dppx-factor-computation-target"></div></body>
  </html>
  </foreignObject>
  </svg>
  `;

    const container = $e('div');
    container.id = 'foreign-object-dppx-factor-computer';
    container.innerHTML = TEST_SVG;
    $('body').appendChild(container);

    await $time(1);
    await $frame();

    CACHED_SVN_FOREIGN_OBJECT_DPPX_FACTOR =
      container
        .querySelector('#foreign-object-dppx-factor-computation-target')
        .getBoundingClientRect().height / 10;
    container.remove();

    return CACHED_SVN_FOREIGN_OBJECT_DPPX_FACTOR;
  };
})(window);

// Because internal functions conflict with mangling minification (dependent on
// _-prefixed method names for private members) and are for robust development
// purposes only, in production environment we don't use it at all for better
// minification result.
(function (exports) {
  exports.createInternalFunction = () => (_) => _;
})(window);

/*<BUILD_REMOVAL>*/

(function (exports) {
  if (window.DEBUG) {
    exports.internalFunctions = new WeakMap();
  }
})(window);

(function (exports) {
  // classType -> WeakMap (instance -> members)
  const privateMemberMap = new WeakMap();

  function createInternalFunction(classType) {
    const classPrivateMethods = new Map();

    Object.getOwnPropertyNames(classType.prototype)
      .filter(
        (name) =>
          name.startsWith('_') && classType.prototype[name] instanceof Function
      )
      .forEach((name) => {
        classPrivateMethods.set(name, classType.prototype[name]);
        delete classType.prototype[name];
      });

    if (!privateMemberMap.has(classType)) {
      privateMemberMap.set(classType, new WeakMap());
    }

    function generatePrivateMemberObject(instance) {
      return Object.fromEntries(
        Array.from(classPrivateMethods).map(([name, func]) => [
          name,
          func.bind(instance),
        ])
      );
    }

    return function (instance) {
      if (!privateMemberMap.get(classType).has(instance)) {
        privateMemberMap
          .get(classType)
          .set(instance, generatePrivateMemberObject(instance));
      }

      return privateMemberMap.get(classType).get(instance);
    };
  }

  exports.createInternalFunction = createInternalFunction;
})(window);

/*</BUILD_REMOVAL>*/
