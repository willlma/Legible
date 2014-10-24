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

const getWorker = function(tab) {
  for (var i = workers.length - 1; i >= 0; i--) {
    if (workers[i].tab===tab) return workers[i];
  }
}
 
const detach = function(worker) {
  button.state('tab', { checked: false });
  worker.destroy();
  var index = workers.indexOf(worker);
  if (index!==-1) workers.splice(index, 1); 

}

function onAttach(worker) {
  workers.push(worker);
  //button is undefined when applying pagemod to existing tabs on startup
  if (button) button.state('tab', { checked: true });
  worker.tab.once('ready', detach.bind(this, worker));
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

var createReString = function(domain) {
  return 'https?:\\/\\/'+ domain +'\\/\\S+';
}

var addToPageMod = function(tab, domain) {
  // var { tab } = worker;
  /*console.assert(
    storage.urls.indexOf(url)===-1,
    'Why are we adding a URL to storage that\'s already there?'
  );*/
  var reString = createReString(domain);
  if (storage.domainRegs.indexOf(reString)!==-1) return;
  if (!isPrivate(tab)) storage.domainRegs.push(reString);
  debugger;
  pageMod.include.add(new RegExp(reString));
}

var removeFromPageMod = function(worker) {
  worker.port.on('removeDomain', function(domain) {
    var reString = createReString(domain);
    var index = storage.domainRegs.indexOf(reString);
    if (index===-1) return;
    storage.domainRegs.splice(index, 1);
    pageMod.include = regexify(storage.domainRegs);
    detach(worker);
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
        contentScript: "self.port.emit('addDomain', location.hostname)",
        contentScriptFile: folder('content.js')
      });
      worker.port.on('addDomain', addToPageMod.bind(this, activeTab));
      onAttach(worker);
    } else removeFromPageMod(getWorker(activeTab));
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