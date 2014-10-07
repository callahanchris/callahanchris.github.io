---
layout: post
title: "Behind the Scenes of ActiveRecord Associations"
date: 2014-10-07 12:17:01 -0400
comments: true
categories: 
---

In *The Rails 4 Way*, Obie Fernandez describes what happens when you "wire up" associations (like `has_many` and `belongs_to`) between ActiveRecord models:

> When these relationship declarations are executed, Rails uses some metaprogramming magic to dynamically add code to your models. In particular, proxy collection objects are created that let you manipulate the relationship easily.

> -- The Rails 4 Way, page 181

What exactly is this "metaprogramming magic" that goes on behind the scenes? In this blog post, I hope to uncover exactly what happens when you use `has_many` and `belongs_to` in your ActiveRecord models.

### Diving into the Source Code

Going through the Rails source code has always been a bit intimidating for me. There really is a lot of "metaprogramming magic" going on behind the scenes, and as a beginner it can be pretty tough to understand what is going on. It is all written in Ruby, which I feel reasonably comfortable with, but I am a total noob when it comes to metaprogramming, which is a lot of what goes on in the Rails source code.

As in this case, I try not to feel too bad about it -- after all, I've only been coding for about six months, and Rails has been constantly developed over the last ten years by some of the best programmers out there.

My first step in the process was to go the source: [the Rails source code](https://github.com/rails/rails), that is. I cloned the master branch down to my computer, and started digging in.

```bash
git clone git@github.com:rails/rails.git
```

I actually started to feel differently about the code once it was on my local machine. Suddenly I felt as though I had more control over it, just as I would with any other Ruby files open in Sublime Text on my computer. Rather than getting distracted by the prestige and sheer magnitude of the Rails codebase, I started with what I know, and worked my way out from there.

### Starting With What I Know

If *Game of Thrones* is our domain model here, let's say that I have two classes, `House` and `Character`, both of which inherit from `ActiveRecord::Base`. I'd wire up the associations between these classes as such:

```ruby
class House < ActiveRecord::Base
  has_many :characters
end

class Character < ActiveRecord::Base
  belongs_to :house
end
```

This domain logic makes sense; in the *Song of Ice and Fire* books, characters often introduce themselves in the fashion "I am Arya of House Stark." Arya can be said to *belong to* House Stark, while House Stark can be said to *have many* characters (a collection, if you will) associated with it.

Starting with the `House` class, here's what I know:

* There is a `House` class.

* The `House` class inherits from `ActiveRecord::Base`, thereby giving the `House` access to a number of methods defined in the numerous modules included in the `ActiveRecord::Base` class.

* An Active Record model is automatically mapped to a table in the database (in this case `houses`), and attributes (generally in the form of `attr_accessor`s??????????) are created in the model for each column in the corresponding database table. Each instance of a model similarly "wraps" one row in this table. This is one of the big wins of Rails's adaptation of the Active Record pattern -- database logic is effectively encapsulated into methods on the model layer.

* `has_many` is a "bareword". In Ruby, barewords can only be local variables, method parameters, keywords (like `class`, `def`, and `end), and method calls. In this context, it's neither a local variable nor a method parameter, and it's certainly not a keyword. Therefore it must be a method.

* If `has_many` is a method, then in this context its receiver must be the `House` class. That makes `has_many` a class method. It could also be written as `self.has_many`, but the receiver is implicit here so we don't need to write `self`.

* It then follows that `:characters` is a method argument passed to the `has_many` method. Ruby allows you to leave off the parentheses surrounding method arguments, though it is generally good practice to keep the parentheses in when defining a method with arguments.

Given the above conclusions, we could translate this code to the following:

```ruby
House = Class.new(ActiveRecord::Base).has_many(:characters)
```

But we probably don't want to do this! The original way is way more readable, conventional, and extensible.

Knowing that `has_many` is a class method defined somewhere in ActiveRecord helped a lot to narrow things down. From here, it was very easy to track the method definition down by doing a global search for `def has_many` on the codebase using Command + Shift + f in Sublime Text! Only one result appeared -- a two-line method on line 1245 of the `rails/activerecord/lib/active_record/associations.rb` file ([github](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations.rb#L1245)), fittingly located inside the `ActiveRecord::Associations::ClassMethods` module:

```ruby
def has_many(name, scope = nil, options = {}, &extension)
  reflection = Builder::HasMany.build(self, name, scope, options, &extension)
  Reflection.add_reflection self, name, reflection
end
```

### Taking it One Line at a Time

The `has_many` method signature is actually quite straightforward. Also, there is a copious amount (~200 lines) of documentation directly above the method definition that describes what `has_many` is, gives examples of how to use it, details the methods that are added when a `has_many` association is declared, and describes what all of the method arguments it takes are.

Here's a quick rundown of the arguments that `has_many` can take:

* `name`: The only required method argument here. The name takes the plural form and references a collection embodied by another class. In our case, `:characters` is passed in as the `name` parameter. This makes sense; it collection refers to multiple instances of the `Character` class (or rows of the `characters` table in the database) that we want to associate to one instance of the `House` class.

* `scope`: Defaults to `nil`. A scope must be an object with a `call` method, so `lambda`s are generally used here. Scopes can help you narrow in on a more targeted set of records to retrieve from the database. In our example, if we only wanted to retrieve living characters associated with a particular house, we'd use the following scope:

```ruby
class House < ActiveRecord::Base
  has_many :characters, -> { where(deceased: false) }
end
```

(Though this might get complicated when dealing with the Iron Islands...)

* `options`: Defaults to an empty hash. Here you can further customize the nature of the association. Some common options to pass here are `through: :join_table`, `dependent: :destroy`, `polymorphic: true`, and `foreign_key: :uuid`.

* `&extension`: Explicit block argument, as indicated by the ampersand. I have never used this before, but the comments suggest that association extensions are "useful for adding new finders, creators and other factory-type methods to be used as part of the association."

To figure out the next line, I first tracked down the `Builder::HasMany` class, which is quite slim, containing just three one-line methods! Unfortunately, `build` is not one of these methods. I traversed up the inheritance hierarchy, from `Builder::HasMany` to `Builder::CollectionAssociation` and finally to `Builder::Association` (located in the `rails/activerecord/lib/active_record/associations/builder/association.rb` file) where the class method `build` is defined ([github](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations/builder/association.rb#L28)).

```ruby
def self.build(model, name, scope, options, &block)
  if model.dangerous_attribute_method?(name)
    raise ArgumentError, "You tried to define an association named #{name} on the model #{model.name}, but " \
                         "this will conflict with a method #{name} already defined by Active Record. " \
                         "Please choose a different association name."
  end

  builder = create_builder model, name, scope, options, &block
  reflection = builder.build(model)
  define_accessors model, reflection
  define_callbacks model, reflection
  define_validations model, reflection
  builder.define_extensions model
  reflection
end
```

I had hit the motherload.

### Locating the "Metaprogramming Magic"

Before finishing off the `has_many` method call, I first want to stay in the `Builder::Association` class. Back in the original `has_many` method call, 

```ruby
def has_many(name, scope = nil, options = {}, &extension)
  reflection = Builder::HasMany.build(self, name, scope, options, &extension)
  Reflection.add_reflection self, name, reflection
end
```

Before I could figure out what was happening in the `Builder::Association::build` method, I had to figure out what exactly `self` was referring to on this line. I noticed that this method was being called with 5 parameters -- 4 which were directly passed on from the initial calling of `has_many`, and one additional parameter. In `build`'s method signature, this method argument is referred to as `model`, and the value passed to it inside the `has_many` method is `self`.

Given that the context of the `has_many` method is inside the `ActiveRecord::Associations::ClassMethods` module, I assumed that somewhere this module is being mixed into a class. If this is the case, then the value of `self` from inside a class method would be the name of the class.

I had a difficult time tracking down where, if anywhere, this module is mixed in. Then I had a stunning (and obvious) realization: *it's being mixed in to every single ActiveRecord model!* From here, it was easy to hunt down the offending code in -- where else? -- `ActiveRecord::Base` ([github](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/base.rb#L304)).

```ruby
module ActiveRecord
  class Base
    # ...
    include Associations
    # ...
  end
  # ...
end
```







As expected, the `build` method returns a reflection ?????????



























































I roughly knew where I should start looking for this bit of code: something to do with ActiveRecord and associations. Luckily, this soon led me to the very file I was looking for: `rails/activerecord/lib/active_record/associations/builder/association.rb` ([github](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations/builder/association.rb#L99))! Down on line 99 of this file, which houses the `ActiveRecord::Associations::Builder::Association` class, I ran into a very helpful comment that let me know I was in the right spot:

```ruby
# Defines the setter and getter methods for the association
# class Post < ActiveRecord::Base
#   has_many :comments
# end
#
# Post.first.comments and Post.first.comments= methods are defined by this method...
def self.define_accessors(model, reflection)
  mixin = model.generated_association_methods
  name = reflection.name
  define_readers(mixin, name)
  define_writers(mixin, name)
end

def self.define_readers(mixin, name)
  mixin.class_eval <<-CODE, __FILE__, __LINE__ + 1
    def #{name}(*args)
      association(:#{name}).reader(*args)
    end
  CODE
end

def self.define_writers(mixin, name)
  mixin.class_eval <<-CODE, __FILE__, __LINE__ + 1
    def #{name}=(value)
      association(:#{name}).writer(value)
    end
  CODE
end
```

### Interpreting the "Metaprogramming Magic" of `define_readers` and `define_writers`

I was a bit pleased to find these three short methods, two of which appeared to be relatively straightforward despite their reliance on metaprogramming. But there's still a lot to unpack here. I wanted to start with `define_readers` and `define_writers` because they seemed slightly more comprehensible to me, were similar to one another (two metaprogramming methods, one stone?) and would be critical to understanding the `define_accessors` method that called these methods.

Let's start with what I know. The fact that the method signatures of `define_readers` and `define_writers` included `self`, I knew that these were both class methods being called on the `ActiveRecord::Associations::Builder::Association` class. This makes sense, because we expect them to output the same result in every Rails app, and not necessarily be reliant on state, as instance methods might. They both take two arguments, `mixin` and `name`. I am guessing that `mixin` refers to the class that these methods will be added to (mixed in to?) and that `name` refers to the name of the methods that will be defined.

Skipping over the first line of these methods for a moment, it appears that the new method being defined in 

I know that `<<-CODE` is opening a 

















### Resources

* [Read the Rails source code on Github.](https://github.com/rails/rails) It's terrifying and awesome.
* [*The Rails 4 Way*](https://leanpub.com/tr4w)
* [Ruby Tapas: Barewords](http://devblog.avdi.org/2012/10/01/barewords/)










