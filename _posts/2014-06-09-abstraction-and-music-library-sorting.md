---
layout: post
title: "Abstraction and Music Library Sorting"
date: 2014-06-09 09:41:21 -0400
comments: true
categories: 
redirect_from: "/blog/2014/06/09/abstraction-and-music-library-sorting/"
---

Last week at the Flatiron School, [Avi Flombaum](https://twitter.com/aviflombaum) talked about the merits of abstraction in code. As Avi mentioned, code can become much more idiomatic when it utilizes abstraction instead of relying on specific details.

The Ruby core comes equipped with a whole toolbox of nicely abstracted methods that can be used to write some great and expressive code. This one of the reasons that programmers love to write code in Ruby.

While doing one of the homework labs over the weekend, I realized how much more expressive code can become when many of the lower-level details are abstracted out. As I've become more comfortable programming in Ruby, I've been to make my code more abstract and expressive.

### A Non-Abstract `sort_songs`

In the lab, I was tasked to create a `sort_songs` method that took an array of songs expressed as strings in the format `"Artist - Album - Song"` and returned the same strings in a nested array that grouped songs based on artist and album. In order to pass this lab, the `sort_songs` method had to correctly respond to a set of RSpec tests, which sent a preset array of songs to `sort_songs` and expected the output to be a properly formatted nested array.

On my first crack at this problem I followed the instructions to the letter. I therefore implemented my first `sort_songs` method to respond *exactly* to the preset list of songs included in the test. 

```ruby
def sort_songs(songs)
  sorted_array =  [
                    [
                      []
                    ],
                    [
                      [],
                      []
                    ],
                    [
                      []
                    ]
                  ]

  songs.each do |song|
    artist, album, title = song.split(' - ')
    case artist
    when 'Neutral Milk Hotel'
      sorted_array[0][0] << song
    when 'The Magnetic Fields'
      if album == 'Get Lost'
        sorted_array[1][0] << song
      else
        sorted_array[1][1] << song
      end
    when 'Fun'
      sorted_array[2][0] << song
    end
  end

  sorted_array
end
```

As the instructions to the lab suggested, I initialized an empty array with a nested structure tailored immaculately to the list used in the test. I used the `each` method to iterate over the `songs` array, first splitting it into `artist`, `album`, and `title` variables and discarding the `' - '` through parallel variable assignment. Next I used a `case` statement that funneled the songs into different paths based on the `artist` and (in just one case!) the `album`. Then I used `<<` to shovel each song into its comfortable, premade bed in my well-laid-out `sorted_array`. (Seriously, they look kind of like little beds!)

I didn't feel too great about writing this `case` statement, and doubly so for the `if`/`else` statement nested in one (and only one!) of the cases. The cases are so specific! When writing this I thought to myself, "What if I added just one more pesky song to the list? This whole program would blow up!"

Finally I returned the sorted array. This also didn't sit so well with me, as the method implements an "`each` sandwich," where the `each` iterator is the meat and the bread is the empty `sorted_array` on top and the return of `sorted_array` at the bottom. Ruby has the `map` method (and its alias `collect`) that accomplish this same feat with just one method call.

This code passed the tests, but I wasn't satisfied. And for good reason: this method is totally useless outside the confines of this one test!

I wanted to make something that could take *any* song in the `"Artist - Album - Song"` format and return it in a nested array. But an array is simply not the natural way to conceptualize a music collection. A nested hash, on the other hand, is just right.

### Making a Hash

It helped me to first conceptualize this array:

```ruby
songs = [
  "Neutral Milk Hotel - In An Aeroplane Over the Sea - The King of Carrot Flowers",
  "The Magnetic Fields - Get Lost - You, Me, and the Moon",
  "Fun - Some Nights - Some Nights",
  "The Magnetic Fields - Get Lost - Smoke and Mirrors",
  "The Magnetic Fields - 69 Love Songs - The Book of Love",
  "Fun - Some Nights - We Are Young",
  "The Magnetic Fields - 69 Love Songs - Parades Go By",
  "Fun - Some Nights - Carry On",
  "Neutral Milk Hotel - In An Aeroplane Over the Sea - Holland 1945"
]
```

as this hash:

```ruby
songs = {
  "Neutral Milk Hotel"  => { 
    "In An Aeroplane Over the Sea" => [
      "The King of Carrot Flowers", 
      "Holland 1945"
    ]
  },
  "The Magnetic Fields" => { 
    "Get Lost" => [
      "You, Me, and the Moon",
      "Smoke and Mirrors"
    ], 
    "69 Love Songs" => [
      "The Book of Love",
      "Parades Go By"
    ]
  },
  "Fun" => { 
    "Some Nights" => [
      "Some Nights",
      "We Are Young",
      "Carry On"
    ]
  }
}
```

Using a hash as the data structure in this method seemed to be a more logical choice because it's organized similarly to my own digital music library. At the top level, there is one large music directory (analogous to the `songs` hash) that contains all of the music on my computer. Inside the large music directory, there are a number of smaller directories (the top-level keys in the hash) named after different bands. Each band's directory contains that band's discography (the top-level values in the `songs` hash). I may have one or more albums (the keys in the nested hashes) by a given band, and each album has a tracklist (the values in the nested hashes), which can be expressed as a list of songs (or an array of strings).

The hash is also great because it can be very flexibly extended and it lends itself to creating a more abstract version of this program.

### An Abstract `sort_songs` Method

Here is my improved `sort_songs` method that takes an array of songs and turns it into a hash like the one above:

```ruby
def sort_songs(songs)
  sorted_music_library = {}

  songs.each do |song|
    artist, album, title = song.split(' - ')
    if sorted_music_library[artist].nil? 
      sorted_music_library[artist] = {album => [title]}
    elsif sorted_music_library[artist][album].nil?
      sorted_music_library[artist].merge!(album => [title])
    else
      sorted_music_library[artist][album] << title
    end
  end

  hash_to_array(sorted_music_library)
end
```

This method creates a `sorted_music_library` hash, then iterates over the `songs` array using the `each` method. If the artist is not a key in the hash, the hash is updated to include `artist` as a key with a value of `{ album => [title] }`. If the artist is a key in the hash but the album is not a key in the artist's nested hash, `{ album => [title] }` is added to the artist's nested hash using the destructive `merge!` method. Finally, if the artist and album are already in the `sorted_music_library` hash, the new song `title` is shoveled into the `album`'s array of songs.

Finally, to make the tests pass, I called a separate `hash_to_array` method at the end of the `sort_songs` method that utilizes the `collect` method to drill down into the hash and return a nice, nested array:

```ruby
def hash_to_array(music_library)
  music_library.collect do |artist, discography|
    discography.collect do |album, tracklist|
      tracklist.collect do |song|
        "#{artist} - #{album} - #{tracklist[tracklist.index(song)]}"
      end
    end
  end
end
```

I think this code speaks for itself. That's the power of abstraction: it enables programmers to write more expressive code.

### Results

When the `songs` array is sent to the abstracted `sort_songs` method, it returns the following array that makes the test pass:

```
sort_songs(songs)
=> [
      [
        [
          "Neutral Milk Hotel - In An Aeroplane Over the Sea - The King of Carrot Flowers",
          "Neutral Milk Hotel - In An Aeroplane Over the Sea - Holland 1945"
        ]
      ],
      [
        [
          "The Magnetic Fields - Get Lost - You, Me, and the Moon",
          "The Magnetic Fields - Get Lost - Smoke and Mirrors"
        ],
        [
          "The Magnetic Fields - 69 Love Songs - The Book of Love",
          "The Magnetic Fields - 69 Love Songs - Parades Go By"
        ]
      ],
      [
        [
          "Fun - Some Nights - Some Nights",
          "Fun - Some Nights - We Are Young",
          "Fun - Some Nights - Carry On"
        ]
      ]
    ]
```