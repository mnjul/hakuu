// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

'use strict';

(function () {
  Element.prototype.$ = Element.prototype.querySelector;

  Element.prototype.$$ = Element.prototype.querySelectorAll;

  Node.prototype.empty = function () {
    while (this.firstChild) {
      this.firstChild.remove();
    }
  };

  Blob.prototype.asDataURL = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener(
        'load',
        () => {
          resolve(reader.result);
        },
        {
          once: true,
        }
      );
      reader.addEventListener(
        'error',
        () => {
          reject(reader.error);
        },
        {
          once: true,
        }
      );
      reader.readAsDataURL(this);
    });
  };
})();
