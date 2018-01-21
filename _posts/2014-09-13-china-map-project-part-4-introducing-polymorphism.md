---
layout: post
title: "China Map Project - Part 4: Introducing Polymorphism"
date: 2014-09-13 17:33:42 -0400
comments: true
categories: 
---


*This the fourth and final post in a series about my recent side project, [A Map of China](http://amapofchina.herokuapp.com). Check out the [first post](http://callahan.io/blog/2014/09/11/china-map-project-part-1-nokogiri/), [second post](http://callahan.io/blog/2014/09/11/china-map-project-part-2-bringing-the-map-to-life-with-jvectormap/), [third post](http://callahan.io/blog/2014/09/12/china-map-project-part-3-refactoring-using-replace-method-with-method-object/), and the [project repo](https://github.com/callahanchris/china-map) on Github.*

### The Road to Polymorphism

When I started this project, I set out to make an interactive map that displayed a variety of data about the Chinese provinces. But this very premise -- mapping Chinese provinces -- turned out to be far more nuanced and complex than I realized at the outset.

Technically speaking, China has 22 provinces (e.g. Shaanxi, Guangdong), 5 autonomous regions (e.g. Tibet, Inner Mongolia), 4 municipalities (Beijing, Shanghai, Chongqing, and Tianjin), and 2 special administrative regions (SARs) (Hong Kong and Macau). *[Note: Any issues pertaining to Taiwan fall outside the scope of this project.]*

Originally, I had named the main model in my Rails app `Province`, but later decided that `Region` would be more suitable. I considered breaking up the `Region` model into several smaller models (i.e. `Province`, `AutonomousRegion`, etc.), but I wanted the data output from the JSON API to all be standardized and accessible from one endpoint, so I kept all regions contained in one model.

The issue of polymorphism came up when I realized that I was using a large number of conditional checks on the region's name in my Wikipedia scraping code. The most prominent among these was the following:

```ruby
if %w{ Hong\ Kong Macau }.include?(region.name)
  # ...
else
  # ...
end
```

While I didn't have a `SpecialAdministrativeRegion` model, this conditional logic more or less amounted to a type check that significantly bogged down the readability and clarity of my code.

Recently I have been reading through [*Refactoring: Ruby Edition*](http://martinfowler.com/books/refactoringRubyEd.html), and found a refactoring that suited my needs in this case: Replace Type Code with Polymorphism.

### Extract Method

Before I was able to implement the Replace Type Code with Polymorphism refactoring, I needed to continue refactoring the lengthy `compute` method in the `RegionAssembler` class from the [last post](http://callahan.io/blog/2014/09/12/china-map-project-part-3-refactoring-using-replace-method-with-method-object/). Within the `compute` method, I had been assigning about ten different pieces of data to the `Region` objects and saving them to the database. In order to preserve the `compute` API set up in the last post, I had `compute` delegate to a number of smaller methods, which I removed from `compute` using Extract Method.

Quoting Martin Fowler:

> Extract Method is one of the most common refactorings I do. I look at a method that is too long or look at code that needs a comment to understand its purpose. I then turn that fragment of code into its own method.

> I prefer short, well-named methods for several reasons. First, it increases the chances that other methods can use a method when the method is finely grained. Second, it allows the higher-level methods to read more like a series of comments. Overriding also is easier when the methods are finely grained.

>  -- Refactoring: Ruby Edition, page 102

Extract Method is an incredibly useful and easy refactoring to undertake. The mechanics are as follows:

<blockquote>
1. Create a new method, and name it after the intention of the method (name it by what it does, not by how it does it).
<br>
2. Copy the extracted code from the source method into the new target method.
</blockquote>

Steps 3-6 deal with handling local variables, which I already extracted out of `compute` in the Replace Method with Method Object refactoring in the last post.

<blockquote>
7. Replace the extracted code in the source method with a call to the target method.
<br>
8. Test.
<br>
-- Refactoring: Ruby Edition, page 103
</blockquote>

In practice, I looked for chunks of code in the `compute` method like this:

```ruby
def compute
  # ...
  if %w{ Hong\ Kong Macau }.include?(region.name)
    region.gdp_per_capita = gdp_per_cap[1].gsub(',', '').to_i
  else
    region.gdp_per_capita = gdp_per_cap[3].gsub(',', '').to_i
  end
  # ...
end
```

then I copied the code out into its own method:

```ruby
def assign_gdp_per_cap
  if %w{ Hong\ Kong Macau }.include?(region.name)
    region.gdp_per_capita = gdp_per_cap[1].gsub(',', '').to_i
  else
    region.gdp_per_capita = gdp_per_cap[3].gsub(',', '').to_i
  end
end
```

and replaced the original chunk of code with a call to the extracted method:

```ruby
def compute
  # ...
  assign_gdp_per_cap
  # ...
end
```

I methodically went through the `compute` method and used Extract Method until all logical units of work had been extracted. In the end, the `compute` method had shrunk from almost 100 lines into this succinct delegator method:

```ruby
def compute
  assign_territorial_designation
  assign_lat_lng
  assign_capital
  assign_area_info
  assign_gdp_usd
  assign_gdp_cny
  assign_gdp_per_cap
  assign_jvector_code
  region.save
end
```

### Replace Type Code with Polymorphism

With the `RegionAssembler` class now broken down into small methods, it was much easier to see how to implement the Replace Type Code with Polymorphism refactoring. Here are the mechanics for carrying out this refactoring:

> 1. Create a class to represent each type code variant.

> 2. Change the class that uses the type code into a module. Include the module into each of the new type classes.

> 3. Change the callers of the original class to create an instance of the desired type instead.

> 4. Test.

> 5. Choose one of the methods that use the type code. Override the method on one of the type classes.

> 6. Test.

> 7. Do the same for the other type classes, removing the method on the module when you're done.

> 8. Test.

> 9. Repeat for the other methods that use the type code.

> 10. Test.

> 11. Remove the module if it no longer houses useful behavior.

>  -- Refactoring: Ruby Edition, page 226-227

In practice my execution was also a bit similar to the Replace Conditional with Polymorphism refactoring (*Refactoring: Ruby Edition*, page 279-284).

First I made classes for each regional classification, turned the `RegionAssembler` class into a module, and included the `RegionAssembler` module in each class.

```ruby
module RegionAssembler
  # ...
end

class ProvinceAssembler
  include RegionAssembler
end

class AutonomousRegionAssembler
  include RegionAssembler
end

class MunicipalityAssembler
  include RegionAssembler
end

class SARAssembler
  include RegionAssembler
end
```

Next I modified the `scrape_all_regions` method in the `ChinaScraper` class to appropriately call each of these new classes.

```ruby
def scrape_all_regions
  Region.all.each do |region|
    page = Nokogiri::HTML(open(region.url))
    case region.name
    when "Hong Kong", "Macau"
      SARAssembler.new(region, page).compute
    when "Beijing", "Chongqing", "Shanghai", "Tianjin"
      MunicipalityAssembler.new(region, page).compute
    when "Guangxi", "Inner Mongolia", "Ningxia", "Xinjiang", "Tibet"
      AutonomousRegionAssembler.new(region, page).compute
    else
      ProvinceAssembler.new(region, page).compute
    end 
  end
end
```

Then, one at a time, I began overriding the methods from the `RegionAssembler` module in individual classes. I started doing this in the `SARAssembler` class first because the Hong Kong and Macau Wikipedia pages had the most special cases that led to the overuse of conditionals in the first place.

In practice, here's how the overriding worked. I started with the `assign_territorial_designation` method (extracted out of the `compute` method above) in the `RegionAssembler` module:

```ruby
def assign_territorial_designation
  if %w{ Hong\ Kong Macau }.include?(region.name)
    region.territorial_designation = page.search("tr td a").find { |a| a.text.match(/special/i) }.text.split(" of ").first
  else
    region.territorial_designation = page.search("span.category a").text
  end

  region.territorial_designation = region.territorial_designation.split(' ').map(&:capitalize).join(' ')
end
```

I copied this method into the `SARAssembler` class, removed all but one line, and slightly refactored the text selector.

```ruby
def assign_territorial_designation
  region.territorial_designation = page.search("tr td a").
                                     find { |a| a.text.match(/special/i) }.
                                     attributes["title"].value.
                                     split(' ').map(&:capitalize).join(' ')
end
```

Then in the `RegionAssembler` module, I was able to turn this method into a nice one-liner.

```ruby
def assign_territorial_designation
  region.territorial_designation = page.search("span.category a").text.
                                     split(' ').map(&:capitalize).join(' ')
end
```

At this point, it became apparent that this method actually had two responsibilities: assigning the accurate text and making sure it was in title caps. There was a clear opportunity to extract a `title_caps` method:

```ruby
def title_caps(string)
  string.split(' ').map(&:capitalize).join(' ')
end
```

I could then further simplify the `assign_territorial_designation` method as such:

```ruby
def assign_territorial_designation
  region.territorial_designation = title_caps(page.search("span.category a").text)
end
```

This refactoring was particularly helpful for methods that applied to certain classes but not to others. Take for instance the `assign_capital` method. Municipalities and SARs are cities, and therefore don't have capitals. This method clearly doesn't apply to them. Yet the original `assign_capital` method spent a significant amount of effort checking whether or not it applied.

```ruby
def assign_capital
  if !%w{ Beijing Chongqing Shanghai Tianjin Hong\ Kong Macau }.include?(region.name)
    region.capital = page.search("tr.mergedtoprow a")[0].text
  end
end
```

In the `SARAssembler` and `MunicipalityAssembler` classes, I overwrote this with an empty method:

```ruby
def assign_capital
end
```

and then was able to refactor the `assign_capital` method in the module into a much simpler version: 

```ruby
def assign_capital
  region.capital = page.search("tr.mergedtoprow a")[0].text
end
```

In the end, I kept the `RegionAssembler` module, as there would have been too much code duplication if I copied over all of the methods into each of the four classes. At 80 lines, the `RegionAssembler` module is not exactly small, but the majority of its methods are one-liners, and the type checking is gone.

### The Final Step (For Now...)

Starting from one monolithic `ChinaScraper` class, I used Replace Method with Method Object to extract out most of the logic from this class into a `RegionScraper` class. Then I went to town using Extract Method to create a bunch of small methods that followed the Single Responsibility Principle (SRP). Having done this, it was clear that my code could benefit from a Replace Type Code with Polymorphism refactoring.

All told, the shape of my code morphed from its original form -- one 170 line class hinging on a 90 line method -- to a more modular form where code was sectioned off into five classes and two modules, and methods were used for one purpose only.

The final step here was to take all of this code out of the `db/seeds.rb` file and put it into the `app/models` directory. This directory's file structure now looks like this:

    app/
    |
    |__ models/
        |
        |__ concerns/
        |   |
        |   |__ j_vectorable.rb
        |   |
        |   |__ region_assembler.rb
        |
        |__ autonomous_region_assembler.rb
        |
        |__ china_scraper.rb
        |
        |__ municipality_assembler.rb
        |
        |__ province_assembler.rb
        |
        |__ region.rb
        |
        |__ sar_assembler.rb

And the final `db/seeds.rb` file is now nice and succinct:

```ruby
ChinaScraper.new.run
```

### Room for Improvement

This was a fun project and I really enjoyed taking the time to refactor my code and make it much more clear, concise, and easy to expand upon going forward.

There are a few areas in which I think I can improve upon in this and future projects:

* **Regular Expressions.** I think I got better at writing regular expressions in this project, but it is possible that I would not have needed the polymorphic refactoring if I had used more accurate regular expressions. Regexps are incredibly powerful, and I want to learn a lot more about them.

* **Testing.** You may have noticed that I did not follow one very important step of the refactorings from Martin Fowler's book: "Test." I am a bit ashamed to admit that I do not have any test coverage on this app. I am not sure whether/how to test the entire Nokogiri and web scraping aspect of the project. This is something I have to look into more for this specific use case, and in general I need to gain more experience doing test-first development.

* **Working more with maps.** I am glad that I was able to get the China map up and running, and now I am excited to try working with other third-party libraries to create more interesting data visualizations!
