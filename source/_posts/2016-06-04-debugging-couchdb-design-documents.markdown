---
layout: post
title: "Debugging CouchDB Design Documents"
date: 2016-06-04 15:40:09 -0400
comments: true
categories: 
---

When making changes to a CouchDB design document (or ddoc), I often use `curl` to make queries and see if the data returned is what I expected. Sometimes, however, this does not provide enough information to help me get to the bottom of why the ddoc does not behave as anticipated. Here is my process for debugging JavaScript code in CouchDB design documents. (Note: This blog post assumes CouchDB is [installed](https://pouchdb.com/guides/setup-couchdb.html#installing-couchdb) and running on  your machine.)

**TL;DR: I show you how to use `console.log` debugging inside of CouchDB design documents.**

## How to Configure CouchDB

The first step is to locate CouchDB's configuration settings on your machine. Type `couchdb -c` into the command line:
<pre>
$ couchdb -c
/usr/local/etc/couchdb/default.ini
/usr/local/etc/couchdb/local.ini
/usr/local/etc/couchdb/local.d/couchdb-lucene.ini
</pre>

This output is a list files containint of CouchDB's default configurations and any custom overrides you define. Open the `local.ini` file in your preferred text editor and navigate down to the `[log]` section. You may see the following text:

<pre>
[log]
;level = debug
</pre>

The leading semicolon indicates this line is commented out. I am not totally sure why CouchDB uses `.ini` files for its config files, as the database is primarily written in Erlang and contains a JavaScript runtime (SpiderMonkey). 

Uncomment this line (delete the semicolon), restart CouchDB, and you will see quite a bit of output in the console, starting with something like this:

<pre>
$ couchdb
Apache CouchDB 1.6.1 (LogLevel=debug) is starting.
Configuration Settings ["/usr/local/etc/couchdb/default.ini",
                        "/usr/local/etc/couchdb/local.ini",
                        "/usr/local/etc/couchdb/local.d/couchdb-lucene.ini"]:
# About 100 more lines of lots of nice config info follows
</pre>

This being CouchDB, we can of course set the log level using Couch's HTTP API:

<pre>
$ curl -X PUT 127.0.0.1:5984/_config/log/level -d '"info"'
"info"
</pre>

(Note that you will have to pass in admin credentials here if the CouchDB you're running is not in [admin party](http://guide.couchdb.org/draft/security.html#party) mode.)

The best part about this is that you don't have to restart the database, logging will begin immediately. Thanks, Erlang!

The CouchDB configuration settings can also be changed in the admin UI of Futon. Visit `http://localhost:5984/_utils`, log in if necessary, then click on "Configuration" on the righthand panel. If this looks familiar, it is because it is a web interface for the local config files listed when you ran `couchdb -c` above. You can edit the log level here as well -- navigate down to the "log" section, double click on the text next to "level" (should be "info"), type in "debug", and click the green check mark. You'll notice the following output gets logged by CouchDB:

<pre>
=SUPERVISOR REPORT==== 4-Jun-2016::15:23:18 ===
     Supervisor: {local,couch_primary_services}
     Context:    child_terminated
     Reason:     normal
     Offender:   [{pid,<0.258.0>},
                  {id,couch_log},
                  {mfargs,{couch_log,start_link,[]}},
                  {restart_type,permanent},
                  {shutdown,brutal_kill},
                  {child_type,worker}]

[info] [<0.157.0>] 127.0.0.1 - - PUT /_config/log/level 200
</pre>

The last line shows that under the hood the Futon UI is simply making the same `PUT` request over HTTP you made above using `curl` to change the log level. Above that there is a "Supervisor Report" from the CouchDB internals stating that the `couch_log` worker process was... abruptly?... restarted by the `couch_primary_services` supervisor process.

The CouchDB docs has a good roundup of [all of the different log levels](http://docs.couchdb.org/en/1.6.1/config/logging.html) Couch supports. I typically stick with "info" in development to have a window into all of the incoming requests to CouchDB being logged in real time, but I'll sometimes switch to "debug" mode to view in more detail all of the headers / cookies that are part of the incoming HTTP requests. (Note that neither of these settings are recommended for logging in production.) 

Now that you've set up CouchDB to be a bit more verbose, run:

<pre>
curl 127.0.0.1:5984
</pre>

Back in CouchDB, you'll see the following output:

<pre>
[debug] [<0.225.0>] 'GET' / {1,1} from "127.0.0.1"
Headers: [{'Accept',"*/*"},
          {'Host',"127.0.0.1:5984"},
          {'User-Agent',"curl/7.43.0"}]
[debug] [<0.225.0>] OAuth Params: []
[info] [<0.225.0>] 127.0.0.1 - - GET / 200
</pre>

Simpy perusing the logs of incoming requests and outgoing responses can be very informative and helpful if something is going wrong. But you can also take the debugging one step further with `log`.

## "`console.log` Debugging" Inside CouchDB

CouchDB exposes a global `log` function inside of design documents that allows you to write custom messages to CouchDB's logs. This is similar to using `console.log()` in the dev tools console in the browser or in node.

To see how this works in action, first create a new database and insert a design document:

<pre>
$ curl -X PUT 127.0.0.1:5984/test
{
  "ok": true
}
$ curl -X PUT 127.0.0.1:5984/test/_design/test \
> -d '{ "_id": "_design/test", "views": { "greetingDocs": { "map": "function(doc) { if (doc.hello) { log(\"This doc says hello, \" + doc.hello); emit(doc._id, null); } }", "reduce": "_count" } } }'
{
  "ok": true,
  "id": "_design/test",
  "rev": "1-ea73ae4cba8ca3ca7618c23185ef92d2"
}
</pre>

Here's roughly how that ddoc looks in JavaScript (sans stringified functions):

```js
{
  _id: "_design/test",
  views: {
    greetingDocs: {
      map: function(doc) {
        if (doc.hello) {
          log("This doc says hello, " + doc.hello);
          emit(doc._id, null);
        }
      },
      reduce: "_count"
    }
  }
}
```

Now that you've got a barebones design doc, you can see the logging at work by adding a new document to the `test` database:

<pre>
$ curl -X PUT 127.0.0.1:5984/test/one \
> -d '{ "_id": "one", "hello": "I am log" }'
{
  "ok": true,
  "id": "one",
  "rev": "1-6feff67ca27f6cc570f9ae43385730f8"
}
$ curl 127.0.0.1:5984/test/_design/test/_view/greetingDocs
{
  "rows": [
    { "key": null, "value" : 1 }
  ]
}
</pre>

In the couch logs you will see something like this:

<pre>
[debug] [<0.99.0>] 'GET' /test/_design/test/_view/greetingDocs {1,1} from "127.0.0.1"
Headers: [{'Accept',"*/*"},
          {'Host',"127.0.0.1:5984"},
          {'User-Agent',"curl/7.43.0"}]
[debug] [<0.99.0>] OAuth Params: []
[info] [<0.991.0>] Opening index for db: test idx: _design/test sig: "eff5145ec110e4f61dbe8a2b446588e8"
[info] [<0.996.0>] Starting index update for db: test idx: _design/test
[debug] [<0.715.0>] OS Process #Port<0.3200> Input  :: ["reset",{"reduce_limit":false,"timeout":5000}]
[debug] [<0.715.0>] OS Process #Port<0.3200> Output :: true
[debug] [<0.715.0>] OS Process #Port<0.3200> Input  :: ["add_fun","function(doc) { if (doc.hello) { log(\"This doc says hello, \" + doc.hello); emit(doc._id, null); } }"]
[debug] [<0.715.0>] OS Process #Port<0.3200> Output :: true
[debug] [<0.84.0>] New task status for <0.1001.0>: [{changes_done,3},
                                                    {database,<<"test">>},
                                                    {design_document,
                                                     <<"_design/test">>},
                                                    {progress,150},
                                                    {started_on,1465068874},
                                                    {total_changes,2},
                                                    {type,indexer},
                                                    {updated_on,1465068874}]
[debug] [<0.715.0>] OS Process #Port<0.3200> Input  :: ["map_doc",{"_id":"one","_rev":"1-6feff67ca27f6cc570f9ae43385730f8","hello":"I am log"}]
[debug] [<0.715.0>] OS Process #Port<0.3200> Output :: ["log","This doc says hello, I am log"]
[info] [<0.715.0>] OS Process #Port<0.3200> Log :: This doc says hello, I am log
[debug] [<0.715.0>] OS Process #Port<0.3200> Output :: [[["one",null]]]
[debug] [<0.991.0>] Updated index for db: test idx: _design/test seq: 2
[info] [<0.996.0>] Index update finished for db: test idx: _design/test
[debug] [<0.991.0>] Updated index for db: test idx: _design/test seq: 2
[info] [<0.99.0>] 127.0.0.1 - - GET /test/_design/test/_view/greetingDocs 200
</pre>

It looks a bit cryptic, but towards the bottom you might notice four lines in particular:

<pre>
[debug] [<0.715.0>] OS Process #Port<0.3200> Input  :: ["map_doc",{"_id":"one","_rev":"1-6feff67ca27f6cc570f9ae43385730f8","hello":"I am log"}]
[debug] [<0.715.0>] OS Process #Port<0.3200> Output :: ["log","This doc says hello, I am log"]
[info] [<0.715.0>] OS Process #Port<0.3200> Log :: This doc says hello, I am log
[debug] [<0.715.0>] OS Process #Port<0.3200> Output :: [[["one",null]]]
</pre>

On the third line (with `Log ::`) we can see our message from `log`! It's also interesting to see the `Input` and `Output` CouchDB is writing here. First, in the `Input` line, the doc with `_id` of `"one"` that you just `PUT` to the database is being run through something called `map_doc`. This produces two `Output`s: first the log, and then the doc's `_id` and `null`, which were emitted using `emit(doc._id, null)` in the `map` function of the `greetingDocs` view.

Running the same query on the view again will *not* write the same message to the log. My speculation is that CouchDB caches the results of the `map` and `reduce` functions in its views, so the `map` function won't be run again (and therefore our message won't be logged again) until either the ddoc changes or a new document is added to / updated in the database.

Let's update the doc to test this assumption:

<pre>
$ curl -X PUT 127.0.0.1:5984/test/one \
> -d '{ "_id": "one", "_rev": "1-6feff67ca27f6cc570f9ae43385730f8", "hello": "this is log()" }'
{
  "ok": true,
  "id": "one",
  "rev": "2-83ba9fe4df631f7e1af0b079baf1948b"
}
</pre>

Indeed, when we query the view again, the CouchDB logs contain what we're looking for:

<pre>
$ curl 127.0.0.1:5984/test/_design/test/_view/greetingDocs
{
  "rows": [
    { "key": null, "value" : 1 }
  ]
}
</pre>

<pre>
[debug] [<0.715.0>] OS Process #Port<0.3200> Input  :: ["map_doc",{"_id":"one","_rev":"2-83ba9fe4df631f7e1af0b079baf1948b","hello":"this is log()"}]
[debug] [<0.715.0>] OS Process #Port<0.3200> Output :: ["log","This doc says hello, this is log()"]
[info] [<0.715.0>] OS Process #Port<0.3200> Log :: This doc says hello, this is log()
[debug] [<0.715.0>] OS Process #Port<0.3200> Output :: [[["one",null]]]
</pre>

## Wrapping up

`log` is a convenient way to quickly do `console.log` debugging inside of your CouchDB design documents. While a full-fledged debugger REPL like the one shown in [this video](https://jhs.iriscouch.com/files/debugger/debug.html) seems quite amazing, you can still get quite far with good old `log`!
