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
      var xhr = new XMLHttpRequest();
      xhr.open('GET', getHeartbeatURL());
    }

    function getHeartbeatURL() {
      var videoCurrentTime = parseInt(
        paella.player.videoContainer.currentTime() +
        paella.player.videoContainer.trimStart(),
        10
      );

      var url = 'https://';
      url += location.host + '/';
      url += 'usertracking/?';
      url += queryStringFromDict({
        _method: 'PUT',
        id: paella.player.videoIdentifier,
        type: 'HEARTBEAT',
        in: videoCurrentTime,
        out: videoCurrentTime,
        playing: false,
        resource: paella.matterhorn.resourceId,
        _: (new Date()).getTime()
      });

      // Example heartbeat URL:
      // https://localhost:3000/_method=PUT&id=74b6c02f-afbb-42bc-8145-344153a1792e&type=HEARTBEAT&in=0&out=0&playing=false&resource=%2F2015%2F03%2F33383%2FL10&_=1441381319430'
      return url;
    }

    function queryStringFromDict(dict) {
      var qs = '';
      for (key in dict) {
        if (qs.length > 0) {
          qs += '&';
        }
        qs += key + '=' + encodeURIComponent(dict[key]);
      }
      return qs;
    }
  }
};

Class("paella.plugins.HeartbeatSender", paella.EventDrivenPlugin, classDef);

paella.plugins.heartbeatSender = new paella.plugins.HeartbeatSender();
