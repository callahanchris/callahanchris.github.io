---
layout: post
title: "How to Write an Immediately-Invoked Anonymous Function Expression in JavaScript"
date: 2014-07-24 10:43:07 -0400
comments: true
categories: 
---

Anonymous functions sound mysterious and a bit dangerous, but in fact they are just functions that have not been given a name. In JavaScript, an named function looks like this:

```js
function sayHello() {
  return "Hello!";
}

// => undefined
```

and an anonymous function looks like this:

```js
function() {
  return "Hi, my name is REDACTED";
}

// => SyntaxError: function statement requires a name
```

If you just write an anonymous function out of context like this, you will get a `SyntaxError`, presumably because the JavaScript interpreter has no clue why you defined a function that you can never use because you have no name with which to call it. 

### Calling a Function

To call, or invoke, a function in JavaScript, append parentheses and a semicolon (`();`) to the end of the function, passing arguments into the parentheses when necessary.

```js
// without args
function sayHello() {
  return "Hello world!";
}

sayHello();                   // => "Hello world!"

// with args
function greet( name ) {
  return "Hi " + name + "!";
}

greet( "Chris" );             // => "Hi Chris!"
```

JavaScript provides three good opportunities for storing a function so that you can call it in the future. One is by naming the function as with the `sayHello` and `greet` functions above. 

To store an anonymous function, you can assign the function to a variable:

```js
var sayHello = function() {
  return "Hi, my name is REDACTED";
};

sayHello();

// => "Hi, my name is REDACTED"
```

Note that in this case it is considered best practices to name the function to aid stack traces.

You can also assign an anonymous function to a method of an object:

```js
function Song( title, artist, instrument ) {
  this.title = title;
  this.artist = artist;
  this.instrument = instrument;
}

Song.prototype.play = function() {
  return this.artist + ": " + this.title + " for " + this.instrument;
}

suiteOne = new Song( "Suite #1 in G Major", "Johann Sebastian Bach", "Cello" );
suiteOne.play();

// => "Johann Sebastian Bach: Suite #1 in G Major for Cello"
```

### Enough With All the Names!

There is a way for an anonymous function to have its cake and eat it too. An immediately-invoked function expression, or IIFE (pronounced "iffy"), is a function that executes as soon as it is defined/?????. An IIFE can be named, but does not need to be.

??? Due to a quirk in JavaScript, you can't immediately invoke a function *declaration*.

```js
function() { 
  return "They'll never find me.";
}();

// => SyntaxError: function statement requires a name
```

However, a function *expression* can be immediately invoked. This seems like an arbitrary distinction, but 

```js
// preferred syntax, calling parens on the inside
(function() {
  return "Nice try.";
}());

// => "Nice try."

// also a commonly used syntax
(function() {
  return "That's classified.";
})();

// => "That's classified."
```

The IIFE has become a popular pattern in the JavaScript community in recent years. It can be used to create a "ready doc," ensuring that a web page's JavaScript loads after the HTML has all loaded. Here is an example of an anonymous IIFE used when creating a ready doc with jQuery:

```js
jQuery( document ).ready(function() {
  // great JavaScript code
}());
```

jQuery also provides an additional dose of syntactic sugar by allowing you to express the above code as follows:

```js
$(function() {
  // great JavaScript code
}());
```



* [Ben Alman - The blog post that coined the term IIFE](http://benalman.com/news/2010/11/immediately-invoked-function-expression/)
* [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
* [Crockford on Parens in IIFEs]()
* [jQuery Documentation on `$( document ).ready()`](http://learn.jquery.com/using-jquery-core/document-ready/)







<!--  Semicolons

    Yup.

    // bad
    (function() {
      var name = 'Skywalker'
      return name
    })()

    // good
    (function() {
      var name = 'Skywalker';
      return name;
    })();

    // good (guards against the function becoming an argument when two files with IIFEs are concatenated)
    ;(function() {
      var name = 'Skywalker';
      return name;
    })();
 -->


<!-- Name your functions. This is helpful for stack traces.

// bad
var log = function(msg) {
  console.log(msg);
};

// good
var log = function log(msg) {
  console.log(msg);
};

 -->