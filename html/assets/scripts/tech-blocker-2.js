// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018 Min-Zhong Lu

'use strict';

(async () => {
  if (window.AbortController) {
    clearTimeout(window.esBlockerTimeout);  
    Array.from(document.querySelectorAll('.tech-blocker')).forEach(elem => elem.remove());
  }
})();
