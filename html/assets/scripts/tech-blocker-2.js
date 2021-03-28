// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

'use strict';

(async () => {
  if (window.AbortController) {
    const a = { c: '' };
    const { c: b } = a;
    const d = [];
    const e = [...d];
    const f = [e].flatMap(() => e);
    const g = f ?? [];
    let h = undefined;
    h ??= a.c.matchAll(/^$/g);

    const canvas = document.createElement('canvas');
    if (
      ['webgl', 'experimental-webgl'].every((type) => !canvas.getContext(type))
    ) {
      return;
    }

    globalThis.clearTimeout(globalThis.esBlockerTimeout);
    document.querySelectorAll('.tech-blocker').forEach((elem) => {
      elem.dataset.b = b;
      elem.dataset.g = g;
      elem.dataset.h = h;
      elem.remove();
    });
  }
})();
