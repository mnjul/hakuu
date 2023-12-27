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

    if (!window.createImageBitmap) return;

    if (!window.Worker) return;

    if (!new OffscreenCanvas(1, 1).getContext('webgl')) return;

    const canvas = document.createElement('canvas');
    if (!canvas.replaceChildren) {
      return;
    }

    const j = await new Promise((resolve, reject) => {
      const jj = new Image();
      jj.addEventListener(
        'load',
        () => {
          resolve(jj.width > 0 && jj.height > 0);
        },
        { once: true }
      );
      jj.addEventListener('error', reject, { once: true });
      jj.src =
        'data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZgAAAOptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAImlsb2MAAAAAREAAAQABAAAAAAEOAAEAAAAAAAAAFgAAACNpaW5mAAAAAAABAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAamlwcnAAAABLaXBjbwAAABNjb2xybmNseAABAA0ABoAAAAAMYXYxQ4EgAgAAAAAUaXNwZQAAAAAAAAABAAAAAQAAABBwaXhpAAAAAAMICAgAAAAXaXBtYQAAAAAAAAABAAEEAYIDBAAAAB5tZGF0EgAKBzgADlAQ0GkyCR+QAABAAACv5g==';
    });

    if (!j) return;

    globalThis.clearTimeout(globalThis.esBlockerTimeout);
    delete globalThis.esBlockerTimeout;
    document.querySelectorAll('.tech-blocker').forEach((elem) => {
      elem.dataset.h = h;
      elem.dataset.i = i.ii();
      elem.remove();
    });
  }
})();
