const { ToggleButton } = require('sdk/ui/button/toggle');
const { PageMod } = require('sdk/page-mod');
const { storage, on: onStorage } = require('sdk/simple-storage');
const { isPrivate } = require('sdk/private-browsing');
const tabs = require('sdk/tabs');
const { Panel } = require('sdk/panel');
const folder = require('sdk/self').data.url;
const { setTimeout } = require('sdk/timers');

var workers = [];
if (storage.timesPanelShown===undefined) storage.timesPanelShown = 0;
if (!storage.urls || !storage.urls.length) storage.domainRegs = ['http://www.example.com'];

const getWorker = function(tab, remove) {
  for (var i = workers.length - 1; i >= 0; i--) {
    if (workers[i].tab===tab)
      return remove ?
        workers.splice(i, 1)[0] : workers[i];
  };
}
 
const detach = function(tab) {
  button.state('tab', { checked: false });
  getWorker(tab, true).destroy();
}

function onAttach(worker) {
  workers.push(worker);
  //button is undefined when applying pagemod to existing tabs on startup
  if (button) button.state('tab', { checked: true });
  worker.tab.once('ready', detach);
}

const regexify = function(stringArray) {
  var regexArray = [];
  stringArray.forEach(function(string) {
    regexArray.push(new RegExp(string));
  });
  return regexArray;
}

var pageMod = PageMod({
  contentScriptFile: folder('content.js'),
  // contentScriptOptions: contentScriptOptions,
  attachTo: ['top'/*, 'existing'*/],
  include: regexify(storage.domainRegs),
  onAttach: function(worker) {
    onAttach(worker);
    if (storage.timesPanelShown>7) return; 
    // TODO: Show this once per domain rather than a specific number of times
    storage.timesPanelShown++;
    panel.show();
    setTimeout(function() {panel.hide()}, 4000);
  }
});

var addToPageMod = function(worker) {
  var { tab } = worker;
  /*console.assert(
    storage.urls.indexOf(url)===-1,
    'Why are we adding a URL to storage that\'s already there?'
  );*/
  worker.port.on('addDomain', function(domain) {
    var reString = 'https?:\\/\\/'+ domain +'\\/\\S+';
    if (storage.domainRegs.indexOf(reString)!==-1) return;
    var re = new RegExp(reString);
    if (!isPrivate(tab)) storage.domainRegs.push(reString);
    pageMod.include.add(re);
  });
}

var removeFromPageMod = function(worker) {
  worker.port.on('removeDomain', function(domain) {
    var reString = 'https?:\\/\\/'+ domain +'\\/\\S+';
    var index = storage.domainRegs.indexOf(reString);
    if (index===-1) return;
    storage.domainRegs.splice(index, 1);
    pageMod.include = regexify(storage.domainRegs);
  });
  worker.port.emit('removeDomain');
  // console.assert(i===1, 'Removed ' + i + 'URLs instead of 1 from stored URLs.');
}

const button = ToggleButton({
  id: 'no-fixed',
  label: 'Remove fixed elements',
  icon: {
    '16': './icon_16.png',
    '32': './icon_32.png',
    '64': './icon_64.png'
  },
  onClick: function(state) {
    button.state('window', null);
    var { checked } = button.state('tab');
    var { activeTab } = tabs;
    if (!checked) {
      var worker = activeTab.attach({
        contentScriptFile: folder('content.js'),
      });
      onAttach(worker);
      addToPageMod(worker);
    } else {
      // button.state('tab', null);
      removeFromPageMod(getWorker(activeTab));
      detach(activeTab);
    }
  }
});

const panel = Panel({
  contentURL: folder('panel.html'),
  position: button,
  width: 331,
  height: 45
});

onStorage('OverQuota', function() {
  storage.domainRegs.splice(0, 20);
});