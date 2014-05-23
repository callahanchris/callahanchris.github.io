---
layout: post
title: "I Don't Know How To Program"
date: 2014-05-23 14:52:35 -0400
comments: true
categories: 
---

I was struck by this realization recently when going through Michael Hartl's [Ruby on Rails Tutorial](http://railstutorial.org). This was my first exposure to Rails, though I had learned a bit of Ruby before, and as such was under the impression that I knew a thing or two about coding.

Overall, the tutorial was difficult and intense, but at the end I felt very accomplished for having made it all the way through. I learned a ton about Rails, test-driven development (TDD), ERb, and Ruby. Of critical importance to this was my brother, [Andrew Callahan](http://andrewcallahan.github.io), who was on hand to help me with my questions and problems and to offer his insights on programming.

I learned some important lessons while undertaking this tutorial that I hope can help me in my transition from non-programmer to programmer. 


### 1. Environment is Essential

Prior to taking on the Hartl Rails Tutorial, most of the programs I had written were in Ruby alone. In order to get these programs to run, all I needed was a text editor, a terminal, and a Ruby. This setup was relatively simple to get up and running:

```
ruby program.rb
```

Rails is a bit more complex. First, I installed the Rails gem, then when building the app I had to specify which gems I needed to use to get all aspects of the app up and running. Throughout this process, a number of dependecies were introduced, and I had to do a bit of wrangling with version numbers to get everything working properly. I also installed the Ruby Version Manager (RVM) and got more familiar with using git, GitHub, and Heroku.

I got burned by not paying close attention enough to my environment when going through the Hartl tutorial. For the first example app in the book, I used Rails 4.1 -- the latest version at the time. After finishing, I went back and saw that the Flatiron School [prework site](http://prework.flatironschool.com) recommended going through the Rails 3.2 edition fo the tutorial. I went back, installed Rails 3.2 and Ruby 1.9.3, and then made it through the first couple chapters of the tutorial without much issue.

The next day I was surprised to find that railstutorial.org had undergone a redesign, and the Rails 3.2 version of the book had gone behind a paywall. The Rails 4.0 version was still available for free -- and what an incredible free resource it is! -- so I tried to push forward by applying the instructions in the Rails 4.0 version to my Rails 3.2 app. This was a mistake. Eventually, I cut my losses and restarted the tutorial using Rails 4.0.

(As a side note, after writing the first draft of this blog post I made the same mistake as described above, but in reverse, on a [Treehouse](http://teamtreehouse.com) Rails tutorial. I ended up having to restart the tutorial using a different version of Rails. I really need to pay better attention to accurately setting up my dev environment!)
 
Whereas before I considered programming to simply be the act of writing code, after making a sample app in Rails I realized that getting the proper environment set up can often be half the battle. Understanding the tools that make up the technology stack is incredibly important and is something I want to learn more about going forward.


### 2. Read the Error Messages

Another misconception I had was that code should generally work, and when it doesn't it should be debugged. This notion was turned completely on its head thanks to TDD, where code first fails and subsequently is made to work.

Even though I was following the code of the tutorial closely, some unexpected errors (in addition to the expected ones) inevitably popped up. Until Andrew pointed this out to me, I didn't realize that I had unconsciously just been glazing over the error messages showing up in the terminal. Prior to this, my "process" was essentially:

*  See an error message surface.
*  Ignore its contents.
*  Immediately return to the text editor.
*  Guess what caused the error.

The error messages are there to help you; read them. This lesson seems really basic, but it is a great thing that I learned.


### 3. Power Through

Making a functioning Twitter-like app in Rails was hard. But that's OK -- I have only done it one time, and had never done anything like it before going through Hartl's tutorial. I expected to be able to "just get things" before going in (remember, I "knew" about coding), and found that it was nowhere near that simple. Even now, having completed the tutorial, I still have many questions and there are more areas that I don't understand than those I do. That's also OK -- I am going to be learning all about Rails when I start at the [Flatiron School](http://flatironschool.com) next month.

I tend to work slowly when I am trying to fully grasp the subject matter at hand or I am trying to do a really excellent job. I could have easily spent twice as much time on the Rails tutorial than I did, but it's probably a good thing that I didn't. Instead of dwelling on everything I didn't understand, I powered through and practiced "getting used to" the things I didn't understand. Rather than obsessively going down each rabbit hole, I tried to keep an eye on the big picture and take things in stride.


### Conclusion

I am excited to have begun learning how to program Rails applications and to be making progress on my path to becoming a professional web developer. Though I feel accomplished about completing the Hartl Rails Tutorial, working my way through it really made me realize how little I know and how much learning I have ahead of me. I am glad to have had a taste of the Rails development process and gleaned the lessons above.

I don't know how to program. It's the truth. Now that I've put that out there, the only way is up.