---
layout: post
title: "Array Iteration Methods in JavaScript"
date: 2015-01-03 15:55:19 -0500
comments: true
categories: 
---

When I first started learning JavaScript, I went through a number of tutorials that showed how to iterate over collections in an imperative style using a `for` loop:

```javascript
var angLeeMovies = ['Pushing Hands', 'The Wedding Banquet', 'Eat Drink Man Woman'], i;

for (i = 0; i < angLeeMovies.length; i += 1) {
  console.log(angLeeMovies[i] + ' was directed by Ang Lee.');
}

// Pushing Hands was directed by Ang Lee.
// The Wedding Banquet was directed by Ang Lee.
// Eat Drink Man Woman was directed by Ang Lee.
```

Before ES5, this was the best available way to iterate over an array, but now there are a number of more expressive, idiomatic, and functional ways of iterating over JavaScript arrays.

### The Big Three: `map()`, `filter()` & `reduce()`

#### `Array.prototype.map()`

`map()` is the array method I find myself using all the time when writing JavaScript code. The conceit is simple: `map()` takes a callback function as a parameter, calls this function on each item in the array, and returns a new array of the same length as the initial array that contains the resulting values.

```javascript
var angLeeMovies = [
    {title: 'Life of Pi', year: 2012},
    {title: 'Taking Woodstock', year: 2009},
    {title: 'Lust, Caution', year: 2007},
    {title: 'Brokeback Mountain', year: 2005},
    {title: 'Hulk', year: 2003}
  ],
  releaseYears;

releaseYears = angLeeMovies.map(function(movie) {
  return movie.year;
});

console.log(releaseYears); // [2012, 2009, 2007, 2005, 2003]
```

This can be simplified even further by extracting the function and passing it as an argument to `map()`.

```javascript
var angLeeMovies = [ ... ], releaseYears;

function extractYear(movie) {
  return movie.year;
}

releaseYears = angLeeMovies.map(extractYear);

console.log(releaseYears); // [2012, 2009, 2007, 2005, 2003]
```

Here the `movie` parameter is being implicitly passed to the `extractYear()` function, but the behavior is the same as above.

*[MDN Documentation - Array.prototype.map()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map)*

#### `Array.prototype.filter()`

`filter()` is intuitively named: it calls a callback function on each item in an array, filters out items that return a falsy value, and returns a new array with the remaining items (those that the callback returns a truthy value for).

```javascript
var truthyAndFalsy = [-0, 1, 0, 2, undefined, 3, null, 4, "", 5, NaN, 6, false, 7], truthy;

truthy = truthyAndFalsy.filter(function(item) {
  return item;
});

console.log(truthy); // [1, 2, 3, 4, 5, 6, 7]
```

Using the opposite test case, we can see the seven falsy values in JavaScript:

```javascript
var truthyAndFalsy = [ ... ], falsy;

falsy = truthyAndFalsy.filter(function(item) {
  return !item;
});

console.log(falsy); // [-0, 0, undefined, null, "", NaN, false]
```

While 0 being falsy is a "classic JavaScript gotcha", the point remains that `filter()` is a powerful tool for collecting a subset of your data that matches certain criteria.

*[MDN Documentation - Array.prototype.filter()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter)*

#### `Array.prototype.reduce()`

`reduce()` has been the hardest of all FP methods for me to fully embrace, but it can be extremely useful in certain cases. The core idea of `reduce()` is that it iterates over an array and returns exactly one object. The return value is commonly a sum or count of some property of the items in the array, but `reduce()` is quite flexible in what it can produce.

```javascript
var angLeeMovies = [
    {title: 'Brokeback Mountain', bestDirectorOscar: 'won'},
    {title: 'Crouching Tiger, Hidden Dragon', bestDirectorOscar: 'nominated'},
    {title: 'Hulk', bestDirectorOscar: false},
    {title: 'Life of Pi', bestDirectorOscar: 'won'},
    {title: 'The Ice Storm', bestDirectorOscar: false}
  ],
  bestDirectorWins;

bestDirectorWins = angLeeMovies.reduce(function(previousValue, currentValue) {
  return currentValue.bestDirectorOscar === 'won' ? previousValue + 1 : previousValue;
}, 0);

console.log(bestDirectorWins); // 2
```

Here the `previousValue` argument is the accumulator that we increment if Ang Lee won an Oscar for best director for the movie we're iterating over, and the `currentValue` argument is item being iterated over. As there is no `previousValue` when iterating over the first item, we can initialize it to 0 as an optional second parameter to the `reduce()` function.

Though it can seem somewhat esoteric at first, `reduce()` has grown on me significantly in the past few months -- partly because of using MapReduce views in CouchDB views, and partly because of learning more about the benefits of functional programming. It 

*[MDN Documentation - Array.prototype.reduce()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce)*

### Friends of `reduce()`

#### `Array.prototype.reduceRight()`

Having grasped `reduce()`, it is not a far stretch to get `reduceRight()`. Whereas `reduce()` iterates over an array from left to right, `reduceRight()` iterates from right to left. This does not make a difference for the standard sum/count use cases, but it can come in handy for other purposes. For example, if we have an array of Ang Lee movies sorted in reverse chronological order, we could use `reduceRight()` to sort these movies in chronological order by decade.

```javascript
var angLeeMovies = [
    {title: 'Life of Pi', year: 2012},
    {title: 'Brokeback Mountain', year: 2005},
    {title: 'Crouching Tiger, Hidden Dragon', year: 2000},
    {title: 'The Wedding Banquet', year: 1993}
  ],
  moviesByDecade;

function addMovieToDecade(filmography, decade, title) {
  filmography[decade] ? filmography[decade].push(title) : filmography[decade] = [title];
  return filmography;
}

moviesByDecade = angLeeMovies.reduceRight(function(previousValue, currentValue) {
  if (currentValue.year >= 2010) {
    return addMovieToDecade(previousValue, "2010s", currentValue.title);
  } else if (currentValue.year >= 2000) {
    return addMovieToDecade(previousValue, "2000s", currentValue.title);
  } else {
    return addMovieToDecade(previousValue, "1990s", currentValue.title);
  }
}, {});

console.log(moviesByDecade);
// {
//   "1990s": ["The Wedding Banquet"],
//   "2000s": ["Crouching Tiger, Hidden Dragon", "Brokeback Mountain"],
//   "2010s": ["Life of Pi"]
// }
```

*[MDN Documentation - Array.prototype.reduceRight()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight)*

#### `Array.prototype.every()`

`every()` checks to see if all items in an array return a truthy value for the callback function. If they all do, `every()` returns `true`; otherwise, it returns `false`. Given what we know about `reduce()`, it seems like `every()` is achieving a similar purpose: boiling an array down to a single value. It is therefore pretty straightforward to implement our own version of `every()` based on `reduce()`. (Note, this is a simplified version, as `every()` can take an optional `thisArg` argument).

```javascript
Array.prototype.myEvery = function(callback) {
  return this.reduce(function(previousValue, currentValue) {
    return previousValue ? callback(currentValue) : false;
  }, true); // every() returns true for empty arrays
};

[1, 2, 3].myEvery(function(num) { return num < 10; }); // true
[1, 2, 3].myEvery(function(num) { return num < 3; });  // false
[1, 2, 3].myEvery(function(num) { return num < 0; });  // false
```

Unlike my crude implementation, `every()` is optimized to return immediately if a falsy value is returned from the callback. Personally, I haven't used `every()` much -- I prefer to use `map()`, `filter()`, and `reduce()`.

*[MDN Documentation - Array.prototype.every()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every)*

#### `Array.prototype.some()`

Similar to `every()`, `some()` iterates over an array and returns `true` if any items in the array return a truthy value, and `false` if none do. This can also be (again, crudely) expressed in terms of `reduce()`:

```javascript
Array.prototype.mySome = function(callback) {
  return this.reduce(function(previousValue, currentValue) {
    return previousValue || callback(currentValue);
  }, false); // some() returns false for empty arrays
};

[1, 2, 3].mySome(function(num) { return num < 10; }); // true
[1, 2, 3].mySome(function(num) { return num < 3; });  // true
[1, 2, 3].mySome(function(num) { return num < 0; });  // false
```

*[MDN Documentation - Array.prototype.some()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some)*

### A More Expressive `for` Idiom?

#### `Array.prototype.forEach()`

To me, `forEach()` appears to be a direct successor to the `for (i = 0; i < x.length; i += 1) {}` example above. It is a basic iterator that gives you access to one item in an array at a time, and returns `undefined`.

```javascript
var angLeeMovies = [
    {title: 'Brokeback Mountain', bestDirectorOscar: 'won'},
    {title: 'Crouching Tiger, Hidden Dragon', bestDirectorOscar: 'nominated'},
    {title: 'Hulk', bestDirectorOscar: false},
    {title: 'Life of Pi', bestDirectorOscar: 'won'},
    {title: 'The Ice Storm', bestDirectorOscar: false}
  ];

angLeeMovies.forEach(function(movie) {
  if (movie.bestDirectorOscar === 'won') {
    console.log('Ang Lee won an Oscar for best director for "' + movie.title + '"');
  } else if (movie.bestDirectorOscar === 'nominated') {
    console.log('Ang Lee was nominated for an Oscar for best director for "' + movie.title + '"');
  }
});

// Ang Lee won an Oscar for best director for "Brokeback Mountain"
// Ang Lee was nominated for an Oscar for best director for "Crouching Tiger, Hidden Dragon"
// Ang Lee won an Oscar for best director for "Life of Pi"
// undefined
```

Unlike the previous examples, `forEach()` is used to produce ["side effects"](http://en.wikipedia.org/wiki/Side_effect_%28computer_science%29). Practically speaking, because the return value of `forEach()` is always `undefined`, it can only be used to change the state of or interact with other parts of the program. This may seem like a fine distinction to some, but the use of side effects is a hotly contested debate across many programming language communities.

It is worth pointing out that `forEach()` is actually [significantly slower](http://jsperf.com/foreach-vs-loop) than the `for (i = 0; i < x.length; i += 1) {}` idiom. But for most purposes, `forEach()` is a much more expressive way to iterate over collections.

*[MDN Documentation - Array.prototype.forEach()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach)*

### Conclusion

Iterating over arrays is a common task when coding in almost any language, and JavaScript is no exception. The above `Array.prototype` iterators are all defined in the ES5 spec and are widely supported on most modern web browsers (including IE 9 and above). They are relatively straightforward to use and make coding in JavaScript more functional and expressive.

### Resources

* [MDN Array.prototype Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/prototype)
* [Colin Toh - 5 Array Methods That You Should Be Using Now](http://colintoh.com/blog/5-array-methods-that-you-should-use-today)
* [2ality - Iterating over arrays and objects in JavaScript](http://www.2ality.com/2011/04/iterating-over-arrays-and-objects-in.html)