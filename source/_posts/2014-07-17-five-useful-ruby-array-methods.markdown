---
layout: post
title: "Five Useful Ruby Array Methods"
date: 2014-07-17 13:25:34 -0400
comments: true
categories: 
---

Arrays are a versatile and reliable data structure. The `Array` class in Ruby comes equipped with a number of extremely useful instance methods, including `pop`, `push`, `shift`, `unshift`, `length`, `reverse`, etc. With the `Enumerable` module mixin, Ruby arrays have access to even more iterators and other fun methods.

Here are five great instance methods built in to Ruby's `Array` class that I've come across recently.

### `Array#transpose`

This is probably the fanciest method on this list. It is used to "reflect" an array across a diagonal axis. Wikipedia has a good explanation of [matrix transposition](http://en.wikipedia.org/wiki/Transpose), including this handy gif:

![transpose](http://upload.wikimedia.org/wikipedia/commons/e/e4/Matrix_transpose.gif)

Here is how the `transpose` method looks in Ruby:

```ruby
array = [
          [ "a",  "b",  "c",  "d",   "e"  ],
          [  1,    2,    3,    4,     5   ],
          ["cat","dog","cow","pig","horse"]
        ]

array.transpose
#    => [
#         ["a", 1,  "cat" ],
#         ["b", 2,  "dog" ],
#         ["c", 3,  "cow" ],
#         ["d", 4,  "pig" ], 
#         ["e", 5, "horse"]
#       ]
```

Note that `transpose` can only be used when you have an array of arrays where all of the nested arrays are the same length.

I got some use out of the `transpose` method when trying to rotate an array of arrays (a tic tac toe board) 90 degrees to the right. I first called `transpose` on the array and then chained on `map(&:reverse)` to individually reverse each of the nested arrays.

```ruby
board = [
          ["O", " ", "X"],
          ["X", "X", "O"],
          ["O", "X", " "]
        ]

rotated_board = board.transpose.map(&:reverse)
#    => [
#         ["O", "X", "O"],
#         ["X", "X", " "],
#         [" ", "O", "X"]
#       ]
```

With access to both a `board` and a `rotated_board`, I was able to easily reuse methods in my tic tac toe game.

### `Array#fill`

`fill` does just what it says: it fills every element in an array with the argument passed to it.

```ruby
%w{ a b c }.fill("Hello world!")
# => ["Hello world!", "Hello world!", "Hello world!"]
```

You can also pass a starting index and a length as arguments to `fill`:

```ruby
%w{ an array full of words and things }.fill("surprises", 4, 3)
# => ["an", "array", "full", "of", "surprises", "surprises", "surprises"]
```

You can even pass a block to `fill`, which yields the array's index as the block argument. Ruby is awesome!

```ruby
%w{ hello world my name is chris }.fill {|i| i * i }
# => [0, 1, 4, 9, 16, 25]
```

Warning: `fill` is a destructive method. Once an array is `fill`ed, the old data is permanently gone.

### `Array#permutation`

This method returns all permutations of the array it is sent to. If no block is used, then by default Ruby returns an `Enumerator` object, so it is useful to chain the `to_a` method on the end in order to return an array.

```ruby
[1, 2, 3].permutation
# => #<Enumerator: [1, 2, 3]:permutation>

[1, 2, 3].permutation.to_a
# => [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]
```

This method sounds a bit esoteric, but I have used it in practice when trying to find all possible anagrams of a string.

```ruby
all_permutations = "listen".split('').permutation.map {|letters| letters.join('') }
# => ["listen",
#     "listne",
#     "lisetn",
#     ... 716 more permutations! ...
#     "netsil"]

all_permutations.include?("silent")
# => true

all_permutations.include?("lentils")
# => false
```

### `Array#sample`

`sample` is a convenient way to randomly select one or more elements from an array. If you do not pass an argument to `sample`, it will return one object from the array. If you pass a number as an argument to `sample`, it will return an array including the number of elements specified.

```ruby
%w{ cat dog pig pigeon dolphin walrus }.sample
# => "pigeon"

%w{ cat dog pig pigeon dolphin walrus }.sample
# => "dolphin"

%w{ cat dog pig pigeon dolphin walrus }.sample(2)
# => ["cat", "pigeon"]
```

### `Array#flatten`

This is probably the method I use the most on this list. When doing nested iteration in Ruby, you often end up with an array of arrays. If you want to compare each element in the larger array, you will be confounded by the fact that Ruby tries to compare the nested arrays with each other, rather than the values within these arrays.

To get around this problem, the `flatten` method turns a nested array into an array one level deep.

```ruby
[[1, 2], [3, [4]], [[[5]]]].flatten
# => [1, 2, 3, 4, 5]
```

This method is not destructive (though it does have a destructive counterpart in `flatten!`), so it is mainly useful if you want to perform a specific operation on a flattened array. For example, if you wind up with a nested array after performing multiple `collects` and then want to perform an operation on the array, `flatten` can come in handy.

```ruby
dogs = [[#<Dog:0x00000101d52a30 @name="Fido">,
         #<Dog:0x00000101d01f90 @name="Fredo">,
         #<Dog:0x00000101ae2098 @name="Freida">,
         #<Dog:0x00000106187548 @name="Francis">,
         #<Dog:0x0000010615d630 @name="Bailey">]]

dogs.sort_by(&:name)
# => NoMethodError: undefined method `name' for #<Array:0x00000101ee5b18>

dogs.flatten.sort_by(&:name)
# => [#<Dog:0x0000010615d630 @name="Bailey">,
#     #<Dog:0x00000101d52a30 @name="Fido">,
#     #<Dog:0x00000106187548 @name="Francis">,
#     #<Dog:0x00000101d01f90 @name="Fredo">,
#     #<Dog:0x00000101ae2098 @name="Freida">]
```

`flatten` also takes an argument to specify how many levels to flatten the nested array by.

```ruby
[[[1], 2]].flatten(1)
#=> [[1], 2]
```

I'm not sure how useful passing in an argument is, as I have only used `flatten` without an argument in practice.

### Closing Thoughts

Arrays are an interesting Ruby class with a surprising amount of useful builtin methods. Read the Ruby documentation for more info and more unique methods to play around with.

* [Ruby Doc - Array](http://www.ruby-doc.org/core-2.1.2/Array.html)
