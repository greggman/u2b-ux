# u2b-ux

A better UX for Youtube

![](https://github.com/greggman/u2b-ux/blob/main/screenshots/u2b-ux-01.jpg?raw=true)

---

Okay, probably not a better UX but .... It's frustrating that 15-20% of
Youtube's suggestions are videos I've already watched. And,
it's also frustrating that YouTube makes it hard to remove
these bad suggestion AND tell it why. It's like 5 tedious steps.

So, I wrote this extension. It adds 2 buttons to every thumbnail.

* [👎] Don't Like
* [👁] Already Watched

Just one click to tell youtube to stop suggesting this video.

Second, I also dislike YouTube suggesting playlists. So, this
extension hides them.

Of course it's super brittle

1. It assumes YouTube doesn't change the page structure or keywords

   So, it will probably break often. We'll see how motivated I am
   to keep it working 😰

2. It searches for options by English.

   YouTube provides no useful info on which UI elements do what
   so instead the extension has to search for things like
   "Not interested" and "I've already watched that video".

   This means it won't work in another language where those
   prompts say different thins.

