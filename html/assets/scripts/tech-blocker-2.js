// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2020 Min-Zhong Lu

'use strict';

(async () => {
  if (window.AbortController) {
    const a = { c: '' };
    const { c: b } = a;
    const d = [];
    const e = [...d];
    const f = [e].flat();
    const g = f ?? [];

    const canvas = document.createElement('canvas');
    if (
      ['webgl', 'experimental-webgl'].every((type) => !canvas.getContext(type))
    ) {
      return;
    }

    clearTimeout(window.esBlockerTimeout);
    Array.from(document.querySelectorAll('.tech-blocker')).forEach((elem) => {
      elem.dataset.b = b;
      elem.dataset.g = g;
      elem.remove();
    });
  }
})();
