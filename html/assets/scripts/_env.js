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
  exports.〆.isSafari15Plus = (() => {
    const match = navigator.userAgent.match(/Version\/(\d+)\.\S+ Safari\//);
    if (!match) return false;
    if (parseInt(match[1]) >= 15) return true;
    return false;
  })();
})(window);
