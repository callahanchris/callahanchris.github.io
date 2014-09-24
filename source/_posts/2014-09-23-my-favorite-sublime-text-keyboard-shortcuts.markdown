---
layout: post
title: "My Favorite Sublime Text Keyboard Shortcuts"
date: 2014-09-23 20:55:44 -0400
comments: true
categories: 
---

Like many software developers, [Sublime Text](http://www.sublimetext.com/) is my preferred text editor. I do almost all of my coding and blogging in Sublime, and as such there are a few convenient keyboard shortcuts I've picked up along the way. *[Note: All keyboard shortcuts are for the OS X version of Sublime Text 2.02, YMMV.]*

### 1. Command + Enter = New Line Below

Gone are the days of pressing Enter and accidentally cutting a line in half, then having to undo, then having to figure out a way to get the cursor to get to the end of the line before hitting Enter again. This shortcut has saved me a lot of energy -- instead of worrying about where the cursor is on a line when hitting Enter, I only need to make sure that the cursor is on that line. Command + Enter takes care of the rest.

### 2. Command + Shift + Enter = New Line Above

A slight modification of the above, and an insanely useful shortcut. I didn't realize how much I needed this shortcut until I started using it. It's perfect if you write a couple of lines at the top of a file (e.g. a Ruby file)

```ruby
class Dog
end
```
then realize you need to do something above the first line (e.g. require another file).

```ruby
require_relative 'cat'

class Dog
end
```

Zoom up to the top of the page with Command + Up arrow (not a Sublime-specific keyboard shortcut), then hit Command + Shift + Enter, and you're ready to write.

Another great use case of this for writing Ruby code is when you define a method. I will often instinctually write it like this:

```ruby
def fetch(bone)
end
```

and then immediately realize I want to write the body of the method. Command + Shift + Enter has saved me many times here.

### 3. Command + Shift + d = Duplicate Current Line

Very straightforward and very useful. Simply duplicates the line you call the command on and places the new line below.

### 4. Control + Shift + k = Delete Current Line

Also straightforward, and a more efficient version of ["the number one tool for improving code."](https://www.youtube.com/watch?v=9LfmrkyP81M)

### 5. Command + d = Multiple Select of the Same Word

Let's say I'm refactoring my code and I decide to change the name of a method. I could do a global replacement with Command + Shift + f, but if I want to do a more fine-grained change and have more control over exactly what I'm highlighting and editing, I go with Command + d.

What's really cool about this is that Sublime gives you a cursor for each highlighted block of text! That means when you change the highlighted text in what you *think* should be one place, *all* of the highlighted texts change. This is the first demo on the Sublime Text website -- check it out if you haven't yet!

### 6. Command + Highlight Text = Multiple Select of Different Words

This one is similar to the Command + d, but is not restricted to highlighting repetitions of the same text. To get this to work, all you have to do is keep pressing the Command key and highlight different regions of text with the trackpad. As with the previous shortcut, this gets really powerful when combined with other keyboard shortcuts, like copy/paste.

In Ruby, you might be setting several attributes of a class to values from a hash. If the keys of the hash happen to be named the same as the keys of the class's attributes, then there is no need to type these out twice! If you start out with

```ruby
def import_dog_characteristics(hash)
  self.mood
  self.fur_color
  self.favorite_toy
end
```

use Command + d to highlight all instances of `.` in this method, then press the right arrow key so the three cursors are to the left of the attribute's name. Next, use Alt + Shift + right arrow (not a Sublime-specific keyboard shortcut) to highlight the next word (Command + Shift + right arrow also works because the word is at the end of the line here) and copy it using Command + s. Press right arrow again to get to the cursors to the end of each line, type ` = hash[:` (note that Sublime autocloses the bracket!), and hit Command + v to paste in the attributes.

```ruby
def import_dog_characteristics(hash)
  self.name = hash[:name]
  self.fur_color = hash[:fur_color]
  self.favorite_toy = hash[:favorite_toy]
end
```

Now, we could probably do some refactoring here, but that's another blog post!

### 7. Command + Shift + p = Set Syntax Highlighting

This shortcut actually opens up the Command Palette -- a menu that includes a number of things like package controls and preference settings. Enter "ss" when the search bar pops up to jump down to the various "Set Syntax" options. The search functionality in Sublime Text is great at matching fuzzy queries, so if you just type "ssr" then hit Enter, the text in your file will have Ruby's syntax highlighting.

This is awesome if you are just sketching out some ideas in a file that you haven't saved yet (on second thought, you might want to save that file!) or if you're working in a bin or other file that doesn't have an extension.


### 8. Command + t = Find File

Navigation between files can get a bit tricky when in a big project like a Rails app, and it's easy to fall back on using the mouse to click through folders and open new files. Command + t lets you keep your hands on the keys by opening up a search bar to help you find the file you're looking for. As with the previous shortcut, Sublime Text has great fuzzy matching for search queries, so you can find the file you're looking for as easily as possible.

### 9. Alt + Drag Mouse = Select Rectangle with Multiple Cursors

This one is cool, though admittedly I do not use it as often as the above shortcuts. Sometimes you want to get a cursor in the same column on 10 consecutive lines, or you want to select a 3 x 8 rectangle of text. Alt + drag mouse is the right tool for the job here. For this one to work, be sure that no text on the screen is highlighted, then hold Alt down, and finally drag the mouse over the desired text.

### Resources

* [Sublime Text Official Website](http://www.sublimetext.com/)

* [Practice Sublime Text Shortcuts](https://www.shortcutfoo.com/)

* Bonus for Rails developers: [SublimeERB](https://github.com/eddorre/SublimeERB). This plugin makes one of the hardest parts of writing a Rails app (writing ERB tags) a piece of cake.
