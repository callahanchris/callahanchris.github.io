---
layout: post
title: "Behind the Scenes of the 'Has Many' Active Record Association"
date: 2014-10-08 16:17:09 -0400
comments: true
categories: 

---

In *The Rails 4 Way*, Obie Fernandez describes what happens when you "wire up" associations (like `has_many` and `belongs_to`) between Active Record models:

> When these relationship declarations are executed, Rails uses some metaprogramming magic to dynamically add code to your models. In particular, proxy collection objects are created that let you manipulate the relationship easily.

> -- The Rails 4 Way, page 181

What exactly is this "metaprogramming magic" that goes on behind the scenes? In this blog post, I hope to uncover exactly what happens when `has_many` is used in an Active Record model.

### Diving into the Source Code

The Rails source code has always been intimidating for me. There's a ton of "metaprogramming magic" going on under the hood that appears incomprehensible or esoteric to a beginner. Though it's all written in Ruby, which I feel reasonably comfortable with, I'm a total noob when it comes to metaprogramming, so my previous attempts to read the Rails source code have not gone very far.

I try not to feel too bad about this. I've only been coding for about six months, and Rails has been constantly developed over the last ten years by some of the best programmers out there.

My first step was to go the source: [the Rails source code](https://github.com/rails/rails), that is. I cloned the master branch down to my computer, and started digging in.

    git clone git@github.com:rails/rails.git

I started to feel differently about the code once it was on my local machine. Suddenly I felt like I had more control over the code, just as I would with any other Ruby files open in Sublime Text on my computer. Rather than getting distracted by the complexity and sheer magnitude of the Rails codebase, I relied on techniques that I was already confident with and worked my way through from there.

### Starting With What I Know

Let's make a basic Rails app using *Game of Thrones* as its domain model. At first, I have two classes, `House` and `Character`, both of which inherit from `ActiveRecord::Base`. I'd wire up the associations between these classes as such:

```ruby
# app/models/house.rb
class House < ActiveRecord::Base
  has_many :characters
end
```

```ruby
# app/models/character.rb
class Character < ActiveRecord::Base
  belongs_to :house
end
```

This domain logic makes sense; in *Game of Thrones*, characters often introduce themselves in the fashion "I am Arya of House Stark." Arya can be said to *belong to* House Stark, while House Stark can be said to *have many* characters (a collection, if you will) associated with it.

At this point, here's what I know about the code in the `House` model:

* The `House` class inherits from `ActiveRecord::Base`. This gives the `House` class and instances of this class access to a number of methods defined in the numerous modules included in the `ActiveRecord::Base` class. We can now say that the `House` class is an "Active Record model", as opposed to a "plain old Ruby object".

* In Rails, an Active Record model is automatically mapped to a table in the database (in this case `houses`), and attributes (i.e. methods) are created in the model that correspond to each column in this database table. Similarly, each instance of an Active Record model "wraps" one row in this table. This is the key to Rails's adaptation of the Active Record pattern -- database logic is effectively encapsulated into methods on the model layer.

* `has_many` is a "bareword". In Ruby, barewords can only be local variables, method parameters, keywords (like `class`, `def`, and `end`), and method calls. In this context, it's neither a local variable nor a method parameter, and it's certainly not a keyword. Therefore it must be a method.

* If `has_many` is a method, then in this context its receiver must be the `House` class. That makes `has_many` a class method. It could also be written as `self.has_many`, but the receiver is implicit here so we don't need to write `self`.

* It then follows that `:characters` is a method argument passed to the `has_many` method. Ruby allows you to leave off the parentheses surrounding method arguments, though it is generally good practice to keep the parentheses in when defining a method with arguments.

Given the above conclusions, we could translate this code to the following:

```ruby
House = Class.new(ActiveRecord::Base).has_many(:characters)
```

But we probably don't want to do this! The original way is way more readable, conventional, and extensible.

Knowing that `has_many` is a class method defined somewhere in Active Record helped a lot to narrow things down. From here, it was very easy to track the method definition down by doing a global search for `def has_many` on the codebase using Command + Shift + f in Sublime Text! Only one result appeared -- a [two-line method](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations.rb#L1245) in the `ActiveRecord::Associations::ClassMethods` module:

```ruby
def has_many(name, scope = nil, options = {}, &extension)
  reflection = Builder::HasMany.build(self, name, scope, options, &extension)
  Reflection.add_reflection self, name, reflection
end
```

### Taking it One Line at a Time

The `has_many` method signature is actually quite straightforward. Also, there is a copious amount (~200 lines) of [documentation](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations.rb#L1054) directly above the method definition that describes what `has_many` is, gives examples of how to use it, details the methods that are added when a `has_many` association is declared, and describes what all of the method arguments it takes are.

Here's a quick rundown of the arguments that `has_many` can take:

* `name`: The only required method argument here. The name conventionally takes a symbol the plural form and references a collection embodied by another class. In our case, `:characters` is passed in as the `name` parameter. The `:characters` collection refers to multiple instances of the `Character` class (or rows of the `characters` table in the database) that we want to associate with one instance of the `House` class. This is the one-to-many relationship that lets us know we should use the `has_many` association to begin with.

* `scope`: Defaults to `nil`. A scope must be an object with a `call` method, so `lambda`s are generally used here. Scopes can help you narrow in on a more targeted set of records to retrieve from the database. In our example, if we only wanted to associate living characters with their houses, we'd use the following scope:

```ruby
class House < ActiveRecord::Base
  has_many :characters, -> { where(deceased: false) }
end
```

(Though this might get complicated when dealing with the Iron Islands...)

* `options`: Defaults to an empty hash. Here you can further customize the nature of the association. Some common options to pass here are `through: :join_table`, `dependent: :destroy`, `polymorphic: true`, and `foreign_key: :uuid`.

* `&extension`: Explicit block argument, as indicated by the ampersand. I have never used this before, but the comments [suggest](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations.rb#L1149) that association extensions are "useful for adding new finders, creators and other factory-type methods to be used as part of the association."

To figure out the next line, I first tracked down the `ActiveRecord::Associations::Builder::HasMany` class, which is quite slim, containing just three one-line methods! Unfortunately, `build` is not one of these methods. I traversed up the inheritance hierarchy, from `ActiveRecord::Associations::Builder::HasMany` to `ActiveRecord::Associations::Builder::CollectionAssociation` and finally to `ActiveRecord::Associations::Builder::Association`, where the class method `build` is [defined](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations/builder/association.rb#L28).

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

The `ActiveRecord::Associations::Builder::Association::build` method takes 5 arguments. The latter four of these arguments are identical to those initially passed to `has_many`. The first method argument is referred to as `model` in `build`'s method signature. Inside the `has_many` method, the value passed as this argument is `self`.

Given that the `has_many` method is inside the `ActiveRecord::Associations::ClassMethods` module, I assumed that somewhere along the line this module is being mixed into a class. The value of `self` inside a class method is the class itself -- that is, whichever class called the `has_many` method to begin with (in our case `House`).

I had a difficult time tracking down where, if anywhere, this module is mixed in to the `House` class. Then I had a stunning (and obvious) realization: this module is mixed in to *every single Active Record model!* From here, it was easy to hunt down [the offending code](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/base.rb#L304) in -- where else? -- `ActiveRecord::Base`.

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

Now we know that in our example, `House` and `:characters` are being passed as the `model` and `name` arguments to the `build` method.

### Locating the "Metaprogramming Magic"

The `build` method first checks if the `name` parameter is "dangerous", and if so it throws an error. The [comment](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/attribute_methods.rb#L128) above the `dangerous_attribute_name?` method states that "a method name is 'dangerous' if it is already (re)defined by Active Record, but not by any ancestors. (So 'puts' is not dangerous but 'save' is.)"

Barring any unforeseen danger, the `build` method then passes all of its method arguments to the `create_builder` method, which is called on an implicit receiver. In this context, `self` is referring to the `ActiveRecord::Associations::Builder::HasMany` class. The `create_builder` method checks that the `name` argument passed to it (`:characters`) is a symbol, then instantiates a new instance of the `ActiveRecord::Associations::Builder::HasMany` class. This object is stored as `builder`, a local variable in the `build` method above.

Next, the `build` instance method (different from the `build` class method) is called on the `builder` object. The `build` instance method takes a model (`House`) as a method argument.

```ruby
def build(model)
  ActiveRecord::Reflection.create(macro, name, scope, options, model)
end
```

The only new thing here is `macro`, which is a method [defined](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations/builder/has_many.rb#L3) on the `ActiveRecord::Associations::Builder::HasMany` model.

```ruby
def macro
  :has_many
end
```

The `ActiveRecord::Reflections::create` method [delegates](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/reflection.rb#L15) based on the `macro` passed to it. In our case, it instantiates an instance of [the `ActiveRecord::Reflection::HasManyReflection` class](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/reflection.rb#L570), which inherits from [the `ActiveRecord::Reflection::Association` class](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/reflection.rb#L249). I'm still not totally clear what reflections in general do, but [this bit of documentation](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/reflection.rb#L41) was helpful:

> Reflection enables interrogating of Active Record classes and objects about their associations and aggregations. This information can, for example, be used in a form builder that takes an Active Record object and creates input fields for all of the attributes depending on their type and displays the associations to other objects.

The value returned is this instance of the `ActiveRecord::Reflection::HasManyReflection` class, and the original method `ActiveRecord::Associations::Builder::HasMany::build` class method stores this object to a local variable `reflection`.

Once I knew what the `model` and `reflection` local variables were, it was relatively easy to locate the `define_accessors`, `define_callbacks`, `define_validations`, and `define_extensions` methods, as they were all in [the same file as the `build` method](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations/builder/association.rb#L99), and comes with a helpful comment! (For the purposes of this blog post, I'll only get into the `define_accessors` method.)

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

This was it. After much searching, I had found the "metaprogramming magic" at the core of Active Record associations.

### Interpreting the "Metaprogramming Magic"

Again, I had to start with what I know here. Two method arguments are passed to `define_accessors`: `model` and `reflection`. When the `build` method calls `define_accessors`, it uses the same names for these arguments. Back in the `build` method, `model` referred to the `House` Active Record model, and `reflection` referred to the instance of the `ActiveRecord::Reflection::HasManyReflection` class.

Moving on to the next line, I found the `generated_association_methods` method is called on `House` and the return value is stored in a local variable `mixin`. I tracked down [the method definition](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/core.rb#L194) of `generated_association_methods` in the `ActiveRecord::Core::ClassMethods` module, alongside classics such as `find` and `find_by`.

```ruby
def generated_association_methods
  @generated_association_methods ||= begin
    mod = const_set(:GeneratedAssociationMethods, Module.new)
    include mod
    mod
  end
end
```

I was really stumped by this one. For one thing, I was distracted by the `begin...end` block and the PascalCase symbol. I had to take a step back and remember this is just Ruby code! Soon, I realized that this method memoizes the value of a class instance variable `@generated_association_methods`.

As it turns out, `const_set` is an instance method on the `Module` class in [the Ruby core library](http://ruby-doc.org/core-2.1.3/Module.html#method-i-const_set). `const_set` takes two arguments: the first is a string or symbol that will be the name of the new constant you're creating, and the second argument is an object that will be the value of this constant. The constant is then namespaced under the receiver of the `const_set` message.

In this case, `const_set` has an implicit receiver (`self`). It's tempting to think that `self` is the `ActiveRecord::Core::ClassMethods` module, but as above, this module is actually mixed in to the `House` class when we have it inherit from `ActiveRecord::Base`. The receiver here is actually `House`. Thus, this method creates a new module in the `House` namespace: `House::GeneratedAssociationMethods`. (Note that `House::GeneratedAssociationMethods` is the return value here, but if we were assigning pretty much anything but a new class or module as `GeneratedAssociationMethods`'s value here, the return value would be that object.)

On the next line of this method, the `House::GeneratedAssociationMethods` module is included into the `House` class. This is pretty awesome -- I had no idea that you could call `include` from inside a class method. It totally makes sense though, as the receiver is the class itself, so the use of `include` here is no different than the typical use of `include` in the class namespace.

Finally, the `House::GeneratedAssociationMethods` module is returned, and thus is set as the value of the `@generated_association_methods` class instance variable. Back in the `define_accessors` method, this constant is stored as the `mixin` variable.

Going on to the next line of the `define_accessors` method, the `name` message is passed to the `reflection` variable (our instance of the `ActiveRecord::Reflection::HasManyReflection` class). This object has [an `attr_reader` for name](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/reflection.rb#L176), which is [set upon initialization](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/reflection.rb#L191). If it's not too far a stretch back to remember, the `name` attribute here is set to the original `name` passed as the first argument of the `has_many` method. A refresher:

```ruby
class House < ActiveRecord::Base
  has_many :characters
end
```

The `name` then is simply `:characters`!

Next, `define_accessors` delegates to `define_readers` and `define_writers`, passing `House::GeneratedAssociationMethods` and `:characters` as the `mixin` and `name` arguments to both of these methods. (For simplicity, I will just focus on the `define_readers` method.)

### Metaprogramming Methods

From here, it is relatively clear to see what happens next. Let's look at `define_readers` again:

```ruby
def self.define_readers(mixin, name)
  mixin.class_eval <<-CODE, __FILE__, __LINE__ + 1
    def #{name}(*args)
      association(:#{name}).reader(*args)
    end
  CODE
end
```

Aside of a few things in the first line of this method, this actually looks pretty straightforward: we've got a new method definition on our hands!

On the first line of the method, `class_eval` is called on the `House::GeneratedAssociationMethods` module. `class_eval` is another instance method of the `Module` class in Ruby's core library. It takes a string as an argument, as well as optional parameters for filename and line number. From [the documentation](http://ruby-doc.org/core-2.1.3/Module.html#method-i-class_eval):

> **class_eval(string [, filename [, lineno]]) → obj**

> Evaluates the string or block in the context of **mod**, except that when a block is given, constant/class variable lookup is not affected. This can be used to add methods to a class. `module_eval` returns the result of evaluating its argument. The optional **filename** and **lineno** parameters set the text for error messages.

As suspected, `class_eval` allows us to add methods to a module or class. In this case, we are adding methods to the `House::GeneratedAssociationMethods` module. As this module has already been `include`d in `House`, these new methods can be accessed by instances of the `House` class.

Let's look at the parameters being passed to this method:

* `string`: The string being passed to the `class_eval` method is a heredoc denoted by `<<-CODE ... CODE`. The contents are a dynamic method definition that will look like this in the example we're working with:

```ruby
def characters(*args)
  association(:characters).reader(args)
end
```

* `filename`: I am still not entirely sure what `__FILE__` precisely refers to, but I believe it refers to the current file. I am also not very clear about what this means in this context. My educated guess is that it refers to the `app/models/house.rb` file, but really the method is being added to the `House::GeneratedAssociationMethods` module, which was created dynamically and doesn't have a file at all! 

* `lineno`: Again, I'm not too clear about this one. The [documentation](http://ruby-doc.org/docs/keywords/1.9/Object.html#method-i-__LINE__) is sparse here, only stating that `__LINE__` refers to "The line number, in the current source file, of the current line."

Almost there! We've now got our method definitions, but what do `association` and `reader` refer to?

### Associations, Caching, and Reflections

It turns out that `association` is an [instance method](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations.rb#L150) of the `ActiveRecord::Associations` module.

```ruby
def association(name) #:nodoc:
  association = association_instance_get(name)

  if association.nil?
    raise AssociationNotFoundError.new(self, name) unless reflection = self.class._reflect_on_association(name)
    association = reflection.association_class.new(self, reflection)
    association_instance_set(name, association)
  end

  association
end
```

The `association` method will pull the association specified by the `name` argument passed to it (in our case `:characters`)  out of the `@association_cache` instance variable if it has already been loaded into memory. As [defined](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/core.rb#L533) in the `ActiveRecord::Core` module, `@association_cache` is initialized to an empty Hash. Interestingly, this happens whenever you [instantiate an Active Record object](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/core.rb#L266) using the `House.new` syntax!

If the association is not in the `@association_cache` (i.e. it hasn't been loaded into memory), then the `association` method checks whether the class where the association is defined (`House`) lists the associated class (`Character`) as one of its `_reflections` (a `class_attribute` which is also [initialized to an empty hash](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/reflection.rb#L11)). The only way to [add a reflection](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/reflection.rb#L33) to this hash is through the `add_reflection` module method. Remember where this is called?

```ruby
def has_many(name, scope = nil, options = {}, &extension)
  reflection = Builder::HasMany.build(self, name, scope, options, &extension)
  Reflection.add_reflection self, name, reflection
end
```

In the case of our domain model, the second line of the `has_many` method will add the key "characters" pointing to the value of our `reflection` from above -- the instance of the `ActiveRecord::Reflection::HasManyReflection` class -- to the `_reflections` hash.

Let's make an instance of the `House` model

```ruby
stark = House.create(surname: "Stark", sigil: "Direwolf", motto: "Winter is coming.")

# => #<House id: 1, surname: "Stark", sigil: "Direwolf", motto: "Winter is coming.", created_at: "2014-10-09 20:05:01", updated_at: "2014-10-09 20:05:01">
```

If we call `stark.characters`, Rails first checks whether `"characters"` is a key in `House`'s `_reflections` hash. If so, a new object is instantiated based on the type of this reflection -- in the case of `has_many`, it's an instance of the `ActiveRecord::Associations::HasManyAssociation` class. The `association` method then calls `association_instance_set`, passing `:characters` and this instance of `ActiveRecord::Associations::HasManyAssociation` as its parameters. This association is then [added to the `@association_cache` instance variable](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations.rb#L169):

```ruby
def association_instance_set(name, association)
  @association_cache[name] = association
end
```

The association is returned from the `association` method, and then is passed the `reader` message, which is [defined](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations/collection_association.rb#L29) in the `ActiveRecord::Associations::CollectionAssociations` class, the superclass of `ActiveRecord::Associations::HasManyAssociation`.

```ruby
# Implements the reader method, e.g. foo.items for Foo.has_many :items
def reader(force_reload = false)
  if force_reload
    klass.uncached { reload }
  elsif stale_target?
    reload
  end

  @proxy ||= CollectionProxy.create(klass, self)
end
```

### A Return Value at the End of the Tunnel

I had reached the end of my journey. Here on the last line of the `reader` method was `@proxy`, the final value that would be returned by the newly minted `characters` method when called on an instance of the `House` class. This `@proxy` instance variable is also the one alluded to by Obie Fernandez when he says "proxy collection objects are created that let you manipulate the relationship easily."

Here is where it gets interesting: the `ActiveRecord::Associations::CollectionProxy` class [inherits from](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations/collection_proxy.rb#L30) `ActiveRecord::Relation`, which is the main class in Rails that deals with [database operations](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/relation.rb). From here, we have to go all the way up the inheritance chain to the `ActiveRecord::Delegation::ClassMethods` module to find [the `create` method used here](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/relation/delegation.rb#L105).

Now when we call `stark.characters`, we know without a shadow of a doubt what our return value will be!

```ruby
stark.characters

# => [#<Character id: 1, name: "Arya", age: 11, catchphrase: "Stick them with the pointy end.", house_id: 1, created_at: "2014-10-09 20:07:27", updated_at: "2014-10-09 20:07:27">]
```

Hmm. From inside the Rails console, this looks like an array. Let's check out the class of this collection:

```ruby
stark.characters.class

# => Character::ActiveRecord_Associations_CollectionProxy
```

Much better.

### Conclusion

This post was a good exercise for me to get more comfortable delving into the Rails source code, to begin to wrap my head around some of the legendary "Rails magic", and to learn a bit more about metaprogramming in the wild. This is just the tip of the iceberg, but I no longer feel the Rails source code is untouchable. In fact, it's all just a bunch of great Ruby code! 

### Resources

* [Read the Rails source code on Github.](https://github.com/rails/rails) It's terrifying and awesome.
* [Ruby on Rails API Documentation for `ActiveRecord::Associations::ClassMethods`](http://api.rubyonrails.org/classes/ActiveRecord/Associations/ClassMethods.html)
* [Ruby Core Documentation for Class: Module](http://ruby-doc.org/core-2.1.3/Module.html)
* [*The Rails 4 Way*](https://leanpub.com/tr4w)
* [Ruby Tapas: Barewords](http://devblog.avdi.org/2012/10/01/barewords/)
* [`class_attribute`s in Rails](http://blog.obiefernandez.com/content/2010/04/tr3w-highlights-activesupport-class-class-attribute.html)
