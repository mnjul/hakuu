// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

'use strict';

(async function (exports) {
  exports.DEBUG = true;

  exports.〆 = {};

  Object.defineProperty(exports.〆, 'REM_SCALE', {
    get() {
      return 〆.computedStyle('html', 'font-size', parseFloat);
    },
  });

  // :(. See individual usages.
  exports.〆.isFirefox = navigator.userAgent.includes('Firefox');
  exports.〆.isSafari15 = !!navigator.userAgent.match(
    /Version\/15\.\S+ Safari\//
  );
})(window);
