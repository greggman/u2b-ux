{
  function log(...args) {
    console.log(...args);
  }

  const settings = {
    watchedThreshold: 20,
  };

  const wait = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

  log('ux extension running');
  const eventRE = /on([A-Z])(\w+)/;
  function createElem(tag, attrs = {}) { 
    const elem = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
          elem[key][k] = v;
        }
      } else if (typeof value === 'function') {
        const m = eventRE.exec(key);
        if (!m) {
          throw new Error('bad event: ${key}');
        }
        const eventType = `${m[1].toLowerCase()}${m[2]}`;
        elem.addEventListener(eventType, value);
      } else if (key.startsWith('data')) {
        const k = `${key[4].toLowerCase()}${key.substr(5)}`;
        elem.dataset[k] = value;
      } else if (elem[key] === undefined) {
        elem.setAttribute(key, value);
      } else {
        elem[key] = value;
      }
    }
    return elem;
  }

  function addElem(tag, attrs = {}, children  = []) {
    const elem = createElem(tag, attrs);
    for (const child of children) {
      elem.appendChild(child);
    }
    return elem;
  }

  function clickElement(elem) {
    const rect = elem.getBoundingClientRect();
    const ev = new PointerEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: rect.x + rect.width / 2, 
      clientY: rect.y + rect.height / 2,
    });
    elem.dispatchEvent(ev);
  }

  function findAndClickOnChild(parentElem, selector, filterFn, errorMsg = '') {
    const elems = [...parentElem.querySelectorAll(selector)];
    const items = elems.filter(filterFn);
    if (items.length === 1) {
      clickElement(items[0]);
      return true;
    } else {
      console.error(errorMsg, elems);
      return false;
    }
  }

  async function markAsNotInterestedForReason(thumbElem, reasonRE) {
    log('notInterested');
    const button = thumbElem.querySelector('button')?.querySelector('yt-icon');
    if (button) {
      //log('sending: click:', button);
      //const ev = new MouseEvent('click', {});
      clickElement(button);
      
      // hacky: should we use a MutationObserver?
      await wait();

      // Will only work in English :(
      {
        const re = /not interested/i;
        if (!findAndClickOnChild(
                document.body,
                'ytd-menu-service-item-renderer', 
                elem => re.test(elem.textContent),
                "Could not find 'Not Interested' menu item")) {
              return;
            }
      }

      // hacky: should we use a MutationObserver?
      await wait();

      // Will only work in English :(
      {
        const re = /tell us why/i;
        if (!findAndClickOnChild(
                thumbElem,
                'ytd-button-renderer',
                elem => re.test(elem.textContent),
                "'Tell Us Why' item")) {
          return;
        }
      }

      await wait(250);

      {
        if (!findAndClickOnChild(
                document.body,
                'tp-yt-paper-checkbox',
                elem => reasonRE.test(elem.textContent),
                'Can not find checkbox')) {
          return;
        }
      }

      await wait(50);

      {
        const re = /submit/i;
        if (!findAndClickOnChild(
                document.body,
                'tp-yt-paper-button',
                elem => re.test(elem.textContent),
                'Can not find submit')) {
          return;
        }
      }

    }
  }

  function notInterested(thumbElem) {
    markAsNotInterestedForReason(thumbElem, /I don't like the video/i);
  }

  function watched(thumbElem) {
    markAsNotInterestedForReason(thumbElem, /I've already watched the video/i);
  }

  function unhideViewed(thumbElem, hiddenUIElem) {
    log('unhide viewed');
    thumbElem.style.display = '';
    hiddenUIElem.remove();
  }

  function hideThumbnail(thumbElem, msg = '') {
    // check if we already hid it.
    if (thumbElem.parentElement.querySelector('.gux-hidden')) {
      return;
    }

    //thumbElem.style.visibility = 'hidden';
    thumbElem.style.display = 'none';
    const titleElem = thumbElem.querySelector('#video-title');
    const hiddenUIElem = el('div', {className: 'gux-hidden'}, [
      el('div', {textContent: titleElem ? titleElem.textContent : '*untitled*'}),
      el('div', {textContent: msg}),
      el('button', {
        type: 'button',
        textContent: 'un-hide',
        onClick: () => unhideViewed(thumbElem, hiddenUIElem)}),
    ]);
    thumbElem.parentElement.appendChild(hiddenUIElem);
  }

  function hideIfAlreadyViewed(progressElem, thumbElem) {
    try {
      const progress = parseInt(progressElem.style.width);
      if (progress >= settings.watchedThreshold) {
        hideThumbnail(thumbElem, `progress: ${progress}%`);
      }
    } catch (e) {
      console.error(e);
    }
  }


  const el = addElem;

  /*
  log('adding style');
  document.body.appendChild(el('style', {
    textContent: `
      .gux-thumbnail {
        position: absolute;
        left: 0;
        top: 0;
      }
      .gux-button {
        width: 20px;
        height: 20px;
        margin: 2px;
        display: block;
      }
      .gux-not-interested {
        background: red;
      }
      .gux-watched: {
        background: blue;
      }
    `,
  }));
  */

  function forEachAddedNode(fn) {
    return function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(fn);
      });
    };
  }

  {
    const observer = new MutationObserver(forEachAddedNode(modThumbnails));
    const elem = document.querySelector("#contents.ytd-rich-grid-renderer");
    if (elem) {
      observer.observe(elem, { subtree: false, childList: true });
    } else {
      log('no "#contents.ytd-rich-grid-renderer" found');
    }
  }
  setTimeout(function checkLate() {
    log('checkLate');
    document.querySelectorAll("#contents.ytd-item-section-renderer").forEach(elem => {
      const observer = new MutationObserver(forEachAddedNode(modThumbnails));
      observer.observe(elem, { subtree: false, childList: true });
      elem.querySelectorAll('ytd-compact-video-renderer').forEach(addStuff);
      elem.querySelectorAll('ytd-compact-playlist-renderer').forEach(addStuff);
    });
  }, 1500);

  function addStuff(elem) {
    if (elem.querySelector('.gux-thumbnail')) {
      return;
    }
    //log('addStuff:', elem);

    const observer = new MutationObserver(forEachAddedNode(node => {
      if (node.id === 'progress') {
        hideIfAlreadyViewed(node, elem);
        observer.disconnect();
      }
    }));
    observer.observe(elem, { subtree: true, childList: true });

    elem.appendChild(el('div', {className: 'gux-thumbnail'}, [
      el('button', {type: 'button', textContent: '👎', dataGuxTooltip: 'not interested', className: 'gux-button gux-not-interested', onClick: () => notInterested(elem)}),
      el('button', {type: 'button', textContent: '👁', dataGuxTooltip: 'already watched', className: 'gux-button gux-watched', onClick: () => watched(elem)}),
    ]));

    // check for playlists
    if (elem.querySelector('[href*=start_radio]')) {
      hideThumbnail(elem, '[playlist]');
      //notInterested(elem);
    } else if (elem.nodeName === 'YTD-COMPACT-PLAYLIST-RENDERER') {
      hideThumbnail(elem.children[0], '[playlist]');
    }
  }

  function modThumbnails(root) {
    root.querySelectorAll('ytd-rich-grid-media').forEach(addStuff);
    root.querySelectorAll('ytd-video-preview').forEach(addStuff);
    root.querySelectorAll('ytd-compact-video-renderer').forEach(addStuff);
    root.querySelectorAll('ytd-compact-playlist-renderer').forEach(addStuff);
    if (root.nodeName.toLowerCase() === 'ytd-video-preview' ||
        root.nodeName.toLowerCase() === 'ytd-compact-video-renderer' ||
        root.nodeName.toLowerCase() === 'ytd-compact-playlist-renderer') {
        addStuff(root);
    }
  }
  modThumbnails(document);
}
