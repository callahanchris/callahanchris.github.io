---
layout: post
title: "Abstraction and Music Library Sorting"
date: 2014-06-08 01:39:55 -0400
comments: true
categories: 
---

This week at the Flatiron School, Avi has talked about the idea of abstraction in code on a number of occasions, focusing on how essential it is to great code. This is something that I have been noticing more and more the more I write code. To keep code as DRY (don't repeat yourself) and non-repetitive as possible. After going through the Flatiron prework and finishing the first week of class, I have realized that I have gained more of a sense of how to make concise code. In particular, there is now an alarm that goes off in my head any time I see code that has anything repeated.

Code can be written more expressively when it is abstracted out from the lower-level details.

Keeping an eye out for any repetition in code can lead to opportunities for refactoring. For example, if there's an array or string that is used multiple times, this is a good candidate for putting in a variable. If there are multiple symbols that need to be converted into nicely formatted strings, the series of method passed to the symbol could be factored out into its ownmore abstract method.

The focus on abstraction is one of the things that makes Ruby a language that programmers love to write code in. The Ruby core comes with a whole toolbox of nicely abstracted methods that can be used to write some great and expressive code.

I am proud to say that I have been able to implement more and more abstraction into my code the more comfortable I get with programming in Ruby.

In a homework lab this weekend, I was tasked to create a sort_songs method that took an array of songs expressed as strings in the format "Artist - Album - Song" and returned the same strings in a nested array that grouped songs based on album and artist. In order to pass this lab, the sort_songs method had to correctly respond to a set of Rspec tests, which sent a preset array of songs to the method and expected the output to be a properly formatted nested array.

My first crack at this problem took the instructions and the tests very literally. I therefore implemented the method to respond *exactly* to the preset list of songs in the test. 

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

As the instructions to the lab suggested, I initialized an empty array with a nested structure tailored immaculately to the list used in the test. Using the each method, I then iterated over the array of songs, splitting it into artist, album, and title variables and discarding the ' - ' in one step.

Next I used a case statement that funneled the songs into different paths based on the artist and (in just one case!) the album, and then shoveling it into its comfortable, premade bed in my well-laid-out array. (Seriously, they look kind of like little beds!)

I didn't feel too great about writing this case statement, and doubly so for the if/else statement nested in one (and only one) of the cases. They are so specific! When writing this I thought to myself, "What if I added just one more pesky song to the list? This whole program would blow up!"

Finally I returned the sorted array. This also didn't sit so well with me, as the method implements an "each sandwich," where the each iterator is the meat and the bread is the empty array on top and the array return at the bottom. Ruby has the collect and map methods (aliases of one another CHECK) that accomplish this feat with just one method call.

This code passed the tests, but it didn't sit right with me. I thought back to Avi's lectures this week about abstraction, to Grace Hopper and COBOL, to Matz and Ruby, and realized I couldn't let this code stand. Also, practically speaking, this method is useless outside the confines of this one test.

I wanted to make something that could take ANY song in the given formatting and return it in a nested array. But an array is simply not the natural way to conceptualize a music collection. A nested hash, on the other hand, is just right.

It helped me to first conceptualize this array:

```ruby
[
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
{
  :"Neutral Milk Hotel"  => { :"In An Aeroplane Over the Sea" => ["The King of Carrot Flowers", "Holland 1945"] },
  :"The Magnetic Fields" => { :"Get Lost"                     => ["You, Me, and the Moon", "Smoke and Mirrors"], 
                              :"69 Love Songs"                => ["The Book of Love", "Parades Go By"]
                            },
  :"Fun"                 => { :"Some Nights"                  => ["Some Nights", "We Are Young", "Carry On"] }
}
```

I think the hash seemed more logical to me as a data structure because it's similar my music collection. At the top level, there is one large music directory (analogous to this hash) that contains all of the music on my computer. Inside the large directory, there are a number of smaller directories (the top-level keys in the hash) named after different bands. Each band's directory contains that band's discography (the top-level values in the hash). I may have one or more albums (the keys in the inner hash) put out by a given band, and each album has a tracklist (the values in the inner hash), which can be expressed as a list of songs (the array of strings).

Here is my improved sort_songs method that takes an array of songs and turns it into a hash like the one above:

```ruby
def sort_songs(songs)
  sorted_music_library = {}

  songs.each do |song|
    artist, album, title = song.split(' - ')
    if sorted_music_library[artist.to_sym].nil? 
      sorted_music_library[artist.to_sym] = {album.to_sym => [title]}
    elsif sorted_music_library[artist.to_sym][album.to_sym].nil?
      sorted_music_library[artist.to_sym].merge!(album.to_sym => [title])
    else
      sorted_music_library[artist.to_sym][album.to_sym] << title
    end
  end

  hash_to_array(sorted_music_library)
end
```

The hash is also great because it can be easily extended almost infinitely. It's use of symbols for artists and albums makes sorting easier because symbols in Ruby are fixed objects, similar to integers. Two identical strings, on the other hand, may appear to be the same thing, but are treated as different objects in Ruby. Using symbols is also intuitive in this case because most music artists have unique names, and they seldom release more than one album with the same title. (Note: I am not sure if using quotation marks in symbols is standard in Ruby, this is something I should look into. The way I wrote it does make it very easy to convert from a symbol to a string though!)

Finally, to make the tests pass, I implemented a separate hash_to_array method that utilizes the collect method to drill down into the hash and return a nice, nested array:

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

I think this code speaks for itself. That's the power of abstraction: making code expressive.