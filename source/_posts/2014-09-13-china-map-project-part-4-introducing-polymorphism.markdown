---
layout: post
title: "China Map Project - Part 4: Introducing Polymorphism"
date: 2014-09-13 17:33:42 -0400
comments: true
categories: 
published: false
---



### MOVE TO NEXT POST??
Fun fact: China has 22 provinces (e.g. Shaanxi, Guangdong), 5 autonomous regions (e.g. Tibet, Inner Mongolia), 4 municipalities (Beijing, Shanghai, Chongqing, and Tianjin), and 2 special administrative regions (SARs) (Hong Kong and Macau).

I considered breaking up the `Region` model into several smaller models (i.e. `Province`, `AutonomousRegion`, etc.), I wanted the data output from the JSON API to all be standardized and accessible from one endpoint, so I decided not to go too far down this polymorphic path.
### ???


> 1. Create a class to represent each type code variant.

> 2. Change the class that uses the type code into a module. Include the module into each of the new type classes.

> 3. Change the callers of the original class to create an instance of the desired type instead.

> 4. Test.

> 5. Choose one of the methods that use the type code. Override the method on one of the type classes.

> 6. Test.

> 7. Do the same for the other type classes, removing the method on the mod- ule when you're done.

> 8. Test.

> 9. Repeat for the other methods that use the type code.

> 10. Test.

> 11. Remove the module if it no longer houses useful behavior.

>  -- Refactoring: Ruby Edition, page 226-227


1-2.

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



3. (in the `ChinaScraper` class)

```ruby
def scrape_all_regions
  Region.all.each do |region|
    puts "Scraping #{region.name}..."
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

done through 4