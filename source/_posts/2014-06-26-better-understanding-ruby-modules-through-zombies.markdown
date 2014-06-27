---
layout: post
title: "Better Understanding Ruby Modules Through Zombies"
date: 2014-06-26 22:02:51 -0400
comments: true
categories: 
---

Modules in Ruby are a great place to store shared behavior and data used throughout a program. Writing a module is a convenient way to abstract out shared methods from multiple classes, thereby making the classes more DRY and manageable.

Some of the most popular modules in the Ruby core are `Comparable`, `Math`, and `Enumerable`. Yes, [a module](http://ruby-doc.org/core-2.1.2/Enumerable.html) is the reason Rubyists across the world can enjoy `each` and other higher level iterators like `all?`, `collect`, and `inject`! `ActiveRecord` and `Sinatra` are two other popular modules used in the Rails and Sinatra web frameworks, respectively.

### Why Use Modules?

[DHH likes modules.](http://signalvnoise.com/posts/3372-put-chubby-models-on-a-diet-with-concerns) And they're cool.

### How to Name a Module

Names are important in programming. And since modules are known in technical parlance as "namespaces", module names are doubly important... and doubly spacious.

Like classes, modules in Ruby are capitalized in CamelCase. Whereas classes tend to be singular nouns (`Person`, `Dog`, `Artist`), module names tend to be adjectives (`Magical`, `Persistable`, `Catlike`). Modules often have unique names that describe the behaviors, characteristics, or qualities shared by multiple classes.

These naming conventions make sense because, unlike classes, modules cannot be instantiated. You can make a new `Person`, but you cannot make a new `Magical`.

In your Rails app, file your modules in the `app/models/concerns`, `app/controllers/concerns`, and `lib/concerns` directories.

### Ineritance via Modules

Direct class-to-class inheritance in Ruby is a tricky subject: only single inheritance is allowed. For example, this is valid Ruby:
```ruby
class Mammal
end

class Animal < Mammal
end

class Dog < Animal
end
```
but this is not:
```ruby
class Mammal
end

class Animal
end

class Dog < Animal < Mammal
end
#=> TypeError: superclass must be a Class (NilClass given)

class Dog < Animal
end

class Dog < Mammal
end
#=> TypeError: superclass mismatch for class Dog
```

Modules solve the problem of multiple inheritance in an interesting way. A class can call the `extend` method to inherit a module's class methods, and a class can call the `include` method to inherit a module's instance methods.

As a result, it is good practice to write modules in the following way:

```ruby
module Generic
  module ClassMethods
    # class methods go here
  end

  module InstanceMethods
    # instance methods go here
  end
end
```

The methods in the `Generic` module can be mixed in to a class as follows:

```ruby
class Student
  extend Generic::ClassMethods
  include Generic::InstanceMethods
end
```

### Enter Zombies

Zombies provide a useful analogy for thinking about the relationship between classes and modules. Consider the `Person` class:

```ruby
class Person
  attr_accessor :name

  def initialize(name)
    self.name = name
  end

  def occupation
    "Being a human."
  end
end
```

We can instantiate a new person as follows:

```ruby
chris = Person.new("Chris")
#=> #<Person:0x0000010185eba0 @name="Chris">
chris.name
#=> "Chris"
chris.occupation
#=> "Being a human."
```

Now let's say that a zombie pandemic breaks out. First thing's first: how do we refactor our code?

We could rename our `Person` class to `Zombie` or write a new `Zombie` class, but neither of these options feel totally right. Instead, it would seem more appropriate for instances of the `Person` class to adopt zombie behavior in addition to the original behaviors of the `Person` class.

A `Zombified` module is the obvious choice here: it is an abstraction encapsulating shared behavior across (potentially) multiple classes, and it does not need to be instantiated.

```ruby
module Zombified
  module ClassMethods
    def status_of_the_human_race
      "doomed"
    end
  end

  module InstanceMethods
    def preferred_source_of_energy
      "BRAAAAIIINNNNSSSS!!!!!"
    end

    def is_alive?
      false
    end
  end
end
```

### `include`

When a module is `include`d into a class, instances of that class have access to the instance methods of both the class and the module mixed in to the class.

```ruby
class Person
  include Zombified::InstanceMethods
end

chris = Person.new("Brains")
#=> #<Person:0x00000102250618 @name="Brains">
chris.name
#=> "Brains"
chris.preferred_source_of_energy
#=> "BRAAAAIIINNNNSSSS!!!!!"
chris.is_alive?
#=> false
```

Now `chris` has access to both the instance methods of the `Person` class and the instance methods provided by the `Zombified::InstanceMethods` module. In `chris`'s method lookup chain, the methods in `Person` come before the methods in the `Zombified::InstanceMethods` module.

```ruby
Person.ancestors
#=> [Person, Zombified::InstanceMethods, Object, Kernel, BasicObject]
```

An important takeaway is that method names in a module should *not* conflict with those of the method names in the classes they are mixed into. Instead, choose more abstract and granular method names.

### `extend`

Uh oh. The zombie pandemic has spread across the planet. What's the status of the human race, then?

```ruby
Person.status_of_the_human_race
#=> NoMethodError: undefined method `status_of_the_human_race' for Person:Class
```

Right. Time to refactor our code!

```ruby
class Person
  extend Zombified::ClassMethods
end

Person.status_of_the_human_race
#=> "doomed"
```

Humanity is doomed, thanks to our handy module.

From here it's easy to zombify objects in other classes:

```ruby
class Dog
  include Zombified::InstanceMethods
end

fido = Dog.new
#=> #<Dog:0x0000010326e428>
fido.preferred_source_of_energy
#=> "BRAAAAIIINNNNSSSS!!!!!"
fido.is_alive?
#=> false
```

### Conclusion

Modules are fun! I hope to do another blog post about some of the other cool and more metaprogramm-y things you can do with modules, but for now check out some of the links below.


- [DHH on Modules](http://signalvnoise.com/posts/3372-put-chubby-models-on-a-diet-with-concerns)
- [Ruby Core Documentation](http://www.ruby-doc.org/core-2.1.2/Module.html)
- [How to `prepend` a Module](http://gshutler.com/2013/04/ruby-2-module-prepend/)
- [`refine` Classes `using` Modules](http://dev.af83.com/2012/11/05/ruby-2-0-module-refine.html)