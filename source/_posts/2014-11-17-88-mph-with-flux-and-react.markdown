---
layout: post
title: "88 mph With Flux and React"
date: 2014-11-17 21:10:29 -0500
comments: true
categories: 
---

React.js has gained a lot of attention since it was open sourced by Facebook last year, and with its recent version 0.12 release, it appears that a version 1.0 may soon be on the horizon. React is a lightweight front end toolkit that emphasizes a unidirectional data flow in applications to simplify logic about state and data binding. Under the hood, React utilizes a virtual DOM, diffing this with the [plain old DOM](http://www.w3.org/DOM/) (PODOM) and rerendering the page with the minimal amount necessary to reflect the updated state of the application. This is a pretty interesting abstraction that relieves much of the need for developers to directly manipulate the DOM.

This year, Facebook introduced Flux, the application architecture they use for React apps. Flux is more of a pattern for separating concerns and organizing files in large React applications than it is a full-blown front end framework like Angular or Ember. Flux provides a roadmap for ensuring the unidirectional flow of data in apps and allows for more modular handling of state changes, event handling, and interfacing with external services.

I've been playing around with React and Flux for a couple of weeks, and I think React in particular is relatively easy and intuitive to understand. It provides a pretty sparse API that makes it quick to set up a few components, attach some event listeners to the DOM, and get an app up and running. JSX, a language that serves up a sugary mix of HTML and interpolated JavaScript (it compiles to JavaScript), is a bit odd at first. It's quite easy to get used to though, and remarkably it totally relieves you from the need to do string concatenation, which is a big plus.

Flux, on the other hand, took a bit more time to fully grok. The conceit is simple: all data flows in one direction. But coming from a background of developing apps using MVC architecture, Flux was a bit of a tough nut to crack.

In this blog post, I hope to make it clear how to get started using Flux.

### Conceptual Model

Before I get into building the example app, it's important to take a moment to think about the big picture of Flux. Luckily, there is one phenomenal chart that shows how all of the pieces work together:

![diagram](http://facebook.github.io/react/img/blog/flux-diagram.png)

The key parts of a Flux application are:

* Actions
* Dispatcher
* Stores
* Controller-View
* Views

Lesser roles are played by: 

* Constants
* Utils
* Router

Keep in mind, this is all on the front end. React and Flux were explicitly intended to be back end agnostic. Plug in your favorite database and back end framework at will, should the need arise.

### Architecture

Let's say we want to b.......

Each of the above pieces gets their own folder in the file directory structure. A barebones Flux app (i.e. exclusively HTML, CSS, and JS files) should look something like this:

    .
    ├── css
    |   └── styles.css
    ├── js
    |   ├── actions
    |   ├── components
    |   ├── constants
    |   ├── dispatcher
    |   ├── stores
    |   ├── utils
    |   └── app.js
    ├── index.html
    └── package.json

I'll use NPM for a package manager here. It is also [easy](http://facebook.github.io/react/downloads.html) to drop in a link to Facebook's CDN or download React. Be aware that this does not include Flux, and with larger applications it makes sense to use a package manager where we can pull in several dependencies.

Here's the `package.json` file:
```json

```

and the `index.html` file with all we need to bootstrap this app:
```html

```

I don't mean to give CSS short shrift here, but it falls a bit outside the scope of this blog post. Generally, you want to keep the CSS in a Flux/React app modular as well, with one strategy being using individual CSS files for each React component.

### Writing the App... The Flux Way

Although the actions are at the top of the foodchain, it helps to conceptualize the flow of a Flux app starting from the View layer.

Say that there's a component in the app that contains a `<button>` element. Unable to resist the temptation, a user clicks the button. This triggers the `onClick` event handler we have embedded in this button, which calls a `handleClick` or `_onClick` method defined on the component.

```javascript
// js/components/DeLorean.js

var React = require('react');
var DeLoreanActionCreators = require('../actions/ButtonActionCreators');
var DeLoreanStore = require('../stores/DeLoreanStore');
var Speedometer = require('./Speedometer');

var DeLorean = React.createClass({
  getInitialState: function() {
    return {speed: 0};
  },

  componentDidMount: function() {
    DeLoreanStore.addChangeListener(this._onChange);
  },

  componentWillUnmount: function() {
    DeLoreanStore.removeChangeListener(this._onChange);
  }

  handleClick: function() {
    DeLoreanActionCreators.accelerate();
  },

  render: function() {
    return (
      <div>
        <img src="">
        <p>"If my calculations are correct, when this baby hits 88 miles per hour... you're gonna see some serious shit."</p>
        <button onClick={this.handleClick}>Speed Up!</button>
        <Speedometer speed={this.state.speed} />
      </div>
    );
  },

  _onChange: function() {
    this.setState({speed: DeLoreanStore.getSpeed()})
  }

});
```

```javascript
// js/components/Speedometer.js

var React = require('react');

var Speedometer = React.createClass({
  message: function() {
    if (this.props.speed < 88) {
      return (
        <h1>{this.props.speed} mph</h1>
        <p>Don't worry. As long as you hit that wire with the connecting hook at precisely 88 miles per hour, the instant the lightning strikes the tower... everything will be fine.</p>
      );
    } else {
      return (
        <h1>88 mph</h1>
        <h3>It works! It works! I finally invent something that works!</h3>
      );
    }
  }

  render: function() {
    return (
      <div>
        {message}
      </div>
    );
  }
});
```


This method sends along the newly acquired state ("the button was TOTALLY just clicked") to an action creator. Action creators supply an API of accepted methods that can be invoked by components, and are also the place where information can break out of the Flux loop and communicate with the database and/or external APIs. Action creators typically pass on the state they receive from the components to the Dispatcher along with a set action type. Typicially the name of the invoked method on the action creator mirrors the name of the action type.

Action types are listed in the constants folder, and they serve as the one definitive source of what actions are legal in the Flux application. Don't overthink this, the sole purpose of the constants folder is for looking up constants. If the app gets large enough, you can get more modular in how you classify the constants, but at the end of the day all you want to know is what exactly are the officially sanctioned actions in this app.

The dispatcher is the traffic cop, and it has two main functions: packaging up the data it receives from the actions into a payload and forwarding this payload to all stores, and keeping track of the callbacks registered by stores. The dispatcher has a [really simple builtin API](http://facebook.github.io/flux/docs/dispatcher.html) consisting of just five methods.

Inside of the dispatcher file itself, only the `dispatch()` method will be called. The other methods will be sent from stores, which are responsible for registering their callbacks (and potential callback dependencies) with the dispatcher.

Stores have been described as fat models and caretakers of data. In a front end app, they are responsible for the logic that we typically associate with a model on the back end. Stores inherit from the prototype of node's `EventEmitter`, and are responsible for consuming the data passed down from the dispatcher and emitting an event.

As I mentioned above, stores also are required to register their callbacks with the dispatcher. The callback takes a payload as its argument, and then uses a `switch` statement to determine what actions to take based on the action type listed in the payload. (This action type is the same constant originally defined by the action creator way back when.)

Stores are the one place in a Flux application where state is officially defined. In a simple case, this may just be a running tally of how many times a button was clicked. Based on the action type, the store's public methods will utilize private methods to update its privately held data. Finally, it emits a 'change' event, and it's work is done.

Now we're back in React's View layer -- but not so fast. At the top of the view layer there is a Controller-View, which listens for 'change' events emitted in the system. When it hears one of these events, it queries the store that emitted the event for its data via the store's API.

When the Controller-View receives the new data, it has effectively changed its state, so it calls either `setState()` or `forceUpdate()` on itself. This triggers the Controller-View's `render()` method, which in turn triggers the `render()` methods of all components in the app, and it's turtles all the way down.

All components in the app now have access to the current version of `this.state`, and await further instructions.

### Closing Thoughts

I finally feel like I'm understanding Flux, and I like it. It provides a different way of reasoning about state and data flow in JavaScript applications. React is really straightforward, and as it approaches version 1.0, it is doing what it can to make its API [even MORE simple](https://www.youtube.com/watch?v=4anAwXYqLG8) as well as compliant with new ES6 (and even ES7!) features.

### Resources

* [Flux Overview](http://facebook.github.io/flux/docs/overview.html) -- From the official documentation.
* [Jing Chen's Original Flux Presentation](https://www.youtube.com/watch?v=nYkdrAPrdcw) -- There's some good info about React in here as well, but the Flux part is from 10 to 24 minutes in.
* [React and Flux: Building Applications with a Unidirectional Data Flow](https://www.youtube.com/watch?v=i__969noyAM) -- Good talk by Bill Fisher and Jing Chen where they go through an example chat application in Flux and React.
* [Flux Chat Example App on Github](https://github.com/facebook/flux/tree/master/examples/flux-chat/)
* [Flux: Actions and the Dispatcher](http://facebook.github.io/react/blog/2014/07/30/flux-actions-and-the-dispatcher.html) -- Helpful post by Bill Fisher going into a bit more detail about the Dispatcher, Actions, and Action Creators.
