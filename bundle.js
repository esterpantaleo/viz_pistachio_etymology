(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

module.exports = Cluster

/**
 * All supported linkage functions.
 * You can add your own globally or use them for whatever you want.
 */
 
Cluster.linkages = {
  'single': singleLink,
  'complete': completeLink,
  'average': averageLink,
}

function Cluster(options) {
  if (!(this instanceof Cluster)) return new Cluster(options)

  if (!Array.isArray(options.input)) throw new TypeError('input must be an array')
  if (!options.input.length) throw new Error('input must not be empty')
  if (typeof options.distance !== 'function') throw new TypeError('invalid distance function')

  if (typeof options.linkage === 'string') options.linkage = Cluster.linkages[options.linkage]

  if (typeof options.linkage !== 'function') throw new TypeError('invalid linkage function')


  this.input = options.input
  this.distance = options.distance
  this.linkage = options.linkage

  // array of distances between each input index
  this.distances = createDistanceArray(options.input, options.distance)
  // cache lookup for similarities between clusters
  this.links = Object.create(null)

  // store the current clusters by indexes
  // this is private and gets rewritten on every level
  var clusters = this.clusters = []
  for (var i = 0, l = options.input.length; i < l; i++)
    clusters.push([i])

  // store each level
  var level = {
    linkage: null,
    clusters: clusters,
  }
  this.levels = [level]

  var minClusters = Math.max(options.minClusters || 1, 1)
  var maxLinkage = typeof options.maxLinkage === 'number'
    ? options.maxLinkage
    : Infinity

  while (this.clusters.length > minClusters && level.linkage < maxLinkage)
    level = this.reduce()
  return this.levels
}

/**
 * Merge the two most closely linked clusters.
 */

Cluster.prototype.reduce = function () {
  var clusters = this.clusters
  var min
  for (var i = 0; i < clusters.length; i++) {
    for (var j = 0; j < i; j++) {
      var linkage = this.linkageOf(clusters[i], clusters[j])

      // set the linkage as the min
      if (!min || linkage < min.linkage) {
        min = {
          linkage: linkage,
          i: i,
          j: j,
        }
      }
    }
  }

  clusters = this.clusters = clusters.slice()
  clusters[min.i] = clusters[min.i].concat(clusters[min.j])
  clusters.splice(min.j, 1)
  var level = {
    linkage: min.linkage,
    clusters: clusters,
    from: j,
    to: i,
  }
  this.levels.push(level)
  return level
}

/**
 * Calculate the linkage between two clusters.
 */

Cluster.prototype.linkageOf = function (clusterA, clusterB) {
  var hash = clusterA.length > clusterB.length
    ? ('' + clusterA + '-' + clusterB)
    : ('' + clusterB + '-' + clusterA)
  var links = this.links
  if (hash in links) return links[hash]

  // grab all the distances
  var distances = [];
  for (var k = 0; k < clusterA.length; k++) {
    for (var h = 0; h < clusterB.length; h++) {
      distances.push(this.distanceOf(clusterA[k], clusterB[h]))
    }
  }

  // cache and return the linkage
  return links[hash] = this.linkage(distances)
}

/**
 * Calculate the distance between two inputs.
 */

Cluster.prototype.distanceOf = function (i, j) {
  if (i > j) return this.distances[i][j]
  return this.distances[j][i]
}

/**
 * Create the upper triangle of the symmetric, distance matrix.
 * Only i > j is valid for matrix[i][j].
 */

function createDistanceArray(input, distance) {
  var length = input.length
  var matrix = new Array(length)
  for (var i = 0; i < length; i++) {
    matrix[i] = new Array(i)
    for (var j = 0; j < i; j++)
      matrix[i][j] = distance(input[i], input[j])
  }

  return matrix
}

/*
 * Predefined linkage functions
 */

function singleLink(distances) {
  return Math.min.apply(null, distances)
}

function completeLink(distances) {
  return Math.max.apply(null, distances)
}

function averageLink(distances) {
  var sum = distances.reduce(function (a, b) {
    return a + b
  })
  return sum / distances.length
}

},{}],2:[function(require,module,exports){
//     wink-distance
//     Distance functions for Bag of Words, Strings,
//     Vectors and more.
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-distance”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

//
// Because we want to logically group the variables.
/* eslint sort-vars: 0 */

// ## bow

// ### cosine
/**
 *
 * Computes the cosine distance between the input bag of words (bow)
 * `a` and `b` and returns a value between 0 and 1.
 *
 * @method bow.cosine
 * @param {object} a the first set of bows i.e word (i.e. key) and it's frequency
 * (i.e. value) pairs.
 * @param {object} b the second set of bows.
 * @return {number} cosine distance between `a` and `b`.
 *
 * @example
 * // bow for "the dog chased the cat"
 * var a = { the: 2, dog: 1, chased: 1, cat: 1 };
 * // bow  for "the cat chased the mouse"
 * var b = { the: 2, cat: 1, chased: 1, mouse: 1 };
 * cosine( a, b );
 * // -> 0.14285714285714302
 * // Note the bow could have been created directly by
 * // using "tokens.bow()" from the "wink-nlp-utils".
 */
var cosine = function ( a, b ) {
  // `ab` & `ba` additional variables are required as you dont want to corrupt
  // `a` & `b`!
  // Updated `a` with words in `b` set as 0 in `a`.
  var ab = Object.create( null );
  // Updated `b` with words in `a` set as 0 in `b`.
  var ba = Object.create( null );
  var distance;
  var w; // a word!

  // Fill up `ab` and `ba`
  for ( w in a ) { // eslint-disable-line guard-for-in
    ab[ w ] = a[ w ];
    ba[ w ] = 0;
  }
  for ( w in b ) { // eslint-disable-line guard-for-in
    ba[ w ] = b[ w ];
    ab[ w ] = ab[ w ] || 0;
  }
  // With `ab` & `ba` in hand, its easy to transform in to
  // vector: its a frequency of each word found in both strings
  // We do not need to store these vectors in arrays, instead we can perform
  // processing in the same loop.
  var sa2 = 0,  // sum of ai^2
     saxb = 0, // sum of ai x bi
     sb2 = 0,  // sum of bi^2
     va, vb;  // value of ai and bi
  // One could have used `ba`, as both have same words now!
  for ( w in ab ) { // eslint-disable-line guard-for-in
    va = ab[ w ];
    vb = ba[ w ];
    sa2 += va * va;
    sb2 += vb * vb;
    saxb += va * vb;
  }
  // Compute cosine distance; ensure you dont get `NaN i.e. 0/0` by testing for
  // `sa2` and `sb2`.
  distance = 1 - (
    ( sa2 && sb2 ) ?
      // Compute cosine if both of them are non-zero.
      ( saxb / ( Math.sqrt( sa2 ) * Math.sqrt( sb2 ) ) ) :
      // If one of them is 0 means **0 distance** otherwise a distance of **1**.
      ( !sa2 ^ !sb2 ) ? 0 : 1 // eslint-disable-line no-bitwise
  );
  return distance;
}; // cosine()

// Export cosine
module.exports = cosine;

},{}],3:[function(require,module,exports){
//     wink-distance
//     Distance functions for Bag of Words, Strings,
//     Vectors and more.
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-distance”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

/* eslint-disable no-bitwise */

// ## number

// ### hamming
/**
 *
 * Computes the the hamming distance between two numbers; each number is
 * assumed to be decimal representation of a binary number.
 *
 * @method number.hamming
 * @param {number} na the first number.
 * @param {number} nb the second number.
 * @return {number} hamming distance between `na` and `nb`.
 *
 * @example
 * hamming( 8, 8 );
 * // -> 0
 * hamming( 8, 15 );
 * // -> 3
 * hamming( 9, 15 );
 * // -> 2
 */
var hamming = function ( na, nb ) {
  // Initialize hamming distance.
  var distance = 0;
  // Compute hamming distance.
  for ( var xor = na ^ nb; xor > 0; distance += 1 ) xor &= ( xor - 1 );

  return distance;
}; // hamming()

module.exports = hamming;

},{}],4:[function(require,module,exports){
//     wink-distance
//     Distance functions for Bag of Words, Strings,
//     Vectors and more.
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-distance”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

//
// Because we want to logically group the variables.
/* eslint sort-vars: 0 */

// ## set

// ### jaccard
/**
 *
 * Computes the Jaccard distance between input sets `sa` and `sb`.
 * This distance is always between 0 and 1.
 *
 * @method set.jaccard
 * @param {set} sa the first set.
 * @param {set} sb the second set.
 * @return {number} the Jaccard distance between `sa` and `sb`.
 *
 * @example
 * // Set for :-)
 * var sa = new Set( ':-)' );
 * // Set for :-(
 * var sb = new Set( ':-(' );
 * jaccard( sa, sb );
 * // -> 0.5
 */
var jaccard = function ( sa, sb ) {
  var intersectSize = 0;
  var distance;
  // Use smaller sized set for iteration.
  if ( sa.size < sb.size ) {
    sa.forEach( function ( element ) {
      if ( sb.has( element ) ) intersectSize += 1;
    } );
  } else {
    sb.forEach( function ( element ) {
      if ( sa.has( element ) ) intersectSize += 1;
    } );
  }
  // Compute Jaccard similarity while taking care of case when dividend is 0!
  distance = (
              ( sa.size || sb.size ) ?
                1 - ( intersectSize / ( sa.size + sb.size - intersectSize ) ) :
                0
             );
  return distance;
}; // jaccard()

 // Export Jaccard.
 module.exports = jaccard;

},{}],5:[function(require,module,exports){
//     wink-distance
//     Distance functions for Bag of Words, Strings,
//     Vectors and more.
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-distance”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

//
// Because we want to logically group the variables.
/* eslint sort-vars: 0 */
var validate = require( 'wink-helpers' ).validate;
// ## set

// ### tversky
/**
 *
 * Computes the tversky distance between input sets `sa` and `sb`.
 * This distance is always between 0 and 1. Tversky calls `sa` as
 * **prototype** and `sb` as **variant**. The `alpha` corresponds
 * to the weight of prototype, whereas `beta` corresponds to the
 * weight of variant.
 *
 * @method set.tversky
 * @param {set} sa the first set or the prototype.
 * @param {set} sb the second set or the variant.
 * @param {number} [alpha=0.5] the prototype weight.
 * @param {number} [beta=0.5] the variant weight.
 * @return {number} the tversky distance between `sa` and `sb`.
 *
 * @example
 * // Set for :-)
 * var sa = new Set( ':-)' );
 * // Set for :p
 * var sb = new Set( ':p' );
 * tversky( sa, sb, 1, 0 );
 * // -> 0.6666666666666667
 * tversky( sa, sb );
 * // -> 0.6
 * tversky( sa, sb, 0.5, 0.5 );
 * // -> 0.6
 * tversky( sa, sb, 0, 1 );
 * // -> 0.5
 */
var tversky = function ( sa, sb, alpha, beta ) {
  // Contains `alpha` & `beta` values respectively after the validations.
  var a, b;
  // Size of the intersection between set `sa` and `sb`.
  var intersectSize = 0;
  // Their differences!
  var saDIFFsb, sbDIFFsa;
  // The distance between `sa` and `sb`.s
  var distance;
  a = ( alpha === undefined ) ? 0.5 : alpha;
  b = ( beta === undefined ) ? 0.5 : beta;
  if ( a < 0 || b < 0 || !validate.isFiniteNumber( a ) || !validate.isFiniteNumber( b ) ) {
    throw Error( 'wink-distance: tversky requires aplha & beta to be positive numbers.' );
  }
  // Use smaller sized set for iteration.
  if ( sa.size < sb.size ) {
  sa.forEach( function ( element ) {
    if ( sb.has( element ) ) intersectSize += 1;
  } );
  } else {
    sb.forEach( function ( element ) {
      if ( sa.has( element ) ) intersectSize += 1;
    } );
  }
  saDIFFsb = sa.size - intersectSize;
  sbDIFFsa = sb.size - intersectSize;
  // Compute Tversky distance.
  distance = 1 - ( intersectSize / ( intersectSize + ( a * saDIFFsb ) + ( b * sbDIFFsa ) ) );
  // Handle divide by zero!
  return ( ( isNaN( distance ) ) ? 0 : distance );
}; // tversky()

// Export tversky.
module.exports = tversky;

},{"wink-helpers":16}],6:[function(require,module,exports){
//     wink-distance
//     Distance functions for Bag of Words, Strings,
//     Vectors and more.
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-distance”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

//
// Soundex Code for alphabets.
/* eslint-disable object-property-newline */
var soundexMap = {
  A: 0, E: 0, I: 0, O: 0, U: 0, Y: 0,
  B: 1, F: 1, P: 1, V: 1,
  C: 2, G: 2, J: 2, K: 2, Q: 2, S: 2, X: 2, Z: 2,
  D: 3, T: 3,
  L: 4,
  M: 5, N: 5,
  R: 6
};

// ## string

// ### soundex
/**
 *
 * Produces the soundex code from the input `word`.
 *
 * @private
 * @param {string} word the input word.
 * @param {number} [maxLength=4] of soundex code to be returned.
 * @return {string} soundex code of `word`.
 * @example
 * soundex( 'Burroughs' );
 * // -> 'B620'
 * soundex( 'Burrows' );
 * // -> 'B620'
 */
var soundex = function ( word, maxLength ) {
  // Upper case right in the begining.
  var s = ( word.length ) ? word.toUpperCase() : '?';
  var i,
      imax = s.length;
  // Soundex code builds here.
  var sound = [];
  // Helpers - `ch` is a char from `s` and `code/prevCode` are sondex codes
  // for consonants.
  var ch, code,
      prevCode = 9;
  // Use default of 4.
  var maxLen = maxLength || 4;
  // Iterate through every character.
  for ( i = 0; i < imax; i += 1 ) {
    ch = s[ i ];
    code = soundexMap[ ch ];
    if ( i ) {
      // Means i is > 0.
      // `code` is either (a) `undefined` if an unknown character is
      // encountered including `h & w`, or (b) `0` if it is vowel, or
      // (c) the soundex code for a consonant.
      if ( code && code !== prevCode ) {
        // Consonant and not adjecant duplicates!
        sound.push( code );
      } else if ( code !== 0 ) {
        // Means `h or w` or an unknown character: ensure `prevCode` is
        // remembered so that adjecant duplicates can be handled!
        code = prevCode;
      }
    } else {
      // Retain the first letter
      sound.push( ch );
    }
    prevCode = code;
  }
  s = sound.join( '' );
  // Always ensure minimum length of 4 characters for maxLength > 4.
  if ( s.length < 4 ) s += '000';
  // Return the required length.
  return s.substr( 0, maxLen );
}; // soundex()

module.exports = soundex;

},{}],7:[function(require,module,exports){
//     wink-distance
//     Distance functions for Bag of Words, Strings,
//     Vectors and more.
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-distance”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

// ## string

// ### hammingNormalized
/**
 *
 * Computes the normalized hamming distance between two strings. These strings
 * may be of different lengths. Normalized distance is always between 0 and 1.
 *
 * @method string.hammingNormalized
 * @param {string} str1 first string.
 * @param {string} str2 second string.
 * @return {number} normalized hamming distance between `str1` and `str2`.
 * @example
 * hammingNormalized( 'john', 'johny' );
 * // ->  0.2
 * hammingNormalized( 'sam', 'sam' );
 * // -> 0
 * hammingNormalized( 'sam', 'samuel' );
 * // -> 0.5
 * hammingNormalized( 'saturn', 'urn' );
 * // -> 1
 */
var hammingNormalized = function ( str1, str2 ) {
  // As we may need to swap values!
  var s1 = str1,
      s2 = str2;
  // String lengths.
  var s1Length = s1.length,
      s2Length = s2.length;
  // Absolute distance between `s1` & `s2`.
  var distance;
  // Helper variables.
  var i, imax;
  var dividend;
  // Initialize stuff and may have to swap `s1`/`s2`.
  if ( s1Length < s2Length ) {
    // Swap `s1` and `s2` values.
    s1 = [ s2, s2 = s1 ][ 0 ];
    // Initialize distance as the difference in lengths of `s1` & `s2`.
    distance = s2Length - s1Length;
    imax = s1Length;
    // Initialize dividend by the larger string length.
    dividend = s2Length;
  } else {
    // No need to swap, but do initialize stuff.
    distance = s1Length - s2Length;
    imax = s2Length;
    dividend = s1Length;
  }
  // Compute distance.
  for ( i = 0; i < imax; i += 1 ) {
    if ( s1[ i ] !== s2[ i ] ) distance += 1;
  }
  // Normalize the distance & return.
  return ( dividend ) ? ( distance / dividend ) : 0;
}; // hammingNormalized()

module.exports = hammingNormalized;

},{}],8:[function(require,module,exports){
//     wink-distance
//     Distance functions for Bag of Words, Strings,
//     Vectors and more.
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-distance”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

// ## string

// ### hamming
/**
 *
 * Computes the hamming distance between two strings of identical length.
 * This distance is always `>= 0`.
 *
 * @method string.hamming
 * @param {string} str1 first string.
 * @param {string} str2 second string.
 * @return {number} hamming distance between `str1` and `str2`.
 * @example
 * hamming( 'john', 'john' );
 * // ->  0
 * hamming( 'sam', 'sat' );
 * // -> 1
 * hamming( 'summer', 'samuel' );
 * // -> 3
 * hamming( 'saturn', 'urn' );
 * // -> throws error
 */
var hamming = function ( str1, str2 ) {
  // As we may need to swap values!
  var s1 = str1,
      s2 = str2;
  // String lengths.
  var s1Length = s1.length,
      s2Length = s2.length;
  // Absolute distance between `s1` & `s2`.
  var distance = 0;

  if ( s1Length !== s2Length ) {
    throw Error( 'wink-distance: hamming requires identical length input strings.' );
  }

  // Compute distance.
  for ( var i = 0; i < s1Length; i += 1 ) {
    if ( s1[ i ] !== s2[ i ] ) distance += 1;
  }
  // Normalize the distance & return.
  return distance;
}; // hamming()

module.exports = hamming;

},{}],9:[function(require,module,exports){
//     wink-distance
//     Distance functions for Bag of Words, Strings,
//     Vectors and more.
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-distance”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

var jaro = require( './string-jaro.js' );
// ## string

// ### jaro
/**
 *
 * Computes the jaro winkler distance between two strings. This distance,
 * controlled by the `scalingFactor`, is always between 0 and 1.
 *
 * @method string.jaroWinkler
 * @param {string} str1 first string.
 * @param {string} str2 second string.
 * @param {number} [boostThreshold=0.3] beyond which scaling is applied: it is
 * applied only if the jaro distance between the input strings is less than or
 * equal to this value. Any value > 1, is capped at 1 automatically.
 * @param {number} [scalingFactor=0.1] is used to scale the distance.
 * Such scaling, if applied, is proportional to the number of shared
 * consecutive characters from the first character of `str1` and `str2`.
 * Any value > 0.25, is capped at 0.25 automatically.
 * @return {number} jaro winkler distance between `str1` and `str2`.
 * @example
 * jaroWinkler( 'martha', 'marhta' );
 * // ->  0.03888888888888883
 * jaroWinkler( 'martha', 'marhta', 0.3, 0.2 );
 * // -> 0.022222222222222185
 * jaroWinkler( 'duane', 'dwayne' );
 * // -> .15999999999999992
 */
var jaroWinkler = function ( str1, str2, boostThreshold, scalingFactor ) {
   // Early exit!
   if ( str1 === str2 ) return 0;
   // Setup default values if undefined.
   var sf = ( scalingFactor === undefined ) ? 0.1 : scalingFactor;
   var bt = ( boostThreshold === undefined ) ? 0.3 : boostThreshold;
   // Fix scaling factor & boost threshold, if required.
   sf = Math.min( Math.abs( sf ), 0.25 );
   bt = Math.min( Math.abs( bt ), 1 );

   var distance = jaro( str1, str2 );

   if ( distance > bt ) return distance;

   var pLimit = Math.min( str1.length, str2.length, 4 );
   var l = 0;

   for ( var i = 0; i < pLimit; i += 1 ) {
     if ( str1[ i ] === str2[ i ] ) {
       l += 1;
     } else {
       break;
     }
   }

   distance -= ( l * sf * distance );

   return distance;
 }; // jaroWinkler()

module.exports = jaroWinkler;

},{"./string-jaro.js":10}],10:[function(require,module,exports){
//     wink-distance
//     Distance functions for Bag of Words, Strings,
//     Vectors and more.
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-distance”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

var jaro = require( 'wink-jaro-distance' );
// ## string

// ### jaro
/**
 *
 * Computes the jaro distance between two strings. This distance is always
 * between 0 and 1.
 *
 * @method string.jaro
 * @param {string} str1 first string.
 * @param {string} str2 second string.
 * @return {number} jaro distance between `str1` and `str2`.
 * @example
 * jaro( 'father', 'farther' );
 * // ->  0.04761904761904756
 * jaro( 'abcdef', 'fedcba' );
 * // -> 0.6111111111111112
 * jaro( 'sat', 'urn' );
 * // -> 1
 */
var jaroDistance = function ( str1, str2 ) {
  return ( jaro( str1, str2 ).distance );
}; // jaro()

module.exports = jaroDistance;

},{"wink-jaro-distance":17}],11:[function(require,module,exports){
//     wink-distance
//     Distance functions for Bag of Words, Strings,
//     Vectors and more.
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-distance”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

//
// Scratchpad.
var col = [];
// Char Codes Cache.
var ccc = [];

// ## string

// ### levenshtein
/**
 *
 * Computes the levenshtein distance between two strings. This distance is computed
 * as the number of deletions, insertions, or substitutions required to transform a
 * string to another. Levenshtein distance is always an integer with a value of 0 or more.
 *
 * @method string.levenshtein
 * @param {string} str1 first string.
 * @param {string} str2 second string.
 * @return {number} levenshtein distance between `str1` and `str2`.
 * @example
 * levenshtein( 'example', 'sample' );
 * // ->  3
 * levenshtein( 'distance', 'difference' );
 * // -> 5
 */
var levenshtein = function ( str1, str2 ) {
  // This method was first presented by Levenshtein, V. I. in his paper titled
  // "[Binary Codes Capable of Correcting Deletions, Insertions and Reversals](https://nymity.ch/sybilhunting/pdf/Levenshtein1966a.pdf)".
  // The original paper was in Russian and the link here is to an English translation.
  // This implementation is inspired by the article,
  // "[Fast, memory efficient Levenshtein algorithm](https://www.codeproject.com/Articles/13525/Fast-memory-efficient-Levenshtein-algorithm)".

  // `s1` and `s2` ti contain string 1 & 2 or default.
  var s1 = str1 || '';
  var s2 = str2 || '';
  // Their lengths.
  var s1Length, s2Length;
  // Loop index variables.
  var i, j;
  // For deletion & insertion check.
  var above, left;
  // A character code from s1 (temp var).
  var chs1;
  // The levenshtein distance.
  var distance;
  if ( s1 === s2 ) {
    // If they are equal means 0-distance.
    return 0;
  } else if ( s1.length > s2.length ) {
           // Otherwise ensure `s2` contains the longer string.
           i = s1;
           s1 = s2;
           s2 = i;
         }
  // Their lengths;
  s1Length = s1.length;
  s2Length = s2.length;
  // Only need to check for s1's length being equal to 0, as s1 is smaller.
  if ( s1Length === 0 ) return s2Length;

  i = 0;
  while ( i < s2Length ) {
    // Cache char codes of the longer string.
    ccc[ i ] = s2.charCodeAt( i );
    // Initialize `col`.
    col[ i ] = ( i += 1 );
  }
  // Distance computation loops.
  i = 0;

  while ( i < s1Length ) {
    chs1 = s1.charCodeAt( i );
    left = distance = i;
    j = 0;
    while ( j < s2Length ) {
      above = ( chs1 === ccc[ j ] ) ? left : left + 1;
      left = col[ j ];
      col[ j ] = distance = ( left > distance ) ?
        ( above > distance ) ? distance + 1 : above :
          ( above > left ) ? left + 1 : above;
      j += 1;
    }
    i += 1;
  }
  // Return the distance.
  return distance;
}; // levenshtein()

module.exports = levenshtein;

},{}],12:[function(require,module,exports){
//     wink-distance
//     Distance functions for Bag of Words, Strings,
//     Vectors and more.
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-distance”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

var soundex = require( './soundex.js' );
// ## string

// ### soundex
/**
 *
 * Computes the soundex distance between two strings. This distance is either
 * 1 indicating phonetic similarity or 0 indicating no similarity.
 *
 * @method string.soundex
 * @param {string} str1 first string.
 * @param {string} str2 second string.
 * @return {number} soundex distance between `str1` and `str2`.
 * @example
 * soundex( 'Burroughs', 'Burrows' );
 * // ->  0
 * soundex( 'Ekzampul', 'example' );
 * // -> 0
 * soundex( 'sat', 'urn' );
 * // -> 1
 */
var soundexDistance = function ( str1, str2 ) {
  return ( soundex( str1 ) === soundex( str2 ) ) ? 0 : 1;
}; // soundexDistance()

module.exports = soundexDistance;

},{"./soundex.js":6}],13:[function(require,module,exports){
//     wink-distance
//     Distance functions for Bag of Words, Strings,
//     Vectors and more.
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-distance”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

/* eslint-disable no-bitwise */

// ## vector

// ### chebyshev
/**
 *
 * Computes the chebyshev or manhattan distance between two vectors of identical
 * length.
 *
 * @method vector.chebyshev
 * @param {number} va the first vector.
 * @param {number} vb the second vector.
 * @return {number} chebyshev distance between `va` and `vb`.
 *
 * @example
 * chebyshev( [ 0, 0 ], [ 6, 6 ] );
 * // -> 6
 */
var chebyshev = function ( va, vb ) {
  var imax;
  if ( (imax = va.length) !== vb.length ) {
    throw Error( 'wink-distance: chebyshev requires identical lenght input vectors.' );
  }
  // Initialize chebyshev distance.
  var distance = 0;
  // Compute chebyshev distance.
  for ( var i = 0; i < imax; i += 1 ) distance = Math.max( Math.abs( va[ i ] - vb[ i ] ), distance );

  return distance;
}; // chebyshev()

module.exports = chebyshev;

},{}],14:[function(require,module,exports){
//     wink-distance
//     Distance functions for Bag of Words, Strings,
//     Vectors and more.
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-distance”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

/* eslint-disable no-bitwise */

// ## vector

// ### taxicab
/**
 *
 * Computes the taxicab or manhattan distance between two vectors of identical
 * length.
 *
 * @method vector.taxicab
 * @param {number} va the first vector.
 * @param {number} vb the second vector.
 * @return {number} taxicab distance between `va` and `vb`.
 *
 * @example
 * taxicab( [ 0, 0 ], [ 6, 6 ] );
 * // -> 12
 */
var taxicab = function ( va, vb ) {
  var imax;
  if ( (imax = va.length) !== vb.length ) {
    throw Error( 'wink-distance: taxicab requires identical lenght input vectors.' );
  }
  // Initialize taxicab distance.
  var distance = 0;
  // Compute taxicab distance.
  for ( var i = 0; i < imax; i += 1 ) distance += Math.abs( va[ i ] - vb[ i ] );

  return distance;
}; // taxicab()

module.exports = taxicab;

},{}],15:[function(require,module,exports){
//     wink-distance
//     Distance functions for Bag of Words, Strings,
//     Vectors and more.
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-distance”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

var wd = Object.create( null );

/**
 * BOW
 * @namespace bow
 */
wd.bow = Object.create( null );

/**
 * Number
 * @namespace number
 */

wd.number = Object.create( null );

/**
 * Set
 * @namespace set
 */
wd.set = Object.create( null );

/**
 * String
 * @namespace string
 */
wd.string = Object.create( null );

/**
 * Vector
 * @namespace vector
 */
wd.vector = Object.create( null );


// BOW name space.
// 1. cosine
wd.bow.cosine = require( './bow-cosine.js' );

// Number name space.
// 1. hamming
wd.number.hamming = require( './number-hamming.js' );

// Set name space.
// 1. jaccard
wd.set.jaccard = require( './set-jaccard.js' );
// 2. tversky
wd.set.tversky = require( './set-tversky.js' );

// String name space.
// 1. hamming
wd.string.hamming = require( './string-hamming.js' );
// 2. hammingNormalized
wd.string.hammingNormalized = require( './string-hamming-normalized.js' );
// 3. jaro
wd.string.jaro = require( './string-jaro.js' );
// 4. jaroWinkler
wd.string.jaroWinkler = require( './string-jaro-winkler.js' );
// 5. levenshtein
wd.string.levenshtein = require( './string-levenshtein.js' );
// 6. soundex
wd.string.soundex = require( './string-soundex.js' );

// Vector name space.
// 1. taxicab
wd.vector.taxicab = require( './vector-taxicab.js' );
// Create an alias.
wd.vector.manhattan = require( './vector-taxicab.js' );
// 2. chebyshev
wd.vector.chebyshev = require( './vector-chebyshev.js' );


module.exports = wd;

},{"./bow-cosine.js":2,"./number-hamming.js":3,"./set-jaccard.js":4,"./set-tversky.js":5,"./string-hamming-normalized.js":7,"./string-hamming.js":8,"./string-jaro-winkler.js":9,"./string-jaro.js":10,"./string-levenshtein.js":11,"./string-soundex.js":12,"./vector-chebyshev.js":13,"./vector-taxicab.js":14}],16:[function(require,module,exports){
//     wink-helpers
//     Functions for cross validation, shuffle, cartesian product and more
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-helpers”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

//
var helpers = Object.create( null );

// ### Private Functions

// #### Product Reducer (Callback)

// Callback function used by `reduce` inside the `product()` function.
// Follows the standard guidelines of `reduce()` callback function.
var productReducer = function ( prev, curr ) {
  var c,
      cmax = curr.length;
  var p,
      pmax = prev.length;
  var result = [];

  for ( p = 0; p < pmax; p += 1 ) {
    for ( c = 0; c < cmax; c += 1 ) {
      result.push( prev[ p ].concat( curr[ c ] ) );
    }
  }
  return ( result );
}; // productReducer()

// ### Public Function

// ### Array Helpers

helpers.array = Object.create( null);

// #### is Array

// Tests if argument `v` is a JS array; returns `true` if it is, otherwise returns `false`.
helpers.array.isArray = function ( v ) {
  return ( ( v !== undefined ) && ( v !== null ) && ( Object.prototype.toString.call( v ) === '[object Array]' ) );
}; // isArray()


// #### sorting helpers

// Set of helpers to sort either numbers or strings. For key/value pairs,
// the format for each element must be `[ key, value ]`.
// Sort helper to sort an array in ascending order.
helpers.array.ascending = function ( a, b ) {
  return ( a > b ) ? 1 :
            ( a === b ) ? 0 : -1;
}; // ascending()

// Sort helper to sort an array in descending order.
helpers.array.descending = function ( a, b ) {
  return ( b > a ) ? 1 :
            ( b === a ) ? 0 : -1;
}; // descending()

// Sort helper to sort an array of `[ key, value ]` in ascending order by **key**.
helpers.array.ascendingOnKey = function ( a, b ) {
  return ( a[ 0 ] > b[ 0 ] ) ? 1 :
            ( a[ 0 ] === b[ 0 ] ) ? 0 : -1;
}; // ascendingOnKey()

// Sort helper to sort an array of `[ key, value ]` in descending order by **key**.
helpers.array.descendingOnKey = function ( a, b ) {
  return ( b[ 0 ] > a[ 0 ] ) ? 1 :
            ( b[ 0 ] === a[ 0 ] ) ? 0 : -1;
}; // descendingOnKey()

// Sort helper to sort an array of `[ key, value ]` in ascending order by **value**.
helpers.array.ascendingOnValue = function ( a, b ) {
  return ( a[ 1 ] > b[ 1 ] ) ? 1 :
            ( a[ 1 ] === b[ 1 ] ) ? 0 : -1;
}; // ascendingOnValue()

// Sort helper to sort an array of `[ key, value ]` in descending order by **value**.
helpers.array.descendingOnValue = function ( a, b ) {
  return ( b[ 1 ] > a[ 1 ] ) ? 1 :
            ( b[ 1 ] === a[ 1 ] ) ? 0 : -1;
}; // descendingOnValue()

// The following two functions generate a suitable function for sorting on a single
// key or on a composite keys (max 2 only). Just a remider, the generated function
// does not sort on two keys; instead it will sort on a key composed of the two
// accessors.
// Sorts in ascending order on `accessor1` & `accessor2` (optional).
helpers.array.ascendingOn = function ( accessor1, accessor2 ) {
  if ( accessor2 ) {
    return ( function ( a, b ) {
      return ( a[ accessor1 ][ accessor2 ] > b[ accessor1 ][ accessor2 ] ) ? 1 :
              ( a[ accessor1 ][ accessor2 ] === b[ accessor1 ][ accessor2 ] ) ? 0 : -1;
    } );
  }
  return ( function ( a, b ) {
    return ( a[ accessor1 ] > b[ accessor1 ] ) ? 1 :
            ( a[ accessor1 ] === b[ accessor1 ] ) ? 0 : -1;
  } );
}; // ascendingOn()

// Sorts in descending order on `accessor1` & `accessor2` (optional).
helpers.array.descendingOn = function ( accessor1, accessor2 ) {
  if ( accessor2 ) {
    return ( function ( a, b ) {
      return ( b[ accessor1 ][ accessor2 ] > a[ accessor1 ][ accessor2 ] ) ? 1 :
              ( b[ accessor1 ][ accessor2 ] === a[ accessor1 ][ accessor2 ] ) ? 0 : -1;
    } );
  }
  return ( function ( a, b ) {
    return ( b[ accessor1 ] > a[ accessor1 ] ) ? 1 :
            ( b[ accessor1 ] === a[ accessor1 ] ) ? 0 : -1;
  } );
}; // descendingOn()

// #### pluck

// Plucks specified element from each element of an **array of array**, and
// returns the resultant array. The element is specified by `i` (default `0`) and
// number of elements to pluck are defined by `limit` (default `a.length`).
helpers.array.pluck = function ( a, key, limit ) {
  var k, plucked;
  k = a.length;
  var i = key || 0;
  var lim = limit || k;
  if ( lim > k ) lim = k;
  plucked = new Array( lim );
  for ( k = 0; k < lim; k += 1 ) plucked[ k ] = a[ k ][ i ];
  return plucked;
}; // pluck()

// #### product

// Finds the Cartesian Product of arrays present inside the array `a`. Therefore
// the array `a` must be an array of 1-dimensional arrays. For example,
// `product( [ [ 9, 8 ], [ 1, 2 ] ] )`
// will produce `[ [ 9, 1 ], [ 9, 2 ], [ 8, 1 ], [ 8, 2 ] ]`.
helpers.array.product = function ( a ) {
  return (
    a.reduce( productReducer, [ [] ] )
  );
};

// #### shuffle

// Randomly shuffles the elements of an array and returns the same.
// Reference: Chapter on Random Numbers/Shuffling in Seminumerical algorithms.
// The Art of Computer Programming Volume II by Donald E Kunth
helpers.array.shuffle = function ( array ) {
  var a = array;
  var balance = a.length;
  var candidate;
  var temp;

  while ( balance ) {
    candidate = Math.floor( Math.random() * balance );
    balance -= 1;

    temp = a[ balance ];
    a[ balance ] = a[ candidate ];
    a[ candidate ] = temp;
  }

  return ( a );
};


// ### Object Helpers

var objectKeys = Object.keys;
var objectCreate = Object.create;

helpers.object = Object.create( null );

// #### is Object

// Tests if argument `v` is a JS object; returns `true` if it is, otherwise returns `false`.
helpers.object.isObject = function ( v ) {
  return ( v && ( Object.prototype.toString.call( v ) === '[object Object]' ) ) ? true : false; // eslint-disable-line no-unneeded-ternary

}; // isObject()

// #### keys

// Returns keys of the `obj` in an array.
helpers.object.keys = function ( obj ) {
  return ( objectKeys( obj ) );
}; // keys()

// #### size

// Returns the number of keys of the `obj`.
helpers.object.size = function ( obj ) {
  return ( ( objectKeys( obj ) ).length );
}; // size()

// #### values

// Returns all values from each key/value pair of the `obj` in an array.
helpers.object.values = function ( obj ) {
  var keys = helpers.object.keys( obj );
  var length = keys.length;
  var values = new Array( length );
  for ( var i = 0; i < length; i += 1 ) {
    values[ i ] = obj[ keys[ i ] ];
  }
  return values;
}; // values()

// #### value Freq

// Returns the frequency of each unique value present in the `obj`, where the
// **key** is the *value* and **value** is the *frequency*.
helpers.object.valueFreq = function ( obj ) {
  var keys = helpers.object.keys( obj );
  var length = keys.length;
  var val;
  var vf = objectCreate( null );
  for ( var i = 0; i < length; i += 1 ) {
    val = obj[ keys[ i ] ];
    vf[ val ] = 1 + ( vf[ val ] || 0 );
  }
  return vf;
}; // valueFreq()

// #### table

// Converts the `obj` in to an array of `[ key, value ]` pairs in form of a table.
// Second argument - `f` is optional and it is a function, which is called with
// each `value`.
helpers.object.table = function ( obj, f ) {
  var keys = helpers.object.keys( obj );
  var length = keys.length;
  var pairs = new Array( length );
  var ak, av;
  for ( var i = 0; i < length; i += 1 ) {
    ak = keys[ i ];
    av = obj[ ak ];
    if ( typeof f === 'function' ) f( av );
    pairs[ i ] = [ ak, av ];
  }
  return pairs;
}; // table()

// ### Validation Helpers

helpers.validate = Object.create( null );

// Create aliases for isObject and isArray.
helpers.validate.isObject = helpers.object.isObject;
helpers.validate.isArray = helpers.array.isArray;

// #### isFiniteInteger

// Validates if `n` is a finite integer.
helpers.validate.isFiniteInteger = function ( n ) {
  return (
    ( typeof n === 'number' ) &&
    !isNaN( n ) &&
    isFinite( n ) &&
    ( n === Math.round( n ) )
  );
}; // isFiniteInteger()

// #### isFiniteNumber

// Validates if `n` is a valid number.
helpers.validate.isFiniteNumber = function ( n ) {
  return (
    ( typeof n === 'number' ) &&
    !isNaN( n ) &&
    isFinite( n )
  );
}; // isFiniteNumber()

// ### cross validation
/**
 *
 * Creates an instance of cross validator useful for machine learning tasks.
 *
 * @param {string[]} classLabels - array containing all the class labels.
 * @return {methods} object conatining set of API methods for tasks like evalutaion,
 * reset and metrics generation.
*/
helpers.validate.cross = function ( classLabels ) {
  // wink's const for unknown predictions!
  const unknown = 'unknown';
  // To ensure that metrics is not computed prior to evaluation.
  var evaluated = false;
  // The confusion matrix.
  var cm;
  var precision;
  var recall;
  var fmeasure;

  // The class labels is assigned to this variable.
  var labels;
  // The length of `labels` array.
  var labelCount;
  var labelsObj = Object.create( null );

  // Returned!
  var methods = Object.create( null );


  /**
   *
   * Resets the current instance for another round of evaluation; the class
   * labels defined at instance creation time are not touched.
   *
   * @return {undefined} nothing!
  */
  var reset = function ( ) {
    evaluated = false;
    cm = Object.create( null );
    precision = Object.create( null );
    recall = Object.create( null );
    fmeasure = Object.create( null );

    // Initialize confusion matrix and metrics.
    for ( let i = 0; i < labelCount; i += 1 ) {
      const row = labels[ i ];
      labelsObj[ row ] = true;
      cm[ row ] = Object.create( null );
      precision[ row ] = 0;
      recall[ row ] = 0;
      fmeasure[ row ] = 0;
      for ( let j = 0; j < labelCount; j += 1 ) {
        const col = labels[ j ];
        cm[ row ][ col ] = 0;
      }
    }
  }; // reset()

  /**
   *
   * Creates an instance of cross validator useful for machine learning tasks.
   *
   * @param {string} truth - the actual class label.
   * @param {string} guess - the predicted class label.
   * @return {boolean} returns true if the evaluation is successful. The evaluation
   * may fail if `truth` or `guess` is not in the array `classLabels` provided at
   * instance creation time; or if guess is equal to `unknown`.
  */
  var evaluate = function ( truth, guess ) {
    // If prediction failed then return false!
    if ( guess === unknown || !labelsObj[ truth ] || !labelsObj[ guess ] ) return false;
    // Update confusion matrix.
    if ( guess === truth ) {
      cm[ truth ][ guess ] += 1;
    } else {
      cm[ guess ][ truth ] += 1;
    }
    evaluated = true;
    return true;
  }; // evaluate()

  /**
   *
   * It computes a detailed metrics consisting of macro-averaged precision,
   * recall and f-measure along with their label-wise values and the confusion
   * matrix.
   *
   * @return {object} object containing macro-averaged `avgPrecision`, `avgRecall`,
   * `avgFMeasure` values along with other details such as label-wise values
   * and the confusion matrix. A value of `null` is returned if no evaluate()
   * has been called before.
  */
  var metrics = function ( ) {
    if ( !evaluated ) return null;
    // Numerators for every label; they are same for precision & recall both.
    var n = Object.create( null );
    // Only denominators differs for precision & recall
    var pd = Object.create( null );
    var rd = Object.create( null );
    // `row` and `col` of confusion matrix.
    var col, row;
    var i, j;
    // Macro average values for metrics.
    var avgPrecision = 0;
    var avgRecall = 0;
    var avgFMeasure = 0;

    // Compute label-wise numerators & denominators!
    for ( i = 0; i < labelCount; i += 1 ) {
      row = labels[ i ];
      for ( j = 0; j < labelCount; j += 1 ) {
        col = labels[ j ];
        if ( row === col ) {
          n[ row ] = cm[ row ][ col ];
        }
        pd[ row ] = cm[ row ][ col ] + ( pd[ row ] || 0 );
        rd[ row ] = cm[ col ][ row ] + ( rd[ row ] || 0 );
      }
    }
    // Ready to compute metrics.
    for ( i = 0; i < labelCount; i += 1 ) {
      row = labels[ i ];
      precision[ row ] = +( n[ row ] / pd[ row ] ).toFixed( 4 );
      // NaN can occur if a label has not been encountered.
      if ( isNaN( precision[ row ] ) ) precision[ row ] = 0;

      recall[ row ] = +( n[ row ] / rd[ row ] ).toFixed( 4 );
      if ( isNaN( recall[ row ] ) ) recall[ row ] = 0;

      fmeasure[ row ] = +( 2 * precision[ row ] * recall[ row ] / ( precision[ row ] + recall[ row ] ) ).toFixed( 4 );
      if ( isNaN( fmeasure[ row ] ) ) fmeasure[ row ] = 0;
    }
    // Compute thier averages, note they will be macro avegages.
    for ( i = 0; i < labelCount; i += 1 ) {
      avgPrecision += ( precision[ labels[ i ] ] / labelCount );
      avgRecall += ( recall[ labels[ i ] ] / labelCount );
      avgFMeasure += ( fmeasure[ labels[ i ] ] / labelCount );
    }
    // Return metrics.
    return (
      {
        // Macro-averaged metrics.
        avgPrecision: +avgPrecision.toFixed( 4 ),
        avgRecall: +avgRecall.toFixed( 4 ),
        avgFMeasure: +avgFMeasure.toFixed( 4 ),
        details: {
          // Confusion Matrix.
          confusionMatrix: cm,
          // Label wise metrics details, from those averages were computed.
          precision: precision,
          recall: recall,
          fmeasure: fmeasure
        }
      }
    );
  }; // metrics()

  if ( !helpers.validate.isArray( classLabels ) ) {
    throw Error( 'cross validate: class labels must be an array.' );
  }
  if ( classLabels.length < 2 ) {
    throw Error( 'cross validate: at least 2 class labels are required.' );
  }
  labels = classLabels;
  labelCount = labels.length;

  reset();

  methods.reset = reset;
  methods.evaluate = evaluate;
  methods.metrics = metrics;

  return methods;
}; // cross()

// ### Object Helpers

helpers.string = Object.create( null );

// Regex for [diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks) removal.
var rgxDiacritical = /[\u0300-\u036f]/g;

/**
 *
 * Normalizes the token's value by converting it to lower case and stripping
 * the diacritical marks (if any).
 *
 * @param {string} str — that needs to be normalized.
 * @return {string} the normalized value.
 * @example
 * normalize( 'Nestlé' );
 * // -> nestle
*/
helpers.string.normalize = function ( str ) {
  return (
    str.toLowerCase().normalize( 'NFD' ).replace( rgxDiacritical, '' )
  );
}; // normalize()

module.exports = helpers;

},{}],17:[function(require,module,exports){
//     wink-jaro-distance
//     An Implementation of Jaro Distance Algorithm
//     by Matthew A. Jaro
//
//     Copyright (C) 2017-18  GRAYPE Systems Private Limited
//
//     This file is part of “wink-jaro-distance”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

//
// Because we want to logically group the variables.
/* eslint sort-vars: 0 */

// ### Jaro
/**
 *
 * Computes Jaro distance and similarity between strings `s1` and `s2`.
 *
 * Original Reference: UNIMATCH:
 * [A Record Linkage System: Users Manual pp 104.](https://books.google.co.in/books?id=Ahs9TABe61oC)
 *
 * @param {string} s1 — the first string.
 * @param {string} s2 — the second string.
 * @return {object} - containing `distance` and `similarity` values between 0 and 1.
 *
 * @example
 * jaro( 'daniel', 'danielle' );
 * // -> { distance: 0.08333333333333337, similarity: 0.9166666666666666 }
 * jaro( 'god', 'father' );
 * // -> { distance: 1, similarity: 0 }
 */
var jaro = function ( s1, s2 ) {
  // On the basis of the length of `s1` and `s2`, the shorter length string will
  // be assigned to 'short' (with length as `shortLen`) and longer one will be
  // assigned to `long` (with length as `longLen`).
  var shortLen = s1.length;
  var longLen = s2.length;
  // Early exits!
  if ( s1 === s2 ) return { distance: 0, similarity: 1 };
  if ( !shortLen || !longLen ) return { distance: 1, similarity: 0 };

  // Start with random assignment; will be swapped later if required.
  var short = s1;
  var long = s2;
  // The jaro number of matches & transposes.
  var matches = 0;
  var transposes = 0;
  // The **s**earch **window**.
  var swindow = Math.floor( Math.max( shortLen, longLen ) / 2 ) - 1;
  // All matching characters go into this array in *sequqnce*: important to getProbabilityStats
  // number of transposes.
  var matchedChars = [];
  // Helper variables.
  var i, j;
  var char;
  // Flagged true at locations that contain a match.
  var longMatchedAt;
  // Search window start and end indexes.
  var winStart, winEnd;
  // Returns.
  var smlrty;

  // Time to swap, if required.
  if ( shortLen > longLen ) {
    short = [ long, long = short ][ 0 ];
    shortLen = [ longLen, longLen = shortLen ][ 0 ];
  }

  longMatchedAt = new Array( longLen );
  for ( i = 0; i < longLen; i += 1 ) longMatchedAt[ i ] = false;
  // Determine number of matches: loop thru the `short` and search in `long`
  // string to minimize the time.
  for ( i = 0; i < shortLen; i += 1 ) {
    char = short[ i ];
    winStart = Math.max( i - swindow, 0 );
    winEnd = Math.min( i + swindow + 1, longLen );
    for ( j = winStart; j < winEnd; j += 1 ) {
      if ( ( !longMatchedAt[ j ] ) && ( char === long[ j ] ) ) {
        matches += 1;
        longMatchedAt[ j ] = true;
        matchedChars.push( char );
        break;
      }
    }
  }

  // Determine # of transposes; note `j` is an index into `matchedChars`.
  for ( i = 0, j = 0; j < matches; i += 1 ) {
    if ( longMatchedAt[ i ] ) {
      if ( long[ i ] !== matchedChars[ j ] ) transposes += 1;
      j += 1;
    }
  }
  transposes /= 2;
  // Compute similarity; if no `matches` means similarity is 0!
  smlrty = ( matches === 0 ) ?
            0 :
            ( ( matches / shortLen ) + ( matches / longLen ) + ( ( matches - transposes ) / matches ) ) / 3;
  return {
    distance: 1 - smlrty,
    similarity: smlrty
  };
}; // jaro()

// Export Jaro.
module.exports = jaro;

},{}],18:[function(require,module,exports){
var wink = require('wink-distance');
var cluster = require('hierarchical-clustering');

//set some parameters
var width = 1350;
var radius = width / 2 - 200;
var legendRadius = 90;
var dr = 5;
var smallSize = "17px";
var bigSize = "20px";

// used to assign nodes color by group  
//var color = d3.scale.category20();
var color = d3.scale.ordinal().domain(d3.range(58)).range(["dodgerblue", "pink", "beige", "slategray", "brown", "red", "orange", "khaki", "#CCCCFF", "turquoise", "mediumslateblue", "purple", "hotpink", "mistyrose", "black", "gold", "#e1ad01", "olive", "teal", "wheat", "blue", "green", "yellow", "grey", "darkgreen", "brown", "slateblue", "#A9A9A9", "orange", "mediumvioletred", "silver", "lime", "teal", "navy", "fuchsia", "maroon","seagreen", "cadetblue", "royalblue", "orchid", "lemonchiffon", "#009b7d", "#19e194", "#ff6a4e", "#ffe4b5", "#812d2a", "#c16873", "indigo", "#CCA9B4", "#9b81ba", "#a1666d"]);

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
};

function drawMainArc(thickness, total) {
    return d3.svg.arc()
        .innerRadius(radius - 5 - thickness)
        .outerRadius(radius + thickness)
        .startAngle(function(d) {
            var angle = (+d.partialCount - 0.5) * 2 * Math.PI / total;
            return Math.PI - angle;
        })
        .endAngle(function(d) {
            var angle = (+d.count + d.partialCount - 0.5) * 2 * Math.PI / total;
            return Math.PI - angle;
        });
};

// add legend arcs in the center of the graph                                                                                                            
function drawLegendArc(thickness, total) {
    return d3.svg.arc()
        .innerRadius(legendRadius - thickness)
        .outerRadius(legendRadius + 10 + thickness)
        .startAngle(function(d, i) {
            var angle = - i * 2 * Math.PI / total - Math.PI;
            return angle;
        })
        .endAngle(function(d, i) {
            var angle = - (i + 1) * 2 * Math.PI / total - Math.PI;
            return angle;
        });
};

function drawLegend(legendData, W) {
   var legend = d3.select("svg")
	.selectAll(".arc")
        .data(legendData)
        .enter();
     
    legend.append("svg:path")
	.attr("d", drawMainArc(0, W))
	.attr("class", "arc-path")
        .attr("fill", function(d) { return d.color; }) 	
	.attr("transform", "translate(" + (width/2) + "," + (width/2) + ")")
    //define legend interactivity
	.on("mouseover", function(d) {
	    d3.select(this)
		.attr("d", drawMainArc(3, W));
	    d3.selectAll(".legend-text")
		.filter(function(e) {
		    return e.lang == d.lang;
		})
		.attr("font-weight", "bold")
		.attr("font-size", bigSize);
	    d3.selectAll(".node-text")
		.filter(function(e) {
		    return e.lang == d.lang;
		})
		.attr("font-weight", "bold")
		.attr("font-size", bigSize);
	})
	.on("mouseout", function() {
            d3.select(this)
                .attr("d", drawMainArc(0, W));
	    d3.selectAll(".legend-text")
		.attr("font-weight", "normal")
		.attr("font-size", smallSize);
	    d3.selectAll(".node-text")
                .attr("font-weight", "normal")
		.attr("font-size", smallSize);
        });

    var L = legendData.length;
    legend.append("svg:path")
	.attr("d", drawLegendArc(0, L))
	.attr("class", "legend-arc")
	.attr("fill", function(d) { return d.color })
	.attr("transform", "translate(" + (width/2) + "," + (width/2) + ")")
    //define legend interactivity
	.on("mouseover", function(d) {
	    d3.selectAll(".legend-text")
                .filter(function(e) {
                    return e.lang == d.lang;
                })
                .attr("font-weight", "bold")
		.attr("font-size", bigSize);
	    d3.selectAll(".arc-path")
		.filter(function(e) {
                    return e.lang == d.lang;
                })
                .attr("d", drawMainArc(3, W));
	    d3.selectAll(".node-text")
                .filter(function(e) {
                    return e.lang == d.lang;
                })
                .attr("font-weight", "bold")
		.attr("font-size",  bigSize);
	})
	.on("mouseout", function(d) {
	    d3.selectAll(".legend-text")
                .attr("font-weight", "normal")
		.attr("font-size", smallSize);
	    d3.selectAll(".arc-path")
                .filter(function(e) {
                    return e.lang == d.lang;
                })
                .attr("d", drawMainArc(0, W));
	    d3.selectAll(".node-text")
                  .attr("font-weight", "normal")
		.attr("font-size", smallSize);
        });

    legend.append("text")
	.attr("dy", "0.31em")
	.attr("class", "legend-text")
	.attr("transform", function(d, i) {
	    var angle = 90 - (i + 1/2) * 360 / L;
	    return "translate(" + (width/2) + "," + (width/2) + ")" +
		"rotate(" +  angle + ")" +
		"translate(" + (legendRadius + 10 + 3) + "," + 0 + ")" +
		((angle + 90 > 0) ? "" : "rotate(180)");
	})
	.attr("text-anchor", function(d, i) {	    
	    var angle = 90 - (i + 1/2)  * 360 / L;
	    return (angle + 90 > 0) ? "start" : "end";
	})
	.attr("font-size", smallSize)
	.text(function(d, i) {
	    return d.language;
	})
    //define legend text interactivity
	.on("mouseover", function(d) {
	    d3.select(this)
		.attr("d", drawLegendArc(3, L));
	    d3.select(this)
		.attr("font-weight", "bold");
	    d3.selectAll(".arc-path")
                .filter(function(e) {
                    return e.lang == d.lang;
	        })
                .attr("d", drawMainArc(3, W));
	    d3.selectAll(".node-text")
                .filter(function(e) {
                    return e.lang == d.lang;
                })
                .attr("font-weight", "bold");
	})
	.on("mouseout", function(d) {
            d3.select(this)
		.attr("d", drawLegendArc(0, L));
	    d3.select(this)
                .attr("font-weight", "normal");
	    d3.selectAll(".arc-path")
                .filter(function(e) {
                    return e.lang == d.lang;
	        })
                .attr("d", drawMainArc(0, W));
	    d3.selectAll(".node-text")
                .attr("font-weight", "normal");
        });
};

// Calculates node locations
function circleLayout(nodes) {
    // use to scale node index to theta value
    var scale = d3.scale.linear()
        .domain([0, nodes.length])
        .range([0, 2 * Math.PI]);
    
    // calculate theta for each node
    nodes.forEach(function(d, i) {
        // calculate polar coordinates
        var theta = scale(i);
        var radial = radius - dr;
	
        // convert to cartesian coordinates
        d.x = radial * Math.sin(theta);
        d.y = radial * Math.cos(theta);
	d.theta = 180 * theta/Math.PI;
	d.theta = d.theta > 0 ? d.theta : d.theta + 360;
    });
};

// Draws nodes with tooltips
function drawNodesGivenLinks(nodes, links) {
    var node = d3.select("#plot")
	.selectAll(".node")
        .data(nodes)
        .enter();
    
    var nodeText = node.append("text")
        .attr("dy", "0.31em")
        .attr("class", "node-text")
        .attr("transform", function(d) {
            return "rotate(" + (90 - d.theta) + ")" +
		"translate(" + (radius + 3) + ",0)" +
		((d.theta < 180) ? "" : "rotate(180)");
        })
        .attr("text-anchor", function(d) { return (d.theta < 180) ? "start" : "end"; })
        .attr("font-size", smallSize)
        .text(function(d) { return d.label; });

    nodeText.each(function(d) {
	var tmp = links.filter(function(l) { return l.target.id == d.id; });
        d.parentsLinksId = tmp.map(function(l) { return l.id; })
	    .filter(onlyUnique);
        d.parentsId = tmp.map(function(l) { return l.source.id; })
	    .filter(onlyUnique);
        d.ancestorsLinksId = [];
    });

    var getNodesWithIds = function(ids) {
	var toreturn = [];
	nodeText.each(function(d) {
	    if (ids.includes(d.id))
		toreturn.push(d);
	});
	return toreturn;
    }

    // define ancestorsLinksId, ancestorsId and ancestorsLanguages using iterative approach
    nodeText.each(function(d) {
	//initialize parentsId
	var parentsId = d.parentsId;
	var ids = parentsId;
	d.ancestorsLinksId = d.ancestorsLinksId.concat(d.parentsLinksId);
	do {	    
	    var nextParentsId = [];
	    var parentsNode = getNodesWithIds(parentsId);
	    for (var i of parentsNode) {
		for (var j of i.parentsId) {
		    if (!ids.includes(j)) {
			nextParentsId.push(j);
		    }
		    d.ancestorsLinksId = d.ancestorsLinksId.concat(i.parentsLinksId);
		}
	    }
	    parentsId = nextParentsId.sort().filter(onlyUnique);
	    ids = ids.concat(parentsId);
	} while (parentsId.length > 0);
	
	d.ancestorsLinksId = d.ancestorsLinksId.sort().filter(onlyUnique);

	d.ancestorsId = links.filter(function(e) { return d.ancestorsLinksId.includes(e.id); })
	    .map(function(e) { return [ e.source, e.target ]; })
	    .flat()
	    .map(function(e) { return e.id; })
	    .filter(onlyUnique);
	d.ancestorsLanguages = nodes.filter(function(e) {
	    return d.ancestorsId.includes(e.id);
	})
	    .map(function(e) { return e.lang; })
	    .filter(onlyUnique);
    });

    //define interactivity of node texts
    nodeText.on("mouseover", function(d) {
        d3.selectAll(".link")
            .classed("link-active", function(l) {
                return (typeof d.ancestorsLinksId === "undefined") ? false :
                    d.ancestorsLinksId
                    .includes(l.id);
	    });
        d3.select(this)
            .attr("font-weight", "bold")
	    .attr("font-size", bigSize);
	
	d3.selectAll(".node-text")
	    .filter(function(e) {
		return d.ancestorsId
		    .includes(e.id);
	    })
	    .attr("font-weight", "bold");
	d3.selectAll(".legend-text")
            .filter(function(e) {
	        return d.ancestorsLanguages
		    .includes(e.lang);
                })
            .attr("font-weight", "bold")
	    .attr("font-size", function(e) {
		return (e.lang == d.lang) ? bigSize : smallSize;
	    });
    })
	.on("mouseout", function() {
            d3.selectAll(".node-text")
                .attr("font-weight", "normal");
	    d3.selectAll(".link")
		.classed("link-active", false);
	    d3.select(this)
		.attr("font-size", smallSize);
	    d3.selectAll(".legend-text")
		.attr("font-weight", "normal")
		.attr("font-size", smallSize);
        });
};

// Draws curved edges between nodes
function drawLinksGivenNodes(nodes, links) {    
    d3.select("#plot").selectAll(".link")
        .data(links)
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", function(d){
            var lineData = [
		{
		    x: Math.round(d.target.x),
		    y: Math.round(d.target.y)
		}, {
		    x: Math.round(d.target.x) - Math.round(d.target.x)/8,
		    y: Math.round(d.target.y) - Math.round(d.target.y)/8
		}, 
		{
		    x: Math.round(d.source.x) - Math.round(d.source.x)/8,
		    y: Math.round(d.source.y) - Math.round(d.source.y)/8
		},{
		    x: Math.round(d.source.x),
		    y: Math.round(d.source.y)
		}];
            return `M${lineData[0].x},${lineData[0].y}C${lineData[1].x},${lineData[1].y},${lineData[2].x},${lineData[2].y},${lineData[3].x},${lineData[3].y} `;
        })
	.attr("id", function(d) { return d.id; })
	.attr("stroke", "#888888")
	.on("mouseover", function(d) {
	    d3.selectAll(".node-text")
		.filter(function(e) {
                    return (e.id == d.target.id || e.id == d.source.id);
		})
                .attr("font-weight", "bold");
        })
	.on("mouseout", function(d) {
            d3.selectAll(".node-text")
                .attr("font-weight", "normal");
	});
};

function drawGraph(graph, legend) {
    // create svg image                                                                                                                                  
    var svg = d3.select("body")
        .select("#circle")
        .append("svg")
        .attr("width", width)
        .attr("height", width);
    
    drawLegend(legend, graph.nodes.length);
    
    // create plot area within svg image                                                                                                                
    var plot = svg.append("g")
        .attr("id", "plot")
        .attr("transform", "translate(" + width/2 + ", " + width/2 + ")");
    
    // fix graph links to map to objects instead of indices                                                                                              
    graph.links.forEach(function(d, i) {
        d.source = isNaN(d.source) ? d.source : graph.nodes.filter(function(n) { return n.id == d.source; })[0];
        d.target = isNaN(d.target) ? d.target : graph.nodes.filter(function(n) { return n.id == d.target; })[0];
    });
    
    // calculate node positions                                                                                                                          
    circleLayout(graph.nodes);
    drawLinksGivenNodes(graph.nodes, graph.links);
    drawNodesGivenLinks(graph.nodes, graph.links);
};

var dsv = d3.dsv(";", "text/plain");
dsv("languages.csv", function(languages) {
    d3.json("graph.json", function(graph) {
	//preprocess data
	languages = d3.nest()
            .key(function(d) { return d.iso; })
            .map(languages);
	
	var nestedData = d3.nest()
            .key(function(d) { return d.lang; })
	    .entries(graph.nodes)
	    .map(function(d) {
		return {
		    "key":  d.key,
		    "values": d.values,
		    "year": languages[d.key][0].year
		};
	    })
            .sort(function(a, b) {
		return a.year - b.year;
	    });
	
	graph.nodes = d3.merge(
	    nestedData.map(function(d) { //sort graph.nodes using Jaro-Winkler clustering       
		var words = d.values.map(function(v) { return v.label; });
		var levels = cluster({
		    input: words,
		    distance: wink.string.jaroWinkler, //wink.string.levenshtein    
		    linkage: "complete",
		    minClusters: 1 // only want clusters containing one element    
		});
		var clusters = levels[levels.length - 1].clusters;
		return clusters.map(function (cluster) {
		    return cluster.map(function (index) {
			return d.values[index];
		    })
		})[0];
            })
	);
	
	// define legend   
	var partialCount = 0;
	var legend = nestedData.map(function(d, i) {
            var toreturn = {
		"lang": d.key,
		"language": languages[d.key][0].label,
		"year": languages[d.key][0].year,
		"count": d.values.length,
		"partialCount": partialCount,
		"color": color(i)
            };
            partialCount += toreturn.count;
            return toreturn;
	});

	drawGraph(graph, legend);
    })
});

},{"hierarchical-clustering":1,"wink-distance":15}]},{},[18]);
