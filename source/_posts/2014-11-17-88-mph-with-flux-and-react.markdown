---
layout: post
title: "88 mph With Flux and React"
date: 2014-11-17 21:10:29 -0500
comments: true
categories: 
---

React.js has gained a lot of attention since it was open sourced by Facebook last year, and with its recent version 0.12 release, it appears that a version 1.0 may soon be on the horizon. React is a lightweight front end toolkit for handling the view layer of web applications that emphasizes a unidirectional data flow to simplify logic about state and data binding. Under the hood, React utilizes a virtual DOM, diffing this with the [plain old DOM](http://www.w3.org/DOM/) (PODOM) and rerendering the page with the minimal effort necessary to reflect the updated state of the application. This is an interesting abstraction that makes it easier to reason about state in an application and relieves the need for developers to directly manipulate the DOM.

This year, Facebook introduced Flux, the application architecture they use for React apps. Flux is more of a pattern for separating concerns and organizing files in large React applications than it is a full-blown front end framework like Angular or Ember. Flux provides a roadmap for ensuring the unidirectional flow of data in apps and allows for more modular processing of state changes, event handling, and interfacing with external services.

I think React in particular is relatively easy and intuitive to understand. It provides a sparse API that makes it quick to set up a few components, attach some event listeners to the DOM, and get an app up and running. [JSX](http://jsx.github.io/), a language that serves up a sugary mix of HTML and interpolated JavaScript (it compiles to JavaScript), is a bit odd at first. It's quite easy to get used to though, and remarkably it totally relieves you from the need to do string concatenation, which is a big plus.

Flux, on the other hand, takes a bit more time to fully grok. The conceit is simple: all data flows in one direction. But as I had previously primarily developed apps using the MVC architecture, Flux was a bit of a tough nut to crack.

In this blog post, I hope to make it clear how to get started using Flux in a React application.

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
* [Router](https://github.com/rackt/react-router) ***CHECK

Keep in mind, this is all on the front end. React and Flux were explicitly intended to be back end agnostic. Plug in your favorite database and back end framework at will, should the need arise.

### Architecture

Let's say we want to build a small app that keeps track of the speed of Doc Brown's DeLorean from *Back to the Future*, and lets users know if the flux capacitor has been activated yet -- the deciding factor of whether or not time travel is possible at their current speed. Feel free to follow along with the project repo on [github](https://github.com/callahanchris/bttf).

Each of the key parts mentioned above gets their own folder in the file directory structure. A barebones Flux and React app (i.e. exclusively HTML, CSS, and JS files) should look something like this:

    .
    ├── css
    |   └── styles.css
    ├── js
    |   ├── actions
    |   |   └── DeLoreanActionCreators.js
    |   ├── components
    |   |   ├── Accelerator.js
    |   |   ├── DeLorean.js
    |   |   ├── ImageSection.js
    |   |   └── Speedometer.js
    |   ├── constants
    |   |   └── AppConstants.js
    |   ├── dispatcher
    |   |   └── AppDispatcher.js
    |   ├── stores
    |   |   └── DeLoreanStore.js
    |   ├── utils
    |   |   └── WebAPIUtils.js      ?????????????????????
    |   ├── app.js
    |   └── bundle.js (this will be compiled automatically)
    ├── .gitignore
    ├── index.html
    └── package.json

I'll use NPM for a package manager here. It is also [easy](http://facebook.github.io/react/downloads.html) to drop in a link to Facebook's CDN or download React. Be aware that this does not include Flux, and with larger applications it makes sense to use a package manager where we can pull in several dependencies.

Here's the `package.json` file:
```json
{
  "name": "bttf",
  "version": "0.0.1",
  "description": "Back to the Future-themed Flux + React app",
  "repository": "https://github.com/callahanchris/bttf",
  "main": "js/app.js",
  "dependencies": {
    "flux": "^2.0.1",
    "object-assign": "^1.0.0",
    "react": "^0.12.1"
  },
  "devDependencies": {
    "browserify": "^6.3.2",
    "reactify": "^0.17.0",
    "watchify": "^2.1.1"
  },
  "scripts": {
    "watch": "watchify -o js/bundle.js -v -d .",
    "build": "browserify js/app.js -o js/bundle.js"
  },
  "author": "Chris Callahan",
  "browserify": {
    "transform": [
      "reactify"
    ]
  }
}
```

the `index.html` file:
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>88 mph With Flux and React</title>
    <link rel="stylesheet" href="css/styles.css">
  </head>
  <body>
    <section id="bttf"></section>
    <script src="js/bundle.js"></script>
  </body>
</html>
```

and the `js/app.js` file to bootstrap this app:
```javascript
var React = require('react');
var DeLorean = require('./components/Delorean');

var App = React.render(
  <DeLorean />,
  document.getElementById('bttf')
);
```

For now we'll use just one CSS file, `css/styles.css`. However, if the app get big enough we might want to make the CSS more modular. One way we could do this is by using individual CSS files for each React component, (e.g. `css/Accelerator.css`, `css/DeLorean.css`, etc.).

### Writing the App... The Flux Way

Although the actions are at the top of the foodchain, it helps to conceptualize the flow of a Flux app starting from the View layer.

At the top level of the View layer we have the "View-Controller". For our purposes, this will be the DeLorean component that will wrap the entire application. The View-Controller is responsible for registering event listeners with the Stores, retrieving state from the Stores when the Stores emit an event, rerending the application with this new state using `this.setState()`, and passing the state down to nested components through props.

```javascript
// js/components/DeLorean.js

var React = require('react');
var Accelerator = require('./Accelerator');
var ImageSection = require('./ImageSection');
var Speedometer = require('./Speedometer');
var DeLoreanStore = require('../stores/DeLoreanStore');

var DeLorean = React.createClass({
  getInitialState: function() {
    return {speed: 0};
  },

  componentDidMount: function() {
    DeLoreanStore.addChangeListener(this._onChange);
  },

  componentWillUnmount: function() {
    DeLoreanStore.removeChangeListener(this._onChange);
  },

  fluxCapacitorActivated: function() {
    return this.state.speed >= 88;
  },

  render: function() {
    return (
      <div className="delorean">
        <ImageSection />
        {this.fluxCapacitorActivated() ? '' : <Accelerator />}
        <Speedometer speed={this.state.speed} />
      </div>
    );
  },

  _onChange: function() {
    this.setState({speed: DeLoreanStore.getSpeed()})
  }
});

module.exports = DeLorean;
```

Say that the Accelerator component contains a `<button>` element. Unable to resist the temptation, a user clicks the button. This triggers the `onClick` event handler we have embedded in this button, which calls the `handleClick` method defined on the Accelerator component.

```javascript
// js/components/Accelerator.js

var React = require('react');
var DeLoreanActionCreators = require('../actions/DeLoreanActionCreators');

var Accelerator = React.createClass({
  handleClick: function() {
    DeLoreanActionCreators.accelerate(1); // hard-coded to show how data flows through Flux
  },

  render: function() {
    return (
      <div className='accelerator'>
        <button onClick={this.handleClick}>Activate the Flux Capacitor</button>
      </div>
    );
  }
});

module.exports = Accelerator;
```

This method sends a message to an Action Creator. Action Creators supply an API of accepted methods that can be invoked by components, and are also the place where information can break out of the Flux loop and communicate via [XHR](?????????link) with the back end, external APIs, a database, etc. In the case of this app, it would be a bit contrived to ping an API or a back end, so I will keep the DeLoreanActionCreators file super simple and handle the logic in the DeLoreanStore.

```javascript
// js/actions/DeLoreanActionCreators.js

var AppDispatcher = require('../dispatcher/AppDispatcher');
var ActionTypes = require('../constants/AppConstants').ActionTypes;

module.exports = {
  accelerate: function() {
    AppDispatcher.handleViewAction({
      type: ActionTypes.ACCELERATE
    });
  }
};
```

Action Creators can pass on any updated state they receive from the components to the Dispatcher along with a set action type. Typicially the name of the invoked method on the Action Creator mirrors the name of the action type. Action types are listed in the constants folder.

```javascript
// js/constants/AppConstants.js

module.exports = {
  ActionTypes: {
    ACCELERATE: null
  },

  PayloadSources: {
    SERVER_ACTION: null,
    VIEW_ACTION: null
  }
};
```

This set of SCREAMING_CAMEL_CASE constants serves as the one definitive source of what actions are legal in the Flux application. Don't overthink this -- the sole purpose of the constants folder is for looking up constants. If the app gets large enough, you can get more modular in how you classify the constants, but at the end of the day all you want to know is what exactly are the officially sanctioned actions in this app.

Next, the AppDispatcher receives the `handleViewAction()` message along with the data above, which is referred to as the method argument `action` below. The AppDispatcher is a singleton in the Flux app and has two main functions: forwarding the data it receives from the actions to all stores, and keeping track of the callbacks registered by stores.

The AppDispatcher typically responds to messages sent from the Action Creators by calling the `dispatch()` method on itself.

```javascript
// js/dispatcher/AppDispatcher.js

var Dispatcher = require('flux').Dispatcher;
var PayloadSources = require('../constants/AppConstants').PayloadSources;
var assign = require('object-assign');

var AppDispatcher = assign(new Dispatcher(), {
  handleViewAction: function(action) {
    var payload = {
      source: PayloadSources.VIEW_ACTION,
      action: action
    };
    this.dispatch(payload);
  },

  handleServerAction: function(action) {
    var payload = {
      source: PayloadSources.SERVER_ACTION,
      action: action
    };
    this.dispatch(payload);
  }
});

module.exports = AppDispatcher;
```

Dead simple. I think the choice of wording here was good, as it's just like an emergency dispatcher that broadcasts messages to EMTs in the field and keeps track of who's on duty.

Creating Dispatchers used to require a lot of boilerplate code, but a canonical Dispatcher has recently been packaged up as part of the Flux NPM module. Check out the Dispatcher's [seriously simple builtin API](http://facebook.github.io/flux/docs/dispatcher.html) in the offical documentation to see what goes on under the hood here.

In a front end app, Stores are responsible for the logic that we typically associate with a model on the back end. Stores inherit from the prototype of node's EventEmitter, and are responsible for consuming the data passed down from the dispatcher, changing its state internally, and emitting an event which forces the whole app to update its state.

As I mentioned above, Stores also are required to register their callbacks with the AppDispatcher. The callback takes a payload as its argument, and then uses a `switch` statement to determine what actions to take based on the action type listed in the payload. (This action type is the same constant originally defined by the DeLoreanActionCreators way back when.)

```javascript
// js/stores/DeLoreanStore.js

var AppDispatcher = require('../dispatcher/AppDispatcher');
var ActionTypes = require('../constants/AppConstants').ActionTypes;
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');

var CHANGE_EVENT = 'change';

var _speed = 0;

var DeLoreanStore = assign({}, EventEmitter.prototype, {
  emitChange: function() {
    this.emit(CHANGE_EVENT);
  },

  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  removeChangeListener: function(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  },

  getSpeed: function() {
    return _speed;
  }
});

DeLoreanStore.dispatchToken = AppDispatcher.register(function(payload) {
  var action = payload.action;

  switch(action.type) {
  case ActionTypes.ACCELERATE:
    _accelerate();
    DeLoreanStore.emitChange();
    break;

  default:
    // noop
  }
});

function _accelerate() {
  _speed += 1;
}

module.exports = DeLoreanStore;
```

Stores are the one place in a Flux application where state is officially defined. In a simple case, this may just be a running tally of how many times a button was clicked. Based on the action type, the Store's public methods will utilize private methods to update its privately held data. Finally, it emits a 'change' event, and it's work is done.

Now we're back in React's View layer, but not so fast -- the state of our application has changed! When the DeLorean component (our Controller-View) receives the new state from the DeLoreanStore, it calls its `setState()` method. This automatically triggers its `render()` method, which in turn triggers the `render()` methods of all of its nested components, and it's turtles all the way down.

All components in the app now have access to the data in its current state, and await further instructions.

### Closing Thoughts

It took me a couple weeks, but I finally feel like I'm understanding Flux, and I really like it! It provides a different way of reasoning about state and data flow in JavaScript applications. React is super straightforward, and as it approaches version 1.0, it is doing what it can to make its API [even MORE simple](https://www.youtube.com/watch?v=4anAwXYqLG8) as well as compliant with new ES6 (and even ES7!) features. I'm looking forward to delving into different libraries like RxJS and Immutable.js that take the ideas of functional reactive programming to the next level.

Please check out the full code of my sample app on [github](https://github.com/callahanchris/bttf)!

### Resources

* [Flux Overview](http://facebook.github.io/flux/docs/overview.html) -- From the official documentation.
* [Jing Chen's Original Flux Presentation](https://www.youtube.com/watch?v=nYkdrAPrdcw) -- There's some good info about React in here as well, but the Flux part is from 10 to 24 minutes in.
* [React and Flux: Building Applications with a Unidirectional Data Flow](https://www.youtube.com/watch?v=i__969noyAM) -- Good talk by Bill Fisher and Jing Chen where they go through an example chat application in Flux and React.
* [Flux Chat Example App on Github](https://github.com/facebook/flux/tree/master/examples/flux-chat/)
* [Flux: Actions and the Dispatcher](http://facebook.github.io/react/blog/2014/07/30/flux-actions-and-the-dispatcher.html) -- Helpful post by Bill Fisher going into a bit more detail about the Dispatcher, Actions, and Action Creators.
