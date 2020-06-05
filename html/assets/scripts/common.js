// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2020 Min-Zhong Lu

'use strict';

;(function (exports){

 exports.$ = document.querySelector.bind(document);
exports.$$ = document.querySelectorAll.bind(document);
exports.$e = document.createElement.bind(document);

Element.prototype.$ = Element.prototype.querySelector;
Element.prototype.$$ = Element.prototype.querySelectorAll;

Object.prototype.mapValues = function(evaluator) {
  return Object.keys(this).reduce((retObj, key) => {
    retObj[key] = evaluator(this[key]);
    return retObj;
  }, {});
};

Blob.prototype.asDataURL = function() {
  return new Promise((resolve, reject) => {
   let reader = new FileReader();
   reader.addEventListener('load',  () => resolve(reader.result));
   reader.addEventListener('error', () => reject(reader.error));
   reader.readAsDataURL(this); 
  });
};

Object.defineProperty(exports, 'DEBUG', {value: true});

Object.defineProperty(exports, 'REM_SCALE', {value: 100});

})(window);

// Because internal functions conflict with mangling minification (dependent on
// _-prefixed method names for private members) and are for robust development
// purposes only, in production environment we don't use it at all for better
// minification result.
;(function (exports){

exports.createInternalFunction = () => _ => _;

})(window);

/*<BUILD_REMOVAL>*/

;(function (exports){

if (window.DEBUG) {
  exports.internalFunctions = new WeakMap();
}

})(window);


;(function (exports){

// uniqueKey -> WeakMap (instance -> members)
let privateMemberMap = new WeakMap();

function createInternalFunction(classType) {
  let uniqueKey = [];
  let classPrivateMethods = {};

  Object.getOwnPropertyNames(classType.prototype)
    .filter(name => name.startsWith('_') &&
            classType.prototype[name] instanceof Function)
    .forEach(name => {
      classPrivateMethods[name] = classType.prototype[name];
      delete classType.prototype[name];
    });

  if (!privateMemberMap.has(uniqueKey)) {
    privateMemberMap.set(uniqueKey, new WeakMap());
  }

  function generatePrivateMemberObject(instance) {
    let obj = {};

    Object.entries(classPrivateMethods)
      .forEach(([name, func]) => {
        obj[name] = func.bind(instance);
      });

    return obj;  
  }

  return function(instance) {
    if (!privateMemberMap.get(uniqueKey).has(instance)) {
      privateMemberMap.get(uniqueKey).set(
        instance,
        generatePrivateMemberObject(instance)
      );
    }

    return privateMemberMap.get(uniqueKey).get(instance);   
  };
}

exports.createInternalFunction = createInternalFunction;

})(window);

/*</BUILD_REMOVAL>*/
