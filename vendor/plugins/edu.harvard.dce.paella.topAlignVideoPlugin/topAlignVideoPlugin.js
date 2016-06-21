// TopAlignVideoPlugin
// purpose: Video takes all top space to provide non-overlapping room for the control bar.
// MATT-1999 Top aligned video required to embed player compactly in iframe without obscursing video with control bar.
// Impl Strategy: top align video container and video elemements to overwrite default core calculations.
Class ("paella.plugins.TopAlignVideoPlugin", paella.EventDrivenPlugin, {
  
  getName: function () {
    return "edu.harvard.dce.paella.topAlignVideoPlugin";
  },
  
  getEvents: function () {
    return[paella.events.setProfile, paella.events.singleVideoReady, paella.events.resize];
  },
  
  checkEnabled: function (onSuccess) {
    // expecting ?align=top in url
    var topAlign = paella.utils.parameters.get('align');
    onSuccess((topAlign == 'top'));
  },
  
  onEvent: function (eventType, params) {
    base.log.debug("Top align recieved event " + eventType);
    if (eventType == 'paella:setprofile') {
      setTimeout(this._topAlign(), 10000);
    } else {
     this._topAlign(); 
    }
  },
  
  _topAlign: function(){
    // MATT-1999 Align video container and elements to top
    if (!paella.player.videoContainer) return;
    paella.player.videoContainer.container.domElement.style.top = "0%";
    var elementChildren = paella.player.videoContainer.container.domElement.children;
    for (var i = 0; i < elementChildren.length; i++) {
      base.log.debug("Top aligning " + elementChildren[i].id + ", " + elementChildren[i].style.top);
      elementChildren[i].style.top = "0%";
      base.log.debug("Top aligned " + elementChildren[i].id + ", " + elementChildren[i].style.top);
    }
  }
  
});

paella.plugins.topAlignVideoPlugin = new paella.plugins.TopAlignVideoPlugin();