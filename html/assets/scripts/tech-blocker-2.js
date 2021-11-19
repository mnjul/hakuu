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
    h ??= b.matchAll(/^$/g);
    const i = new (class {
      #i = g;
      #ii() {
        return this.#i;
      }
      ii() {
        return this.#ii();
      }
    })();

    const canvas = document.createElement('canvas');
    if (
      ['webgl', 'experimental-webgl'].every((type) => !canvas.getContext(type))
    ) {
      return;
    }
    if (!canvas.replaceChildren) {
      return;
    }

    globalThis.clearTimeout(globalThis.esBlockerTimeout);
    delete globalThis.esBlockerTimeout;
    document.querySelectorAll('.tech-blocker').forEach((elem) => {
      elem.dataset.h = h;
      elem.dataset.i = i.ii();
      elem.remove();
    });
  }
})();
