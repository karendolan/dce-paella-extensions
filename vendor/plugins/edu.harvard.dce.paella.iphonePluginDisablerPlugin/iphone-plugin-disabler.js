// MATT-2217 #DCE disable fullscreen & slide frame plugin on iPhone device
// This plugin waits 200ms (changed via config) after the "loadPlugins" event before
// overriding the only param that can disable a UPV plugin after it's been loaded (its default min window size). 
Class (
"paella.plugins.IphonePluginDisablerPlugin", paella.EventDrivenPlugin, {
  _actiondelay: 200,
  setup: function () {
    // override the default via config
    this._actiondelay = this.config.actiondelay || this._actiondelay;
  },
  getName: function () {
    return "edu.harvard.dce.paella.iphonePluginDisablerPlugin";
  },
  
  getEvents: function () {
    return[paella.events.loadPlugins];
  },
  
  onEvent: function (event, params) {
    this.disable();
  },
  checkEnabled: function (onSuccess) {
    onSuccess(navigator.userAgent.match(/(iPhone)/g));
  },
  
  disable: function () {
    window.setTimeout(function () {
      // Not a fan, but need to give plugins a chance to load before overriding the attributes.
      paella.plugins.fullScreenPlugin.getMinWindowSize = function () {
        return 10000;
      }
      paella.plugins.frameControlPlugin.getMinWindowSize = function () {
        return 10000;
      }
    },
    200);
  }
});

paella.plugins.iphonePluginDisablerPlugin = new paella.plugins.IphonePluginDisablerPlugin();