---
layout: post
title: "React.Children and the React Top-Level API"
date: 2016-09-16 14:06:19 -0400
comments: true
categories:
redirect_from: "/blog/2016/09/16/react-dot-children-and-the-react-top-level-api/"
---

One of the features that drew me in to React was the explicit intention by its authors to create an API with a [minimal surface area](http://2014.jsconf.eu/speakers/sebastian-markbage-minimal-api-surface-area-learning-patterns-instead-of-frameworks.html). This is a great goal, because it allows you to keep the full React API [in your head](http://www.paulgraham.com/head.html) when developing your application with React. Writing React code is often focused on creating components and using the [component API](https://facebook.github.io/react/docs/component-api.html) and [lifecycle methods](https://facebook.github.io/react/docs/component-specs.html), but there are a few other useful top-level utilities provided in the React API. Below I'll cover the `React.Children` methods for handling the `this.props.children` opaque data structure and how I've used them in my React apps.

## `React.Children.map`

The [release notes](https://facebook.github.io/react/blog/2015/03/03/react-v0.13-rc2.html#react.cloneelement) for `React.cloneElement` discuss a common pattern that consists of using `React.Children.map` to map over the `children` prop passed to a component and returning a cloned version of each child with additional props passed in. This allows you to pass props down from a parent component to a child component without the parent needing to explicitly render that child. This can be a big help in building reusable React components.

```js
import React from 'react';

const Salmonize = ({ children }) => (
  <div>
    {React.Children.map(children, child => (
      React.cloneElement(child, {
        style: {
          backgroundColor: 'salmon',
          color: 'seagreen',
        }
      })
    ))}
  </div>
);

const SalmonBlog = ({ title, posts }) => (
  <div>
    <Salmonize>
      <NavBar title={title} />
    </Salmonize>
    {posts.map(post => (
      <Post key={post.id}>
        <Salmonize>
          <PostHeader title={post.title} />
        </Salmonize>
        <PostBody text={post.text} />
      </Post>
    ))}
  </div>
);
```

In this example, the `<NavBar>` and `<PostHeader>` elements don't need to know about their styles, and indeed these components could be used elsewhere without this salmon-inspired color palette. (CSS is also a solution here 😄.) Similarly, the `<Salmonize>` component does not need to be aware of the fact that it is rendering the `<Navbar>` or `<PostHeader>` components, but it is still able to pass its props along to those child components.

It's definitely a bit tricky to write truly reusable components in React. If you're having trouble with this, then this "map and clone" trick can probably help you on the way to achieving this elusive goal.

## `React.Children.forEach`

Similar to `React.Children.map`, but has no return value. I haven't used this method as I haven't had the need to loop over a component's children and do something other than augment props or render UI. There is a pretty elegant use case for this in Pete Hunt's `rwb` repo [here](https://github.com/petehunt/rwb/blob/f84b5ad2c8d2099b857a96ddfbd6db1cfef4ad70/lib/getAsyncBundles.js).

## `React.Children.count`

This method returns the number of child components in the `children` argument passed to it. Again, I haven't come across the use case for this one personally. Most of the use cases I came across in a cursory Github search were simply confirming whether or not any children had been passed to a component, as in the above example from Pete Hunt.

## `React.Children.only`

This can come in handy when you want to ensure that a component only has one child, and throw an error if this condition is not met. There's a good example of this in a previous version of Cheng Lou's `react-radio-group` component [here](https://github.com/chenglou/react-radio-group/blob/9a992f3bbc1bffeb1dc993e42b0f4842ab299f42/index.jsx#L42):

```js
export default React.createClass({
  // ...

  render: function() {
    const {name, selectedValue, onChange, children} = this.props;
    const renderedChildren = children(radio(name, selectedValue, onChange));
    return renderedChildren && React.Children.only(renderedChildren);
  }
});
```

[The example app in the repo](https://github.com/chenglou/react-radio-group/blob/9a992f3bbc1bffeb1dc993e42b0f4842ab299f42/example/example.jsx#L22) complies with this contract.

## `React.Children.toArray`

This method converts the `children` prop of a component into a plain JavaScript array, which can give you a bit more flexibility than `React.Children.map` provides. `React.Children.toArray` came in handy for me recently when I wanted to render a list of items with a divider element interspersed between them. This led me to create an `<IntersperseDividers>` component to accomplish just that.

```js
import React from 'react';

const IntersperseDividers = ({ children }) => (
  <div>
    {React.Children.toArray(children).reduce((elements, child, i, array) => {
      elements.push(child);
      if (i < array.length - 1) {
        elements.push(<hr key={`${i}--divider`} />);
      }
      return elements;
    }, [])}
  </div>
);

const List = ({ data }) => (
  <IntersperseDividers>
    {data.map((item, i) => (
      <div key={i}>
        {item.value}
      </div>
    ))}
  </IntersperseDividers>
);
```

I got caught on this component for a moment because of an error thrown when I tried to directly return an array of elements. I fixed it by wrapping the array returned by `React.Children.toArray()` in a `<div>`, just like in the `React.Children.map` example above. You wouldn't need this wrapping `<div>` if the content was inlined in the `<List>` component, so it's a tradeoff for better component reusability at the expense of increased divitis.

## Conclusion

If you haven't read through it before, I'd recommend taking a minute to skim through the [top-level API section](https://facebook.github.io/react/docs/top-level-api.html) of the React docs. Though the API surface area is small, there are some hidden gems within.
