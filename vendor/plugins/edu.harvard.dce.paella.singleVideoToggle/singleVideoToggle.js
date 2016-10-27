Class ("paella.plugins.SingleVideoTogglePlugin", paella.ButtonPlugin, {
  
  _isMaster: true,
  _slaveData: null,
  _mastereData: null,
  _seekToThisTime: null,
  _isSeekToTime: false,
  
  getDefaultToolTip: function () {
    return base.dictionary.translate("Switch videos");
  },
  getIndex: function () {
    return 451;
  },
  getAlignment: function () {
    return 'right';
  },
  getSubclass: function () {
    return "singleVideoToggleButton";
  },
  getName: function () {
    return "edu.harvard.dce.paella.singleVideoTogglePlugin";
  },
  setup: function () {
    // The sources are > 1 to get to this point
    this._masterData = paella.dce.sources[0];
    this._slaveData = paella.dce.sources[1];
    // re-enable video play/pause click for ios
    $(paella.player.videoContainer.domElement).click(function (event) {
      paella.player.videoContainer.firstClick = false;
    });
  },
  checkEnabled: function (onSuccess) {
    onSuccess(base.userAgent.system.iOS && paella.dce && paella.dce.sources && paella.dce.sources.length > 1);
  },
  
  action: function (button) {
    if (this._isMaster) {
      this._isMaster = false;
      this._toggleVideoSource(this._slaveData);
    } else {
      this._isMaster = true;
      this._toggleVideoSource(this._masterData);
    }
  },
  _toggleVideoSource: function (sourceData) {
    var thisClass = this;
    var source = null;
    source =[sourceData];
    // update to use paella 5 promise on current time query
    paella.player.videoContainer.currentTime().then(function (time) {
      thisClass._doSourceToggle(source);
    });
  },
  
  _doSourceToggle: function (source) {
    var self = this;
    paella.player.videoContainer.masterVideo().getVideoData().then(function (videoData) {
      self._setSeekToTime(videoData.currentTime);
      // Remove the existing video node
      self._removeVideoNodes();
      // Swap source type (presenter/master/0 & presentation/slave/1)
      var updatedSource = source[0];
      // augments attributes (e.g. type = "video/mp4")
      paella.player.videoLoader.loadStream(updatedSource);
      source[0] = updatedSource;
      paella.player.videoContainer.setStreamData(source).then(function () {
        // reload the video for iOS
        $("#playerContainer_videoContainer_1").load();
        self._toggleSeekToTime();
        paella.player.videoContainer.setVolume(videoData.volume).then(function () {
          self._addListenerBackOntoIosVideo();
          // completely swapping out sources requires res selection update
          self._rebuildResolutions();
        });
      }).fail(function (error) {
        self._failConsoleLog("PO: WARN - error during source reset" + error);
      });
    });
  },
  _rebuildResolutions: function () {
    if (paella.plugins.singleMultipleQualitiesPlugin) {
      paella.plugins.singleMultipleQualitiesPlugin.rebuildContent();
    }
  },

  _addListenerBackOntoIosVideo: function () {
    // re-enable click on screen
    paella.player.videoContainer.firstClick = false;
    // Since this is IOS, need to re-apply the full screen listener
    var player = document.getElementsByTagName("video")[0];
    player.addEventListener('webkitbeginfullscreen', function (event) {
      paella.player.play()
    },
    false);
    player.addEventListener('webkitendfullscreen', function (event) {
      paella.player.videoContainer.firstClick = false;
      paella.player.pause();
    },
    false);
  },

  // in Paella5, need to manually remove nodes before reseting video source data
  _removeVideoNodes: function () {
    var video1node = paella.player.videoContainer.container.getNode(paella.player.videoContainer.video1Id);
    var video2node = paella.player.videoContainer.container.getNode(paella.player.videoContainer.video2Id);
    // ensure swf object is removed
    if (typeof swfobject !== "undefined") {
      swfobject.removeSWF("playerContainer_videoContainer_1Movie");
    }
    paella.player.videoContainer.container.removeNode(video1node);
    if (video2node) {
      paella.player.videoContainer.container.removeNode(video2node);
    }
    // remove factory counts for Html5 videos
    if (paella.videoFactories.Html5VideoFactory) {
      paella.videoFactories.Html5VideoFactory.s_instances = 0;
    }
    base.log.debug("PO: removed video1 and video2 nodes");
  },
  _failConsoleLog: function (msg) {
    console.log(msg);
  },
  _toggleSeekToTime: function () {
    var self = this;
    var player = document.getElementsByTagName("video")[0];
    player.addEventListener('canplay', function (event) {
      if (self._isSeekToTime) {
        self._isSeekToTime = false;
        paella.player.videoContainer.seekToTime(self._seekToThisTime);
      }
    },
    false);
  },
  _setSeekToTime: function (time) {
    this._seekToThisTime = time;
    this._isSeekToTime = true;
  }
});

paella.plugins.singleVideoTogglePlugin = new paella.plugins.SingleVideoTogglePlugin();
