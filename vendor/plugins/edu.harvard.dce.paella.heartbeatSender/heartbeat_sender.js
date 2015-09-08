// A version of the deprecated es.upv.paella.UserTrackingCollectorPlugIn, 
// shaved down to just send the heartbeat.

var classDef = {
  heartbeatTimer:null,

  getName: function() {
    return "edu.harvard.dce.paella.heartbeatSender";
  },

  setup: function() {
    var thisClass = this;
  
    if (this.config.heartBeatTime > 0) {
      this.heartbeatTimer = new base.Timer(
        registerHeartbeat, this.config.heartBeatTime
      );
      this.heartbeatTimer.repeat = true;
    }

    function registerHeartbeat(timer) {
      thisClass.registerEvent('HEARTBEAT'); 
    }
  }
};

Class("paella.plugins.HeartbeatSender", paella.EventDrivenPlugin, classDef);

paella.plugins.heartbeatSender = new paella.plugins.HeartbeatSender();
