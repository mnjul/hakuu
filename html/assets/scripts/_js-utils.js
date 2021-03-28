// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

'use strict';

// Because internal functions conflict with mangling minification (dependent on
// _-prefixed method names for private members) and are for robust development
// purposes only, in production environment we don't use it at all for better
// minification result.
(function (exports) {
  exports.createInternalFunction = () => (_) => _;
})(window);

/*<BUILD_REMOVAL>*/

(function (exports) {
  if (window.DEBUG) {
    exports.internalFunctions = new WeakMap();
    exports._ = (instance) =>
      exports.internalFunctions[Object.getPrototypeOf(instance).constructor](
        instance
      );
  }
})(window);

(function (exports) {
  // classType -> WeakMap (instance -> members)
  const privateMemberMap = new WeakMap();

  function createInternalFunction(classType) {
    const classPrivateMethods = new Map();

    Object.getOwnPropertyNames(classType.prototype)
      .filter(
        (name) =>
          name.startsWith('_') && classType.prototype[name] instanceof Function
      )
      .forEach((name) => {
        classPrivateMethods.set(name, classType.prototype[name]);
        delete classType.prototype[name];
      });

    if (!privateMemberMap.has(classType)) {
      privateMemberMap.set(classType, new WeakMap());
    }

    function generatePrivateMemberObject(instance) {
      return Object.fromEntries(
        Array.from(classPrivateMethods).map(([name, func]) => [
          name,
          func.bind(instance),
        ])
      );
    }

    return function (instance) {
      if (!privateMemberMap.get(classType).has(instance)) {
        privateMemberMap
          .get(classType)
          .set(instance, generatePrivateMemberObject(instance));
      }

      return privateMemberMap.get(classType).get(instance);
    };
  }

  exports.createInternalFunction = createInternalFunction;
})(window);

/*</BUILD_REMOVAL>*/
