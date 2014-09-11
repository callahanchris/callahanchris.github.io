---
layout: post
title: "China Map Project - Part 2: Bringing the Map to Life With jVectorMap"
date: 2014-09-11 12:35:18 -0400
comments: true
categories: 
published: false
---

*This post is the second in a series about my recent side project, [A Map of China](http://amapofchina.herokuapp.com). Check out the [first post](http://callahanchris.github.io/blog/2014/09/11/china-map-project-part-1-nokogiri/) and the [project repo](https://github.com/callahanchris/china-map) on Github.*

### Setting up jVectorMap

I used the [jVectorMap JavaScript library](http://jvectormap.com/) to render a vector map of China on my website. I considered using the Leaflet and/or D3.js JavaScript libraries, but I found it a bit easier to get started with jVectorMap. jVectorMap has maps of a couple dozen countries, a map of the whole world (as seen on their homepage), and even maps of New York City and Chicago, which may be fun to play around with in the future. Importantly for my project, they also have [a map of mainland China](http://jvectormap.com/maps/countries/china/).

To get this map displayed on the index page of my Rails app, I downloaded both the main jVectorMap JS file as well as the China map JS file, put these files into the `app/assets/javascripts` directory, and included them in the `application.js` file:

```js
//= require jquery-jvectormap-1.2.2.min
//= require jquery-jvectormap-cn-merc-en
```

Then in the `index.html.erb` file in the `app/views/main` directory, I added an empty div for the map to be drawn in:

```html
<div id="map" class="center-block" style="width: 960px; height: 720px"></div>
```

From here, I was able to draw the map in this div using the jQuery plugin `vectorMap()`, which was defined in the jVectorMap China map file.

```js
$( '#map' ).vectorMap( {map: 'cn_merc_en'} );
```

### Customizing the Map

At this point, I was able to display the map exactly as I saw it on the jVectorMap website. The next step was to customize the styling of the map and incorporate the data from the JSON API that I had output from the Rails backend.

The jVectorMap API documentation was relatively easy to navigate and made it clear what I had to do to accomplish this goal. The `vectorMap()` plugin takes a JavaScript object of options that alter how the map is displayed.

```js
var showPopulationDensity = function( popDensity ) {
  $( '#map' ).vectorMap({
    map: 'cn_merc_en',
    backgroundColor: 'none',
    series: {
      regions: [{
        values: popDensity,
        scale: ['#FFF0F0', '#F5442C'],
        max: 600
      }]
    }
  });
};
```

When the `showPopulationDensity()` function is called, the map is populated with the `popDensity` dataset that is passed as an argument to the function. By specifying options in the `regions` parameter, jVectorMap colors in the provinces on a gradient (from light to dark) based on their population densities, capping out at the maximum value provided.

The jVectorMap API provides several other helper functions that can be passed to the `mapVector()` plugin. I used several of these, including `onRegionLabelShow` to customize the text displayed when you mouse over a province and `markers`, `markerStyle`, and `onMarkerLabelShow` to display data on Hong Kong and Macau, which are not included in the jVectorMap map of China.

### `$.getJSON()` to the Rescue

In order to pass the data output by my API into a function like `showPopulationDensity()`, I had to retrieve the JSON on the frontend using AJAX. Because this was a relatively simple case where I was only making a GET request to one URL -- `/provinces`, the lone endpoint of my API -- I used the `$.getJSON()` jQuery function.

```js
$.getJSON( '/provinces', function( data ) {
  // ...
});
```

Inside of this function, I iterated over the JSON returned from this API call and stored the data into JavaScript objects according to the province's code specified in the jVectorMap library.

```js
var provinceNames = {},
    population    = {},
    popDensity    = {},
    gdpUsd        = {},
    gdpPerCap     = {},
    areaKmSq      = {};

for ( var i = 0; i < data.length; i++ ) {
  provinceNames[data[i]["jvector_code"]] = data[i]["name"];
  population[data[i]["jvector_code"]]    = data[i]["population"];
  popDensity[data[i]["jvector_code"]]    = data[i]["population_density"];
  gdpUsd[data[i]["jvector_code"]]        = data[i]["gdp_usd"];
  gdpPerCap[data[i]["jvector_code"]]     = data[i]["gdp_per_capita"];
  areaKmSq[data[i]["jvector_code"]]      = data[i]["area_km_sq"];
}
```

The main focus here was transforming the JSON output from the backend into simple JavaScript objects that could be easily plugged into the jVectorMap helper functions to display different datasets on the map.

Finally, I put a few event listeners on the page so that when a certain bit of text on the page (e.g., "Population") is clicked, jVectorMap will display the correct dataset.

```js
$( '#population' ).on( 'click', function() {
  clearMap();
  showPopulation( data, provinceNames, population );
});

$( '#pop-density' ).on( 'click', function() {
  clearMap();
  showPopulationDensity( data, provinceNames, popDensity );
});

$( '#gdp-usd' ).on( 'click', function() {
  clearMap();
  showGdp( data, provinceNames, gdpUsd );
});

$( '#gdp-per-cap' ).on( 'click', function() {
  clearMap();
  showGdpPerCap( data, provinceNames, gdpPerCap );
});

$( '#area-km-sq' ).on( 'click', function() {
  clearMap();
  showArea( data, provinceNames, areaKmSq );
});
```

I was unable to figure out how change the dataset displayed on the map without entirely redrawing the vector graphic. Therefore, I call the `clearMap()` function, which removes the currently displayed map from the page, and then call the desired function to redraw the appropriate map on the page.

```js
var clearMap = function() {
  $( '#map' ).contents().remove();
};
```

### Closing Thoughts

This was my first project using a JavaScript map, and it was really fun! I definitely learned a lot about integrating JavaScript libraries into Rails apps, got more comfortable using AJAX on the frontend, and became more confident in my ability to create and consume JSON APIs.

Stay tuned for the next post in this series about one of my favorite topics: refactoring!
