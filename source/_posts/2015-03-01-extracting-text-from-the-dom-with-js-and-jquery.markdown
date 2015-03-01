---
layout: post
title: "Extracting Text From the DOM with JS and jQuery"
date: 2015-03-01 16:09:00 -0500
comments: true
categories: 
---

Recently, I've been doing a lot of HTML and XML parsing. At first this was a bit tricky, but after getting familiar with the DOM API and some of the libraries out there, it turns out it's not so bad!

One really neat thing about working the DOM is that it's a tree data structure. If you're familiar with writing HTML, you might think of HTML as a nested data structure, like so:

```html
<html>
  <head>
    <title>Good Old Fashioned HTML</title>
  </head>
  <body>
    <section>
      <p>
        Four score and seven years ago...
        <span>-- Abraham Lincoln</span>
      </p>
    </section>
  </body>
</html>
```

Thinking of this as a tree gives us a slightly different way of visualizing how the information is connected:

```
                            <html>
                               |
                _______________|________________
                |                              |
                |                              |
             <head>                         <body>
                |                              |
                |                              |
             <title>                       <section>
                |                              |
                |                              |
    "Good Old Fashioned HTML"                 <p>
                                               |
                                   ____________|____________
                                   |                        |
                                   |                        |
                            "Four score and              <span>
                            seven years ago..."             |
                                                            |
                                                  "-- Abraham Lincoln"
```

Trees are a [fundamental data structure](http://en.wikipedia.org/wiki/Tree_(data_structure)) in computer science, and are used in many places such as the DOM. A tree is made up of a set of linked nodes, and the entry point to the tree is referred to as the "root" node. The root node will often have multiple "child" nodes, and so is considered the direct "parent" of these nodes. A child node can constitute the root of its own subtree, having child nodes, grandchild nodes, etc. of its own. (The "family tree" analogy can be extended to things such as "sibling" nodes, "cousin" nodes, etc.) Eventually, you will arrive at the "leaf" of a tree, which is a node that has no children.

### Collecting Text Nodes in JavaScript and the DOM API

Let's say I wanted to collect all of the text nodes from an HTML document using JavaScript and the DOM API. Here's how I might go about doing that.

```js
function extractTextContent($nodes, callback) {
  return text = Array.prototype.map.call($nodes, function($node) {
    return extractText([$node]);
  });
}

function extractText($nodes) {
  return Array.prototype.map.call($nodes, function($node) {
    if ($node.childNodes) {
      return extractText($node.childNodes);
    } else {
      return $node.textContent;
    }
  })
  .join(' ');
}

var textContent = 
```


### Collecting Text Nodes with jQuery/cheerio

[cheerio](https://github.com/cheeriojs/cheerio) is a library that allows you to do HTML manipulation in node.js using the jQuery API. Faced with the same problem as above, here's how I would use cheerio to extract the text from an HTML doc.

```js
function extractText($el) {
  if ($el.get(0).nodeType === 3) {
    return $el.text();
  } else {
    return $el.contents().map(function() {
      return findText($(this));
    })
    .get()
    .join(' ');
  }
}

var textContent = $(querySelector)  // plug in the query selector of choice
                    .contents()     // get all children -- including text and nodes
                    .map(function() {
                      return extractText($(this));  // extract text from the current element
                    })
                    .get();         // return a JavaScript array rather than a jQuery object
```
