---
layout: post
title: "China Map Project - Part 3: Refactoring Using Replace Method with Method Object"
date: 2014-09-12 15:05:42 -0400
comments: true
categories: 
---

*This post is the third in a series about my recent side project, [A Map of China](http://amapofchina.herokuapp.com). Check out the [first post](http://callahanchris.github.io/blog/2014/09/11/china-map-project-part-1-nokogiri/), [second post](http://callahanchris.github.io/blog/2014/09/11/china-map-project-part-2-bringing-the-map-to-life-with-jvectormap/), and the [project repo](https://github.com/callahanchris/china-map) on Github.*

### Refactoring!

I enjoy refactoring. I've watched [a few](https://www.youtube.com/watch?v=DC-pQPq0acs) [great](https://www.youtube.com/watch?v=J4dlF0kcThQ) [technical talks](https://www.youtube.com/watch?v=8bZh5LMaSmE) on refactoring and delved further into the topic with two amazing books: [*Practical Object-Oriented Design in Ruby*](http://www.poodr.com/) by Sandi Metz and [*Refactoring: Ruby Edition*](http://martinfowler.com/books/refactoringRubyEd.html) by Jay Fields, Shane Harvie, and Martin Fowler (with Kent Beck).

One main lesson I've gleaned from these resources and applying their recommendations to my own code is the importance of having clean, succinct, well-designed code. Code that is easy to read is easy to understand and easy to change when the time comes. I find that pushing my code further towards this goal is both highly challenging and highly rewarding work.

Recently, I have been reading through *Refactoring: Ruby Edition* and trying to implement some of the refactoring patterns it outlines into my own code. With regards to my China map application, one pattern struck me as particularly useful: Replace Method with Method Object. Quoting Martin Fowler:

> In this book I emphasize the beauty of small methods. By extracting pieces out of a large method, you make things much more comprehensible.

> The difficulty in decomposing a method lies in local variables. If they are rampant, decomposition can be difficult. Using Replace Temp with Query helps to reduce this burden, but occasionally you may find you cannot break down a method that needs breaking. In this case you reach deep into the tool bag and get out your Method Object.

>  -- Refactoring: Ruby Edition, page 128

The mechanics of this refactoring (which was "stolen shamelessly from Kent Beck's *Smalltalk Best Practice Patterns*") are as follows:

> 1. Create a new class, name it after the method.

> 2. Give the new class an attribute for the object that hosted the original method (the source object) and an attribute for each temporary variable and each parameter in the method.

> 3. Give the new class a constructor that takes the source object and each parameter.

> 4. Give the new class a method named "`compute`"

> 5. Copy the body of the original method into `compute`. Use the source object instance variable for any invocations of the methods on the original object.

> 6. Test.

> 7. Replace the old method with one that creates the new object and calls `compute`.

>  -- Refactoring: Ruby Edition, page 129

### Seeing the Opportunity for Refactoring

In my original `db/seeds.rb` file, I had one `ChinaScraper` class that handled... everything. Even though this was a simple app, that is still a red flag. Before refactoring, the `ChinaScraper` class was just shy of 170 lines of code -- another big red flag. Within that class, there was one 94 line method (!!!) -- `scrape_all_regions` -- doing the bulk of the work. It scraped each region's Wikipedia page, then went through and assigned about ten different attributes to the region, then saved the region and its various attributes to the database.

```ruby
def scrape_all_regions
  Region.all.each do |region|
    page = Nokogiri::HTML(open(region.url))

    if %w{ Hong\ Kong Macau }.include?(region.name)
      region.territorial_designation = page.search("tr td a").find {|a| a.text.match(/special/i) }.text.split(" of ").first
    else
      region.territorial_designation = page.search("span.category a").text
    end

    region.territorial_designation = region.territorial_designation.split(' ').map(&:capitalize).join(' ')

    # ... 80 more lines of code ...

    region.save
  end
end
```

As you can begin to see in this snippet, the `scrape_all_regions` method contained many conditional statements that essentially checked a region's `territorial_designation`. This type checking was inevitable given that the HTML/CSS content of the individual region pages varied significantly based on their territorial designations -- more on this in the next post. 

It was clear that the `scrape_all_regions` method had far too many (i.e. more than one) responsibilities and several local variables, so I reached deep into the tool bag for the Replace Method with Method Object refactoring.

### Implementing Replace Method with Method Object

First, I made a new `RegionAssembler` class (a slightly more accurate name than the original method) and assigned attributes for all parameters in the `scrape_all_regions` method:

```ruby
class RegionAssembler
  attr_reader :region, :page
end
```

The `region` ActiveRecord object and `page` Nokogiri object would have to be passed through to a new instance of the `RegionAssembler` class upon initialization.

```ruby
def initialize(region, page)
  @region, @page = region, page
end
```

The local variables from the original `scrape_all_regions` method were slightly more complicated, so instead of assigning them to `attr_reader`s, I used Extract Method for the three local variables in `scrape_all_regions` and placed the extracted methods in the `RegionAssembler` class.

```ruby
def area_info
  @area_info ||= page.search("tr.mergedrow").select {|t| t.text.match(/km2/i) }
end

def monetary_info
  if %w{ Beijing Chongqing }.include?(region.name)
    @monetary_info ||= page.search("tr.mergedrow td").find {|tr| tr.text.match(/cny/i) }.text.split(/\s| /)
  elsif %w{ Shanghai Tianjin }.include?(region.name)
    @monetary_info ||= page.search("tr.mergedrow td").find {|tr| tr.text.match(/cny/i) }.text.split(/\s| |cny|usd|\$/i)
  elsif %w{ Guangdong }.include?(region.name)
    @monetary_info ||= page.search("tr.mergedtoprow td").find {|tr| tr.text.match(/cny/i) }.text.split(/\s| |\$/i)
  elsif %w{ Hong\ Kong Macau }.include?(region.name)
    @monetary_info ||= page.search("tr.mergedrow td").select {|tr| tr.text.match(/\$/) }[1].text.split(/\s|\$/)
  else
    @monetary_info ||= page.search("tr.mergedtoprow td").find {|tr| tr.text.match(/cny/i) }.text.split(' ')
  end
end

def gdp_per_cap
  if %w{ Guangdong Hubei }.include?(region.name)
    @gdp_per_cap ||= page.search("tr.mergedrow td").find {|tr| tr.text.match(/cny/i) }.text.split(/\s|\$/)
  elsif %w{ Shanghai }.include?(region.name)
    @gdp_per_cap ||= page.search("tr.mergedrow td").select {|tr| tr.text.match(/cny/i) }.last.text.split(/\s|\$|US/)
  elsif %w{ Tianjin }.include?(region.name)
    @gdp_per_cap ||= page.search("tr.mergedrow td").select {|tr| tr.text.match(/cny/i) }.last.text.split(/\s|\)/)
  elsif %w{ Hong\ Kong Macau }.include?(region.name)
    @gdp_per_cap ||= page.search("tr.mergedbottomrow td").select {|tr| tr.text.match(/\$/) }.last.text.split(/\s|\$|\[/)
  else
    @gdp_per_cap ||= page.search("tr.mergedrow td").select {|tr| tr.text.match(/cny/i) }.last.text.split(' ')
  end
end
```

Next, I moved the remainder of the `scrape_all_regions` method from the `ChinaScraper` class to the `RegionAssembler` class and renamed it as `compute` in the `RegionAssembler` class.

```ruby
def compute
  if %w{ Hong\ Kong Macau }.include?(region.name)
    region.territorial_designation = page.search("tr td a").find {|a| a.text.match(/special/i) }.text.split(" of ").first
  else
    region.territorial_designation = page.search("span.category a").text
  end

  region.territorial_designation = region.territorial_designation.split(' ').map(&:capitalize).join(' ')
  
  # ... 50 more lines of code ...

  region.save
end
```

Finally, from inside the `ChinaScraper` class, I instantiated new `RegionAssembler` objects and delegated the heavy lifting to them by sending them a simple message: `compute`. 

```ruby
def scrape_all_regions
  Region.all.each do |region|
    page = Nokogiri::HTML(open(region.url))
    RegionAssembler.new(region, page).compute
  end
end
```

Awesome four line method! The `ChinaScraper` class is now a relatively slim 36 lines of code and adheres much more to the Single Responsibility Principle (SRP) than its previous 170 line incarnation.

### Closing Thoughts

This initial refactoring made all subsequent refactorings to the `db/seeds.rb` file significantly easier. It seems like a pretty minimal refactoring at this point, but replacing the `scrape_all_regions` method with a class was a great first step of breaking the problem up into smaller pieces. This allowed me to think more freely about the problem and began the process of reducing the clutter in my code.

As I alluded to above, the regional classifications of China that led to a glut of conditional statements were also an open door to a polymorphic refactoring, which is the topic of the next (and last!) post in this series.
