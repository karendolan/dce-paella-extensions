Class ("paella.plugins.ResizeLiveStream",paella.EventDrivenPlugin,{
  getName: function() {
    return "edu.harvard.dce.paella.resizeLiveStream";
  },

  getEvents: function() {
    return [paella.events.resize];
  },

  resizeStreamingContainer: function(videoData) {
   var optimalWidth;
    var optimalHeight;
    var videoContainer = $('#playerContainer_videoContainer_container');

    var containerWidth = videoContainer.width();
    var containerHeight = videoContainer.height();

    var streamRes = videoData.res;

    var newMaxWidth = (streamRes.w * containerHeight) / streamRes.h;
    var newMaxHeight = (containerWidth * streamRes.h) / streamRes.w;

    if(newMaxWidth > containerWidth) {
      optimalWidth = containerWidth;
      optimalHeight = newMaxHeight;
    } else {
      optimalWidth = newMaxWidth;
      optimalHeight = containerHeight;
    }
    var marginOffset = (containerHeight - optimalHeight) / 2;

    // Paella5 rtmp object tag identifier
    $('#playerContainer_videoContainer_1Movie').attr({
      height: optimalHeight,
      width: optimalWidth
    }).css({marginTop: marginOffset + 'px'});
  },

  onEvent: function(event, params){
    var self = this;
    paella.player.videoContainer.masterVideo().getVideoData().then(function (videoData) {
      self.resizeStreamingContainer(videoData);
    });
  },

  checkEnabled:function(onSuccess) {
    onSuccess( paella.player.isLiveStream());
  }
});

paella.plugins.resizeLiveStream = new paella.plugins.ResizeLiveStream();
