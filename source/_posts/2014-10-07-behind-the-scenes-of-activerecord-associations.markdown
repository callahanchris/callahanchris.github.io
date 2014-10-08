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

Before I could figure out what was happening in the `Builder::Association::build` method, I had to figure out what exactly `self` was referring to on this line. I noticed that this method was being called with 5 parameters -- 4 which were directly passed on from the initial calling of `has_many`, and one additional parameter. In `build`'s method signature, this method argument is referred to as `model`, and the value passed to it inside the `has_many` method is `self`.

Given that the context of the `has_many` method is inside the `ActiveRecord::Associations::ClassMethods` module, I assumed that somewhere this module is being mixed into a class. If this is the case, then the value of `self` from inside a class method would be the name of the class -- that is, whichever class called the `has_many` method to begin with (in our case `House`).

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

In addition to the arguments passed to `has_many`, `House` was also being passed in as the `model` parameter of the `build` method. First, the `build` method checks if the `name` parameter (`:characters`) is "dangerous", and if so it throws an error. The [comment](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/attribute_methods.rb#L128) above the `dangerous_attribute_name?` method describes "dangerous" as such:

> A method name is 'dangerous' if it is already (re)defined by Active Record, but not by any ancestors. (So 'puts' is not dangerous but 'save' is.)

If everything is OK here, the `build` method continues by passing all the method arguments to the `create_builder` method, which checks that the `name` parameter (`:characters`) is a symbol, then instantiates a new instance of the Builder::Association class. This object is stored as `builder`, a local variable in the `build` method above.

Next, the `build` instance method (different from the `build` class method) is called on the `builder` object, taking a model (`House`) as a method argument and storing the result to a local variable `reflection`.

```ruby
def build(model)
  ActiveRecord::Reflection.create(macro, name, scope, options, model)
end
```

The only new thing here is `macro`, which is a method [defined](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations/builder/has_many.rb#L3) on the Builder::HasMany model.

```ruby
def macro
  :has_many
end
```

The `ActiveRecord::Reflections::create` method delegates based on the `macro` passed as the first argument. In our case, it instantiates an instance of the `Reflection::HasManyReflection` class, which inherits from the `Reflection::Association` class. I'm still not totally clear what reflections in general do, but [this bit of documentation](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/reflection.rb#L41) was helpful:

> Reflection enables interrogating of Active Record classes and objects about their associations and aggregations. This information can, for example, be used in a form builder that takes an Active Record object and creates input fields for all of the attributes depending on their type and displays the associations to other objects.

Whew! I'm a bit exhausted after all that.

Back to the original `build` class method. Once I knew what the `model` and `reflection` local variables were, it was relatively easy to locate the `define_accessors`, `define_callbacks`, `define_validations`, and `define_extensions` methods, as they were all in the same file as the `build` method. For the purposes of this blog post, I'll only get into the `define_accessors` method.

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

This was it. After much searching, I had found the "metaprogramming magic" at the core of ActiveRecord associations.

### Interpreting the "Metaprogramming Magic"

Again, I had to start with what I know. Two method arguments are passed to `define_accessors`: `model` and `reflection`. When the `build` method calls `define_accessors`, it uses the same names for these arguments. Back in the `build` method, `model` referred to the `House` ActiveRecord model, and `reflection` referred to the instance of the `Reflection::HasManyReflection` class.

Moving on to the next line, I found another unknown method `generated_association_methods` being called on `House`, the result of which is stored in a local variable `mixin`. I tracked down [the method definition](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/core.rb#L194) of `generated_association_methods` in the `ActiveRecord::Core::ClassMethods` module, alongside classics such as `find` and `find_by`.

```ruby
def generated_association_methods
  @generated_association_methods ||= begin
    mod = const_set(:GeneratedAssociationMethods, Module.new)
    include mod
    mod
  end
end
```

I was really stumped by this one. I was distracted by the `begin...end` block and the PascalCase symbol, and had to think for a minute before remembering that this method is just memoizing the value of `@generated_association_methods`.

As it turns out, `const_set` is just an instance method on the `Module` class in [the Ruby core library](http://ruby-doc.org/core-2.1.3/Module.html#method-i-const_set). `const_set` takes two arguments: the first is a string or symbol that will be the name of the new constant, and the second argument is an object that is the value of the new constant. The constant set is assigned to the receiver of the `const_set` message.

In the `generated_association_methods` use case, `const_set` has an implicit receiver (`self`). It is originally being called on the `ActiveRecord::Core::ClassMethods` module, but, similar to above, this module is mixed in to the `House` class, so the receiver is actually `House`. Thus, this method creates a new module `House::GeneratedAssociationMethods`.

On the next line of this method, the `GeneratedAssociationMethods` module is included into the `House` class. This is pretty awesome -- I had no idea that you could call `include` from inside a class method. This totally makes sense though, as the receiver is the class, so the use of `include` here is no different than the typical use of `include` in the class namespace.

Finally, the `GeneratedAssociationMethods` module is returned, and thus is set as the value of the `@generated_association_methods` class instance variable. Back in the `define_accessors` method, this constant is stored as the `mixin` variable.

This has been quite a winding ride! If it's not too far a stretch to remember, the `name` message being sent to the `reflection` variable (which stores an instance of `ActiveRecord::Reflection`) is the original `name` that is passed as the first argument all the way back in the initial `has_many` method. A refresher:

```ruby
class House < ActiveRecord::Base
  has_many :characters
end
```

The `name` then is simply `:characters`! We've come a long way just to figure this one out ;)

### Metaprogramming Methods

From here, it is relatively clear to see what happens next. The `define_accessors` method delegates to `define_readers` and `define_writers`. Let's look at `define_readers` again:

```ruby
def self.define_readers(mixin, name)
  mixin.class_eval <<-CODE, __FILE__, __LINE__ + 1
    def #{name}(*args)
      association(:#{name}).reader(*args)
    end
  CODE
end
```

We know that `mixin` refers to the `House::GeneratedAssociationMethods` module, which has already been `include`d in the `House` class, and that `name` refers to the symbol `:characters`. Aside of a few things in the first line of this method, it actually looks pretty straightforward: we've got a new method definition on our hands!

On the first line of the method, `class_eval` is called on `House::GeneratedAssociationMethods`. `class_eval` is another instance method on the `Module` class in Ruby's core library. (It still doesn't *quite* make sense that modules have instance methods, because modules can't be instantiated, but I'll go with it for now!) It takes a string as an argument, as well as optional parameters for filename and line number. From [the documentation](http://ruby-doc.org/core-2.1.3/Module.html#method-i-class_eval):

> `class_eval(string [, filename [, lineno]]) → obj`

> Evaluates the string or block in the context of *mod*, except that when a block is given, constant/class variable lookup is not affected. This can be used to add methods to a class. `module_eval` returns the result of evaluating its argument. The optional *filename* and *lineno* parameters set the text for error messages.

As suspected, `class_eval` allows us to add methods to a module or class. In this case, we are adding methods to the `House::GeneratedAssociationMethods` module, which can then be accessed by instances of the `House` class.

Let's look at the parameters being passed to this method.

* `string`: The string being passed to the `class_eval` method is a heredoc denoted by `<<-CODE ... CODE`. The contents are a dynamic method definition that will look like this in the example we're working with:

```ruby
def characters(*args)
  association(:characters).reader(args)
end
```

* `filename`: I am still not entirely sure what `__FILE__` precisely refers to, but I believe it refers to the current file. I am also not very clear about what this means in this context. My educated guess is that it refers to the `app/models/house.rb` file, but really the method is being added to the `House::GeneratedAssociationMethods` module, which was created dynamically and does not have a file at all! 

* `lineno`: Again, I'm not too clear about this one. The [documentation](http://ruby-doc.org/docs/keywords/1.9/Object.html#method-i-__LINE__) is sparse here, only stating that `__LINE__` refers to "The line number, in the current source file, of the current line."

Almost there! We've now got our method definitions, but what do `association` and `reader` refer to?

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

The `association` method will pull the association specified by the `name` argument passed to it (in our case `:characters`)  out of the `@association_cache` instance variable if it has already been loaded into memory. As [defined](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/core.rb#L533) in the `ActiveRecord::Core module, `@association_cache` is initialized to an empty Hash. Interestingly, this happens whenever you [instantiate an ActiveRecord object](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/core.rb#L266) using the `House.new` syntax!

If the association is not in the `@association_cache` (i.e. it hasn't been loaded into memory), then the `association` method checks whether the class where the association is defined (`House`) lists the associated class (`Character`) in its `_reflections` class method????? (which is [initialized to an empty hash](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/reflection.rb#L11)). The only way to [add a reflection](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/reflection.rb#L33) to this hash is through the `add_reflection` module method. Remember where this is called?

```ruby
def has_many(name, scope = nil, options = {}, &extension)
  reflection = Builder::HasMany.build(self, name, scope, options, &extension)
  Reflection.add_reflection self, name, reflection
end
```

If the reflection exists, then a new object is instantiated based on the type of reflection -- in the case of `has_many`, it is an instance of the `Associations::HasManyAssociation` class. We then call `association_instance__set`, passing `:characters` and `Associations::HasManyAssociation` as its parameters. This association is then [added to the `@association_cache`](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations.rb#L169):

```ruby
def association_instance_set(name, association)
  @association_cache[name] = association
end
```

The association is returned from the `association` method, and then is passed the `reader` message, which is [defined](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations/collection_association.rb#L29) in the `Associations::CollectionAssociations` class, the superclass of `Associations::HasManyAssociation`.

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

This is a meaty class, by the way, including all kinds of common methods (even `forty_two`!).

I was led to the [`Associations::CollectionProxy` class](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/associations/collection_proxy.rb), and finally its superclass, the [`ActiveRecord::Relation` class](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/relation.rb). This is another beast for another day.

### Conclusion



















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







As expected, the `build` method returns a reflection ?????????






































































### Resources

* [Read the Rails source code on Github.](https://github.com/rails/rails) It's terrifying and awesome.
* [Ruby Core Documentation for Class: Module](http://ruby-doc.org/core-2.1.3/Module.html)
* [*The Rails 4 Way*](https://leanpub.com/tr4w)
* [Ruby Tapas: Barewords](http://devblog.avdi.org/2012/10/01/barewords/)










