---
layout: post
title: "China Map Project - Part 3: Refactoring Using Replace Method with Method Object"
date: 2014-09-12 15:05:42 -0400
comments: true
categories: 
---

*This post is the third in a series about my recent side project, [A Map of China](http://amapofchina.herokuapp.com). Check out the [first post](http://callahanchris.github.io/blog/2014/09/11/china-map-project-part-1-nokogiri/), [second post](http://callahanchris.github.io/blog/2014/09/11/china-map-project-part-2-bringing-the-map-to-life-with-jvectormap/) and the [project repo](https://github.com/callahanchris/china-map) on Github.*

### Refactoring!

I enjoy refactoring. I've watched a few great technical talks on the topic (link to Ben Orenstein and Katrina Owen), dug further into the topic with two amazing books: [POODR]() and [Refactoring: Ruby Edition](). One main lesson I've gleaned from consuming these resources and applying their recommendations to my own code is the importance of having clean, succinct, well-designed code. Code that is easy to read is easy to understand and easy to change when the time comes. I find that pushing my code further towards this goal is both highly challenging and highly rewarding work.

Recently, I have been reading through Refactoring: Ruby Edition and trying to implement some of the refactoring patterns into my own code. One pattern in particular struck me as something I could implement in the backend of my China map application: Replace Method with Method Object. Quoting Martin Fowler:

> In this book I emphasize the beauty of small methods. By extracting pieces out of a large method, you make things much more comprehensible.

> The difficulty in decomposing a method lies in local variables. If they are rampant, decomposition can be difficult. Using Replace Temp with Query helps to reduce this burden, but occasionally you may find you cannot break down a method that needs breaking. In this case you reach deep in the tool bag and get out your Method Object.

>  -- Refactoring: Ruby Edition, page 128

The mechanics of this refactoring are as follows:

> 1. Create a new class, name it after the method.

> 2. Give the new class an attribute for the object that hosted the original method (the source object) and an attribute for each temporary variable and each parameter in the method.

> 3. Give the new class a constructor that takes the source object and each parameter.

> 4. Give the new class a method named "`compute`"

> 5. Copy the body of the original method into `compute`. Use the source object instance variable for any invocations of the methods on the original object.

> 6. Test.

> 7. Replace the old method with one that creates the new object and calls `compute`.

>  -- Refactoring: Ruby Edition, page 129

### The Refactoring in Action

In my original `db/seeds.rb` file, I had one `ChinaScraper` class that handled... everything. Even though this was a simple app, that is still a red flag. Before refactoring, the `ChinaScraper` class was just shy of 170 lines of code -- another red flag. Within that class, there was one 94 line method (!!!) -- `scrape_all_provinces` -- doing the bulk of the work. It scraped each province's Wikipedia page, then went through and assigned about ten different attributes to the province.

```ruby
def scrape_all_provinces
  Province.all.each do |province|
    page = Nokogiri::HTML(open(province.url))

    if %w{ Hong\ Kong Macau }.include?(province.name)
      province.territorial_designation = page.search("tr td a").find {|a| a.text.match(/special/i) }.text.split(" of ").first
    else
      province.territorial_designation = page.search("span.category a").text
    end

    province.territorial_designation = province.territorial_designation.split(' ').map(&:capitalize).join(' ')

    # ... 80 more lines of code ...
  end
end
```

As you can see in this snippet from the `scrape_all_provinces` method, a considerable amount of type checking occurred in this method as well. I found that this was an inevitability given that the HTML/CSS content of the individual region pages varied significantly based on the territorial designation of the region. Fun fact: China has 22 provinces (e.g. Shaanxi, Guangdong), 5 autonomous regions (e.g. Tibet, Inner Mongolia), 4 municipalities (Beijing, Shanghai, Chongqing, and Tianjin), and 2 special administrative regions (SARs) (Hong Kong and Macau). This was a pretty clear case of polymorphism -- but first the big refactoring!

Clearly, the `scrape_all_provinces` method had too many (i.e. more than one) responsibilities, so a heavy duty refactoring was in order.

First, I made a new class and assigned attributes for all parameters and local variables in the `scrape_all_provinces` method:

```ruby
class ProvinceScraper
  attr_reader   :province, :page
  attr_accessor :area_info, :monetary_info, :gdp_per_cap
end
```

Of these attributes, the `province` object and `page` containing the HTML contents scraped by Nokogiri would have to be passed through to a new instance of the `ProvinceScraper` class upon initialization.

```ruby
def initialize(province, page)
  @province, @page = province, page
end
```

Next, I moved the majority of the `scrape_all_provinces` method from the `ChinaScraper` class to the `ProvinceScraper` class and renamed it as `compute` in the `ProvinceScraper` class.

```ruby
def compute
  if %w{ Hong\ Kong Macau }.include?(province.name)
    province.territorial_designation = page.search("tr td a").find {|a| a.text.match(/special/i) }.text.split(" of ").first
  else
    province.territorial_designation = page.search("span.category a").text
  end

  province.territorial_designation = province.territorial_designation.split(' ').map(&:capitalize).join(' ')
  
  # ... 80 more lines of code ...
end
```

Finally, from inside the `ChinaScraper` class, I instantiated new `ProvinceScraper` objects and delegated the heavy lifting to them by sending them a simple message: `compute`. 

```ruby
def scrape_all_provinces
  Province.all.each do |province|
    page = Nokogiri::HTML(open(province.url))
    ProvinceScraper.new(province, page).compute
  end
end
```

Awesome four line method!

### Closing Thoughts

This initial refactoring made all subsequent refactorings to the `db/seeds.rb` file significantly easier. It seems like a pretty minimal refactoring at this point, but replacing the `scrape_all_provinces` method with a class caused me to think more freely about the problem and began the process of reducing the clutter in my code.

As I alluded to above, the regional classifications of China that led to my overuse of conditional statements were also an open door to a polymorphic refactoring, which is the topic of the next (and last!) post in this series.
