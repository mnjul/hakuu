// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018 Min-Zhong Lu

'use strict';

(async () => {
  if (window.AbortController) {
    let a = {c: ''};
    let {c: b} = a;
    let d = [];
    let e = [...d];

    let canvas = document.createElement('canvas');
    if (['webgl', 'experimental-webgl'].every(type => !canvas.getContext(type))) {
      return;
    }

    clearTimeout(window.esBlockerTimeout);  
    Array.from(document.querySelectorAll('.tech-blocker')).forEach(elem => {
      elem.dataset.b = b;
      elem.dataset.e = e;
      elem.remove();
    });
  }
})();
