---
layout: post
title: "China Map Project - Part 1: Nokogiri, Regular Expressions, and a JSON API"
date: 2014-09-11 11:43:03 -0400
comments: true
categories: 
---

Over the past couple months I've been working on a side project to create an [interactive, data-rich map of China](http://amapofchina.herokuapp.com). ([Check out the source code on Github!](https://github.com/callahanchris/china-map)) To accomplish this goal, I made a Ruby on Rails app that scrapes Wikipedia for data about all of the regions in China, stores this information in a database, and outputs the data as a JSON API. On the frontend, I used JavaScript to create a vector map of China and populate the map with the data consumed from the API. I saw this project as something that could both challenge me technically and bring together two of my main interests: China and coding.

### Gathering the Data

I used the Nokogiri gem to do all of the web scraping in this project. Starting on the [main China page on Wikipedia](http://en.wikipedia.org/wiki/China), I was able to scrape the links to the individual pages for every province, autonomous region, municipality, and special administrative region in China. On each page I was able to take in some basic data about the region, including its population, population density, and GPD per capita.

Nokogiri and OpenURI make the process of web scraping very simple. In my `Gemfile`, I required the Nokogiri gem:

```ruby
gem 'nokogiri'
```

and in the file I did the scraping in (`db/seeds.rb`), I required the OpenURI module of the Ruby standard library:

```ruby
require 'open-uri'
```

*(As a side note, I have been unable to find out if there is a better, more centralized place to put the OpenURI requirement in a Rails application. It is a module in Ruby's standard library, so it can't be placed in the `Gemfile`, but it still seems somewhat un-Railslike to just throw the requirement into whatever file you happen to be using it in.)*

Once these requirements were declared, it was straighforward to use OpenURI `open` the URL I was targeting and use Nokogiri to capture the HTML contents of the page.

```ruby
china_main_page = Nokogiri::HTML(open("http://en.wikipedia.org/wiki/China"))
``` 

In the case of my app, I first scraped the contents of the China page on Wikipedia and stored the links to each region listed on that page into an array named `region_links`. I then iterated over these links (skipping one as there were two links to Taiwan) to create new `Region` objects.

```ruby
def make_regions
  region_links.each_with_index do |url, i|
    next if i == 22
    region = Region.new.tap {|r| r.url = url }
    region.save
  end
end
```

Behind the scenes in `app/models/region.rb`, I used the last part of the URL to assign names to each region using the `before_create` hook.

```ruby
class Region < ActiveRecord::Base
  before_create :assign_name_from_url

  def assign_name_from_url
    self.name = url[29..-1].split('_').join(' ')
    self.name.sub!(' Autonomous Region', '') if self.name.ends_with?(' Autonomous Region')
  end
end
```

Once I had all of the regions and their Wikipedia URLs stored in the database, the next step was to iterate over the regions and use Nokogiri to scrape the HTML contents of each region's page.

```ruby
def scrape_all_regions
  Region.all.each do |region|
    page = Nokogiri::HTML(open(region.url))
    # ...
  end
end
```

I wanted to use best practices and make the code adhere to object-oriented design principles, so I put the above methods into a class called `ChinaScraper`, the outline of which roughly looks like this:

```ruby
class ChinaScraper
  def run
    scrape_index
    make_regions
    scrape_all_regions
  end

  def scrape_index
    # ...
  end

  def make_regions
    # ...
  end

  def scrape_all_regions
    # ...
  end
end
```

Finally, in `db/seeds.rb` I seeded the database simply by instantiating a new `ChinaScraper` object.

```ruby
ChinaScraper.new.run
```

### Parsing the Data

If you look at the Wikipedia articles of a few Chinese provinces, you will notice that the structure of each article is fairly similar. Each page has a sidebar on the right with some basic data regarding the specific region: its capital, governor, latitude and longitude, GDP in US dollars and Chinese yuan, etc. These data are all seemingly laid out in the same format, but actually the CSS selectors are slightly different in different articles.

At first, I constructed a large conditional statement that chose the accurate CSS selector to use given some hardcoded information to identify the region. Eventually this hardcoding didn't sit right with me, so I found a more elegant solution: regular expressions.

One good example of this was with the data on the page indicating a region's area and population density. Given the `page` of a particular `region`, I isolated all `tr` HTML elements with the CSS `mergedrow` class that contained the text `km2` and stored this into a local variable.

```ruby
area_info = page.search("tr.mergedrow").select { |t| t.text.match(/km2/i) }
```

I then `split` the appropriate string from the `area_info` array into an array of strings using a regular expression, selected the string with the relevant info, removed all commas from the string, and converted it to an integer.

```ruby
region.area_km_sq         = area_info.first.text.
                              split(/\s| /)[3].
                              gsub(',', '').to_i
region.population_density = area_info.last.text.
                              split(/\s| |\//)[3].
                              gsub(',', '').to_i
```

I originally used only `\s` to split the string on all of its whitespaces, but found that a few whitespaces were still showing up in the resulting array of strings! After some digging, I figured out that whitespaces from the Chinese character set were included in the text of some of the Wikipedia articles, but they were not picked up by the regexp's whitespace identifier.

I was able to solve this problem by adding the Chinese whitespace as one of the options in the above regexp. However, when I tested this program on a different computer that did not have a Chinese language package installed, `rake db:seed` blew up on this line. After some more digging, I was able to resolve this problem by adding one commented line to the top of the `db/seeds.rb` file:

```ruby
# encoding: UTF-8
```

### Outputting the Data as a JSON API

Once the data had been scraped from Wikipedia, parsed using Nokogiri and regular expressions, and persisted in the database, it was then just a matter of outputting the data as a JSON API for easy consumption by the JavaScript frontend. The `app/controllers/regions_controller.rb` file is as follows:

```ruby
class RegionsController < ApplicationController
  def index
    @regions = Region.all
    render json: @regions
  end
end
```

### Closing Thoughts

Though this was not my first web scraping project, it was challenging given the HTML/CSS inconsistencies across different Wikipedia articles. After solving the problem in a brute force fashion using hardcoded region data, I was able to bring the code to a more abstract level and learn a lot about parsing text with regular expressions in the process.

Check out the [next post](http://callahan.io/blog/2014/09/11/china-map-project-part-2-bringing-the-map-to-life-with-jvectormap/) in this series where I talk about the JavaScript frontend and the [third](http://callahan.io/blog/2014/09/12/china-map-project-part-3-refactoring-using-replace-method-with-method-object/) and [fourth](http://callahan.io/blog/2014/09/13/china-map-project-part-4-introducing-polymorphism/) posts where I talk about refactoring the `db/seeds.rb` file!
