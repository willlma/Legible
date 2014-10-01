
(function() {

const url = location.href;
const domain = location.hostname;
self.port.emit('addDomain', domain);
self.port.on('removeDomain', function() {
  self.port.emit('removeDomain', domain);
});

var debounce = function(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    }
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context)
  }
}



var tagNames = [];
var allElems = document.querySelectorAll('*');
var hiddenElems = [];
const hideElems = function(first) {
  [].forEach.call(allElems, function(elem) {
    var style = getComputedStyle(elem);
    if (!style || style.position!=='fixed') return;

    var { position, display } = elem.style;
    if (position || display)
      var item = {
        elem: elem,
        position: position,
        display: display
      };
    if (first) elem.style.position = 'absolute';
    else elem.style.display = 'none';
    hiddenElems.push(item ? item : elem);
    if (tagNames.indexOf(elem.tagName)===-1) tagNames.push(elem.tagName);
  });
}

/*var i = 0, intervalID = setInterval(function() {
  hideElems();
  if (++i > 20) clearInterval(intervalID);
}, 500);*/


hideElems();
window.addEventListener('scroll', debounce(hideElems, 500));

var preventPropagation = function(evt) {
  evt.stopPropagation();
}
window.addEventListener('scroll', preventPropagation, true);

self.port.on('detach', function() {
  if (!location || location.href!==url) return;
  window.removeEventListener('scroll', preventPropagation, true);
  // TODO: put the elements back
  hiddenElems.forEach(function(item) {
    var elem, display;
    if (item instanceof HTMLElement)
      elem = item,
      display = position = '';
    else
      elem = item.elem,
      position = item.position,
      display = item.display; 
    elem.style.position = position;
    elem.style.display = display;
  });
});
  
})();
