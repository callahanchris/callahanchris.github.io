---
layout: post
title: "Getting Started With RSpec"
date: 2014-09-18 11:56:23 -0400
comments: true
categories: 
---

RSpec is tool to test Ruby code using a very English-like syntax. RSpec is one of the most popular testing frameworks in the Ruby and Rails communities today, along with MiniTest (the default testing framework used in Rails 4) and Test::Unit.

Testing is an essential part of making reliable code, as it establishes a rapid feedback loop and allows you to refactor code to your heart's content while ensuring that the code retains its original functionality.

### How to Integrate RSpec Into Your App

It's very easy to get started with RSpec. To download RSpec run

```bash
gem install rspec
```

In a Ruby app, you can get RSpec up and running with

```bash
rspec --init
```

This will make a `.rspec` file in the root directory of the application and a `spec/` directory containing a `spec_helper.rb` file.

To get RSpec integrated into a Rails app, add the following code to the `Gemfile`:

```ruby
group :development, :test do
  gem 'rspec-rails'
end
```

and run `bundle install` to install the RSpec gems in the Rails app. Then run the following command to create the `.rspec` and `spec/spec_helper.rb` files:

```bash
rails generate rspec:install
```

Because Rails autogenerates a test suite through the `rails new` command, it can also be helpful to tell Rails to not include these files with the `-T` flag when creating a new app.

```bash
rails new greatest_app_ever -T
```

Now that RSpec is installed, you can run your specs from the command line with `rspec`.

```bash
$ rspec
No examples found.

Finished in 0.00037 seconds (files took 0.11253 seconds to load)
0 examples, 0 failures
```

### Structuring a Spec File

Let's say I want to write a basic Ruby app that will keep track of some different espresso-based beverages. Here's the file directory structure after running `rspec --init`:

```
espresso-maker/
|
|__ lib/
|   |
|   |__ espresso.rb
|
|__ spec/
|   |
|   |__ spec_helper.rb
|
|__ .rspec
```

So far these files are pretty empty. Here's `espresso.rb`:

```ruby
class Espresso
end
```

I want to take a test-first approach to this app, so I'll go ahead and set up a spec file to test the `Espresso` class. Any file that ends in `_spec.rb` will be run by the `rspec` command, and it is best practice to name the spec files in the `model_name_spec.rb` format. In the `spec` directory, I made a `espresso_spec.rb` file to house all tests on the `Espresso` model.

```rspec
require_relative 'spec_helper'

describe Espresso do
end
```

At the top of the `espresso_spec.rb` file, I required the `spec_helper.rb` file, where I will list all of the file dependencies so that they don't clutter up this spec file. Then I opened a `describe` block for the `Espresso` class - all of the tests in this file should go inside this block. Note that it's OK to use the constant `Espresso` in this case, but generally you will pass in a string as an argument to the RSpec methods `describe`, `context`, and `it`.

In order for the tests to run properly, I also need to add the following line to the `spec/spec_helper.rb` file:

```ruby
require_relative '../lib/espresso'
```

Without this `require_relative` statement, RSpec will not understand what `Espresso` is and will throw an uninitialized constant NameError.

```rspec
describe Espresso do
  describe '#name' do
  end

  describe '#ingredients' do
  end

  describe '.country_of_origin' do
  end
end
```

Inside the `describe Espresso` block, I opened a `describe` block for each public method that will be part of `Espresso`'s API. These method-specific `describe` blocks should use the `#method_name` notation for instance methods and the `.method_name` notation for class methods.

```rspec
describe Espresso do
  describe '#name' do
    it 'is espresso' do
    end
  end

  describe '#ingredients' do
    it 'one part espresso' do
    end
  end

  describe '.country_of_origin' do
    it 'is from Kenya' do
    end
  end
end
```

Within each `describe` block, I can open `it` blocks that will contain the actual expectations to be tested. `it` takes a terse (less than 40 characters) description of the specific expectation I'm setting on the method for this test as an argument.

Inside the `it` blocks, the RSpec 3 syntax uses the `expect` method to set up an expectation. 

```rspec
expect(1 + 1).to eq(2)
```

In general, you pass an expression to be evaluated to the `expect` method and chain `to` to the end of the method call. Then you call a matcher method and pass as an argument what you expect the `expect` argument to evaluate to. Some of the most common RSpec matcher methods are `eq`, `include`, `match`, and `respond_to`, all of which correspond to similar Ruby methods.

```rspec
expect([1, 2, 3]).to include(3)
expect("Hello world, my name is Chris!").to match(/Hello world/)
expect("an ordinary string").to respond_to(:capitalize)
```

### Writing the Specs

Now it's time to write our first test!

```rspec
describe Espresso do
  describe '#name' do
    it 'returns espresso' do
      espresso = Espresso.new
      expect(espresso.name).to eq("espresso")
    end
  end
end
```

Here we're instantiating a new `Espresso` object, and setting up an expectation that this drink is named "espresso". We run `rspec` and the test fails.

```bash
$ rspec

Espresso
  #name
    returns espresso (FAILED - 1)

Failures:

  1) Espresso#name returns espresso
     Failure/Error: expect(espresso.name).to eq("espresso")
     NoMethodError:
       undefined method `name' for #<Espresso:0x00000103131178>
     # ./spec/espresso_spec.rb:7:in `block (3 levels) in <top (required)>'

Finished in 0.00057 seconds (files took 0.11633 seconds to load)
1 example, 1 failure

Failed examples:

rspec ./spec/espresso_spec.rb:5 # Espresso#name returns espresso
```

Now the cycle of "Red, Green, Refactor" can begin. We have a failing (red) test, now let's do the minimum possible work to get the test to pass. Based on the error message above, I know the first step should be adding a `name` method to the `Espresso` class.

```ruby
class Espresso
  def name
  end
end
```

Running `rspec` again gives a bit more guidance about what the `name` method should return:

```bash
Failures:

  1) Espresso#name returns espresso
     Failure/Error: expect(espresso.name).to eq("espresso")
       
       expected: "espresso"
            got: nil
       
       (compared using ==)
```

Let's make the test go green!

```ruby
class Espresso
  def name
    "espresso"
  end
end
```

```bash
$ rspec

Espresso
  #name
    returns espresso

Finished in 0.00158 seconds (files took 0.12372 seconds to load)
1 example, 0 failures
```

Success!



Namespacing is important to writing readable, easy-to-follow tests. If there are many facets of a method we need to test, we can group the nested `it` blocks inside of `context` blocks. The rough outline of a spec file using namespacing well might look something like this:

```rspec
describe Espresso do
  describe '#'
end
```





### Resources

* [Official RSpec Documentation](https://www.relishapp.com/rspec)

* [Better Specs](http://betterspecs.org/) - A collection of RSpec best practices

* [Testing with RSpec on Code School](https://www.codeschool.com/courses/testing-with-rspec) - Still uses the RSpec 2 `should` syntax, but otherwise a great intro to RSpec.
