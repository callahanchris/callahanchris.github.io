---
layout: post
title: "Lessons From Refactoring Tic Tac Toe"
date: 2014-07-10 18:02:50 -0400
comments: true
categories: 
---

As part of my application to the Flatiron School in January of this year, I had to write a tic tac toe computer program. The assignment was purposely left vague; it was up to me to decide what programming language to use, how complex it was, whether it was one-player or two-player, etc.

After four or five days of unchecked obsession (fueled in part by my fiancee's invaluable bug-spotting abilities), I emerged with 438 lines of Ruby code and a working one-player version of tic tac toe that could be played on the command line. It was ugly, but it worked.

Six months later, as I near the halfway point in the web development course at the Flatiron School, I decided to apply my new programming knowledge by refactoring the code of my old tic tac toe game.

In the end, I threw out about 95% of my original code. It was painful to do this, but through the pain, I learned some valuable lessons.

### Make Smaller Methods

Small methods are the bedrock of semantic, abstract, and reusable code. Until reading [POODR](http://www.poodr.com/) and listening to [Avi Flombaum's](https://twitter.com/aviflombaum) lectures, I had no clue about the value of the single responsibility principle. When applied to methods, the single responsibility principle means making methods that accomplish only one purpose. A good litmus test is to ask: "What does this method do?" If there are any "and"s or "or"s in the response, the method might be shouldering multiple responsibilities.

Aside of making your code more readable and consise, breaking methods down to smaller and smaller units has an additional (and unexpected) benefit: the emergence of seredipitous recombinations. After breaking down methods into atomic units, you often find that you are able to reuse these methods in contexts outside of that in which you originally designed the method.

It was awesome being able to apply these ideas to my tic tac toe game. I feel much more confident using smaller methods now.

Here is an example from my original tic tac toe game of the `empty_spaces` method that determines how many empty spaces are left on the board. [*Warning: I really did not know how to code when I wrote this program. Just be thankful I'm not pasting in the 160(!) line method I had in the original program.*]

```ruby
def empty_spaces
  # Check to see how many empty spaces are left on the board
  @empty_spaces = 0
  
  # Convert the @tttboard variable array a standard array for quick check
  ttt = [@tttboard[0][0],@tttboard[0][1],@tttboard[0][2],@tttboard[1][0],@tttboard[1][1],@tttboard[1][2],@tttboard[2][0],@tttboard[2][1],@tttboard[2][2]]
  
  ttt.each do |x|
    if x == ' '
      @empty_spaces += 1
    end
  end
  
  @empty_spaces
end
```

and here is the refactored version:
```ruby
def empty_spaces
  board.flatten.count(' ')
end
```

One line methods are awesome! The new implementation of `empty_spaces` is significantly more readable and easier to understand than the original one. It utilizes the reader method provided by `attr_reader :board` rather than directly accessing the data `@board` instance variable, making the code more open to easy changes going forward.

After DRYing up my methods, I had to take on a larger design issue: classes.

### Make Smaller Classes

>"Applications that are easy to change consist of classes that are easy to reuse. Reusable classes are pluggable units of well-defined behavior that have few entanglements. An application that is easy to change is like a box of building blocks; you can select just the pieces you need and assemble them in unanticipated ways."
*-- Practical Object-Oriented Design in Ruby, page 21*

I didn't understand the purpose of classes back in January when I first wrote my tic tac toe implementation. This partially explains why I originally only included one class (`TicTacToe`) that stood at a monstrous 405 lines -- a veritable God object towering over my codebase.

I am still far from mastering the principles of object-oriented design, but I have come a long way over the last few months, thanks largely to *POODR* and *The Well-Grounded Rubyist*. One of the most important things I've learned along the way is to not be afraid of classes. Watching tech talks by Sandi Metz, Ben Orenstein, and others showed me that the single responsibility principle also applies to classes.

My new tic tac toe codebase has 9 classes, all of which sit inside of the `TTT` module. The stubbed out class hierarchy in my program now vaguely looks like this:

`
module TTT            #=> namespace and home to the constant BOARD
|
--class Game          #=> initializes new Human and Computer objects
|
--class CLIRunner     #=> responsible for running the game via CLI
|
--class CheckWinner   #=> checks if the game has been won
|
--class Human         #=> defines the ground rules for human moves
|
--class Computer      #=> delegates the computer's AI logic to subclasses
  |
  --class Opener      #=> makes opening moves for the computer
  |
  --class Winner      #=> makes winning moves for the computer
  | |
  | --class Blocker   #=> piggybacks off of the Winner class's logic to
  |                   #=> block potential wins by the human player
  |
  --class RandomMover #=> moves randomly if the above strategies fail
`

It is abundantly clear now what each class does. Here is the computer's original logic for blocking a human from winning, which was imbedded inside of the 160 line `computer` method:

```ruby
# The computer blocks the human player if it does not have a winning move
# Computer blocks against human's diagonal wins
elsif @tttboard[1][1] == "#{@player}" && @tttboard[2][2] == "#{@player}" && @tttboard[0][0] == ' '
  @tttboard[0][0] = "#{@opponent}"
elsif @tttboard[0][0] == "#{@player}" && @tttboard[2][2] == "#{@player}" && @tttboard[1][1] == ' '
  @tttboard[1][1] = "#{@opponent}"
elsif @tttboard[0][0] == "#{@player}" && @tttboard[1][1] == "#{@player}" && @tttboard[2][2] == ' '
  @tttboard[2][2] = "#{@opponent}"
elsif @tttboard[1][1] == "#{@player}" && @tttboard[2][0] == "#{@player}" && @tttboard[0][2] == ' '
  @tttboard[0][2] = "#{@opponent}"
elsif @tttboard[0][2] == "#{@player}" && @tttboard[2][0] == "#{@player}" && @tttboard[1][1] == ' '
  @tttboard[1][1] = "#{@opponent}"
elsif @tttboard[0][2] == "#{@player}" && @tttboard[1][1] == "#{@player}" && @tttboard[2][0] == ' '
  @tttboard[2][0] = "#{@opponent}"

# Computer blocks against human's horizontal wins
elsif @tttboard[0][1] == "#{@player}" && @tttboard[0][2] == "#{@player}" && @tttboard[0][0] == ' '
  @tttboard[0][0] = "#{@opponent}"
# ...10 more lines of code...

# Computer blocks against human's vertical wins
elsif @tttboard[1][0] == "#{@player}" && @tttboard[2][0] == "#{@player}" && @tttboard[0][0] == ' '
  @tttboard[0][0] = "#{@opponent}"
# ...10 more lines of code...
```

and the new implementation of the `Blocker` class:

```ruby
class Blocker < TTT::Computer::Winner
  def potential_wins
    [opponent, opponent, ' '].permutation.to_a.uniq
  end

  def can_block?
    can_win?
  end
end

```

While the original version hard coded the lookup process on the board and manually altered the data of each square in the `@tttboard` array, the `Blocker` class by contrast seems almost empty. `Blocker` inherits from the `Winner` class, which implements the logic of finding `potential_wins` and filling in the `piece` ("X" or "O") of the computer in the empty space. The `Winner` class has methods like the following:

```ruby
def can_win_horiz?
  potential_wins.any? do |pot_win|
    board.include?(pot_win)
  end
end
```

which determines if there are any potential wins for the computer horizontally. Another method `horiz_win` in the `Winner` class then uses the `update_board` method inherited from the `Computer` class to fill in the tic tac toe board with the computer's move.

```ruby
def update_board(row, col)
  TTT::BOARD[row][col] = piece if TTT::BOARD[row][col] == ' '
end
```

The `Blocker` class has access to all of the methods of the `Winner` class. `Blocker` is essentially solving the same puzzle as `Winner`, but instead of solving for *computer* wins, it is solving for *human* wins. Therefore, all I really needed to change was the `potential_wins` method, plugging in `opponent` (indicating the human's "X" or "O" piece). This overwrote `Winner`'s implementation of this method:

```ruby
def potential_wins
  [piece, piece, ' '].permutation.to_a.uniq
end
```

### Make Reusable Code

This is the overarching lesson I learned in the process of refactoring my tic tac toe code. Writing the original tic tac toe implementation was painful -- not only because I didn't really understand how to code at the time, but also because the code I wrote was extremely resistant to change. My new implementation of tic tac toe, on the other hand, relies more on abstractions and is significantly more open to the possibility of change in the future.

Take, for example, the `Computer` class's `move` algorithm:

```ruby
def move
  if empty_spaces > 7
    opener.move
  elsif winner.can_win?
    winner.move
  elsif blocker.can_block?
    blocker.move
  else
    random_mover.move
  end
end
```

But what if I want to make the computer smarter and decide to implement a way for the computer to recognize opportunities to create a fork? In my original implementation, the cost of adding such a feature was simply too high. Not only would I be afraid of breaking my existing code, but I'd also have to hardcode every single permutation possible -- something I now know is avoidable.

Instead, with the new code, I could make a `Forker` class that inherits from `Computer`. The most significant change I'd have to make to `Computer` to accomplish this would be:

```ruby
def move
  if empty_spaces > 7
    opener.move
  elsif winner.can_win?
    winner.move
  elsif blocker.can_block?
    blocker.move
  elsif forker.can_fork?
    forker.move
  else
    random_mover.move
  end
end
```

By extension, making a `ForkBlocker` class would be equally easy to accomplish.

There are many other ways that my tic tac toe codebase can be easily expanded upon now. I could make the game a 4x4 or 5x5 grid instead of a 3x3 grid with ease. I don't even want to think about how many hours and keystrokes it would take to accomplish in the original implementation.

### Going Forward

Another direction I want to take this project in is bringing tic tac toe to the Internet! I have a basic grasp of the Sinatra and Ruby on Rails web application frameworks, and now that I have tic tac toe running on the command line, the next logical step is figuring out how to deploy it on the web. This could bring about some new and interesting challenges like how to integrate JavaScript and jQuery into the app. I know very little about these technologies but am excited to learn more!

### Links/Resources

[Sandi Metz - All the Little Things (RailsConf 2014)](https://www.youtube.com/watch?v=8bZh5LMaSmE)
[Practical Object-Oriented Design in Ruby (POODR)](http://www.poodr.com/)
[Sandi Metz on the Ruby Rogues podcast](http://rubyrogues.com/087-rr-book-clubpractical-object-oriented-design-in-ruby-with-sandi-metz/)
[Ben Orenstein - Refactoring from Good to Great (Aloha Ruby Conf 2012)](https://www.youtube.com/watch?v=DC-pQPq0acs)
[David Heinemeier Hansson - Writing Software (RailsConf 2014)](https://www.youtube.com/watch?v=9LfmrkyP81M)
[The Well-Grounded Rubyist](http://www.manning.com/black3/)
