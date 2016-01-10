/*jshint strict: false */
/*global setTimeout */

/*jshint -W098 */
var p = (function () {
  /*jshint +W098 */

  var task = setTimeout;

  function isFunction(value) {
    return typeof value === 'function';
  }

  function resolutionProcedure(promise, x, resolve, reject) {
    if (promise === x) {
      throw TypeError();
    }
    if ((x && typeof x === 'object') || isFunction(x)) {
      var called = 0;
      try {
        var then = x.then;
        if (isFunction(then)) {
          then.call(x, function (y) {
            if (called) {
              return;
            }
            called = 1;
            resolutionProcedure(promise, y, resolve, reject);
          }, function (r) {
            if (called) {
              return;
            }
            called = 1;
            reject(r);
          });
        } else {
          resolve(x);
        }
      } catch (e) {
        if (!called) {
          reject(e);
        }
      }
    } else {
      resolve(x);
    }
  }

  var FULFILLED = 1;
  var REJECTED = 2;

  function defer() {
    var state;
    var valueOrReason;
    var queue = [];
    function emptyQueue(offset, iteratee) {
      /*jshint loopfunc: true */
      var item;
      while ((item = queue.shift())) {
        (function (callback, promise, resolve, reject) {
          task(function () {
            iteratee(callback, promise, resolve, reject);
          });
        }(item[offset], item[2], item[3], item[4]));
      }
    }
    function callOnFulfilleds() {
      emptyQueue(0, function (onFulfilled, promise, resolve, reject) {
        try {
          var x = isFunction(onFulfilled) ? onFulfilled(valueOrReason) : valueOrReason;
          resolutionProcedure(promise, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
    }
    function callOnRejecteds() {
      emptyQueue(1, function (onRejected, promise, resolve, reject) {
        try {
          if (isFunction(onRejected)) {
            var x = onRejected(valueOrReason);
            resolutionProcedure(promise, x, resolve, reject);
          } else {
            reject(valueOrReason);
          }
        } catch (e) {
          reject(e);
        }
      });
    }
    function promiseThen(onFulfilled, onRejected) {
      var deferred = defer();
      queue.push([
        onFulfilled,
        onRejected,
        deferred.promise,
        deferred.resolve,
        deferred.reject
      ]);
      if (state === FULFILLED) {
        callOnFulfilleds();
      }
      if (state === REJECTED) {
        callOnRejecteds();
      }
      return deferred.promise;
    }
    function promiseCatch(onRejected) {
      return promiseThen(0, onRejected);
    }
    return {
      promise: {
        then: promiseThen,
        'catch': promiseCatch // Quotes for old IE
      },
      resolve: function (value) {
        if (state) {
          return;
        }
        state = FULFILLED;
        valueOrReason = value;
        callOnFulfilleds();
      },
      reject: function (reason) {
        if (state) {
          return;
        }
        state = REJECTED;
        valueOrReason = reason;
        callOnRejecteds();
      }
    };
  }

  function resolve(value) {
    var deferred = defer();
    resolutionProcedure(deferred.promise, value, deferred.resolve, deferred.reject);
    return deferred.promise;
  }

  return {
    defer: defer,
    resolve: resolve,
    reject: function (reason) {
      var deferred = defer();
      deferred.reject(reason);
      return deferred.promise;
    },
    all: function (array) {
      /*jshint loopfunc: true */
      var deferred = defer();
      var resolvedValues = [];
      var resolvedCount = 0;
      var length = array.length;
      for (var i = 0; i < length; i += 1) {
        (function (i) {
          resolve(array[i]).then(function (value) {
            resolvedValues[i] = value;
            resolvedCount += 1;
            if (resolvedCount === length) {
              deferred.resolve(resolvedValues);
            }
          }, deferred.reject);
        }(i));
      }
      return deferred.promise;
    },
    props: function (object) {
      /*jshint loopfunc: true */
      var deferred = defer();
      var resolvedValues = {};
      var resolvedCount = 0;
      var length = 0;
      for (var key in object) {
        if ({}.hasOwnProperty.call(object, key)) {
          length += 1;
          (function (key) {
            resolve(object[key]).then(function (value) {
              resolvedValues[key] = value;
              resolvedCount += 1;
              if (resolvedCount === length) {
                deferred.resolve(resolvedValues);
              }
            }, deferred.reject);
          }(key));
        }
      }
      return deferred.promise;
    }
  };

}());
