// PresentationOnlyPlugin purpose: Turn off presenter source to reduce bandwidth when presentation only view.
// One activation on qualities change (called directly).
// The crux: must set videoContainer sources and reload videos when changing from single to multi or multi to single
// The quirks:
//   - if last saved profile was presenterOnly, reload switches back to multi view default profile
//   - assumes 1:1 on res/quality numbers between source & master
// TODO: change debug lines to test asserts
Class ("paella.plugins.PresentationOnlyPlugin", paella.EventDrivenPlugin, {
  isCurrentlySingleStream: false,
  _master: null,
  _slave: null,
  _preferredMethodMaster: null,
  _preferredMethodSlave: null,
  // This profile must exist in the profile.json
  _presentationOnlyProfile: 'monostream',
  _currentQuality: '',
  _currentProfile: '',
  _isSeekToTime: false,
  _seekToThisTime: 0,
  
  getName: function () {
    return "edu.harvard.dce.paella.presentationOnlyPlugin";
  },
  
  getEvents: function () {
    return[paella.events.setProfile, paella.events.loadPlugins];
  },
  
  onEvent: function (eventType, params) {
    switch (eventType) {
      case paella.events.setProfile:
        this._currentProfile = params.profileName;
        break;
      case paella.events.loadPlugins:
        this._firstLoadAction();
        break;
    }
  },
  
  checkEnabled: function (onSuccess) {
    onSuccess(! paella.player.isLiveStream() && ! paella.player.videoContainer.isMonostream);
  },
  
  
  /**
   * Called directly by qualitiesPresentationPlugin
   * 1. if on single and mutli coming across, change to multi of passed res
   * 2. if on multi and single coming accross, change to single and passed res
   * 3. if on same data.type and different res change, change res
   * 4. if on same data.type and same res, don't do anything
   *
   */
  toggleResolution: function (data) {
    var thisClass = this;
    var defer = $.Deferred();
    var sources = null;
    var isSingle = paella.player.videoContainer.isMonostream;
    if (! isSingle && data.type === paella.plugins.singleMultipleQualitiesPlugin.singleStreamLabel) {
      thisClass._toggleMultiToSingleProfile(data);
    } else if (isSingle && data.type === paella.plugins.singleMultipleQualitiesPlugin.multiStreamLabel) {
      thisClass._toggleSingleToMultiProfile(data);
    } else if (data.label === thisClass._currentQuality) {
      base.log.debug("PO: no work needed, same quality " + data.label + ", reso:" + data.reso + ", reso2: " + data.reso2);
      thisClass._reenableQualityLabel();
    } else {
      // no stream source change needed, just pause and change source index
      paella.player.videoContainer.masterVideo().getVideoData().then(function (videoData) {
        // pause videos to temporarily stop update timers
        paella.player.videoContainer.pause().
        then(function () {
          thisClass._setQuality(data.index, !videoData.paused);
        });
      });
    }
    thisClass._currentQuality = data.label;
  },
  
  _getSources: function () {
    if (this._slave === null) {
      base.log.debug("PO: Getting  original stream sources");
      this._getStreamSources();
    }
  },
  
  _firstLoadAction: function () {
    if (this._currentProfile === '') {
      base.log.debug("PO: first time load.");
      this._currentProfile = base.cookies.get('lastProfile');
      if (this._presentationOnlyProfile === this._currentProfile) {
        base.log.debug("PO: saved profile is " + this._currentProfile + ", but changing to " + paella.player.config.defaultProfile);
        base.log.debug("PO: TODO... quality needs to reload monostream saved profile " + this._currentProfile);
        this.isCurrentlySingleStream = paella.player.videoContainer.isMonostream;
        this._currentProfile = paella.player.config.defaultProfile;
        this._triggerProfileUpdate();
      } else {
        this.isCurrentlySingleStream = paella.player.videoContainer.isMonostream;
      }
    }
  },
  
  _toggleMultiToSingleProfile: function (data) {
    base.log.debug("PO: toggle from Multi to Single with resolution " + data.reso);
    var thisClass = this;
    var sources = null;
    this._getSources();
    sources =[thisClass._slave];
    // update to use paella 5 promise on current time query
    paella.player.videoContainer.currentTime().then(function (time) {
      thisClass._doSourceToggle(sources, true, data, time);
      paella.plugins.viewModeTogglePlugin.turnOffVisibility();
    });
  },
  
  _toggleSingleToMultiProfile: function (data) {
    base.log.debug("PO: toggle from Single to Multi with master " + data.reso + " and slave " + data.reso2);
    var thisClass = this;
    var sources = null;
    this._getSources();
    sources =[thisClass._master, thisClass._slave];
    // using paella 5 promise on current time query
    paella.player.videoContainer.currentTime().then(function (time) {
      thisClass._doSourceToggle(sources, false, data, time);
      paella.plugins.viewModeTogglePlugin.turnOnVisibility();
    });
  },
  
  _triggerProfileUpdate: function () {
    // Trigger profile change to reset view
    paella.events.trigger(paella.events.setProfile, {
      profileName: this._currentProfile
    });
  },
  
  _setSeekToTime: function (time) {
    this._seekToThisTime = time;
    this._isSeekToTime = true;
  },
  
  _toggleSeekToTime: function () {
    if (this._isSeekToTime) {
      this._isSeekToTime = false;
      paella.player.videoContainer.seekToTime(this._seekToThisTime);
    }
  },
  
  _setQuality: function (qualityindex, wasPlaying) {
    var self = this;
    paella.player.videoContainer.setQuality(qualityindex).then(function () {
      // reset the time
      self._toggleSeekToTime();
      self._reenableQualityLabel();
      // ensure player view is resized
      paella.player.onresize();
      //start 'em up if needed
      if (wasPlaying) {
        paella.player.paused().then(function (stillPaused) {
          if (stillPaused) {
            paella.player.play();
          }
        });
      }
    },
    function () {
      console.log("PO: WARN - error during set quality inside");
      console.log(error);
    }).fail(function (error) {
      console.log("PO: WARN - error during set quality outside");
      console.log(error);
    });
  },
  
  _getStreamSources: function () {
    var self = this;
    var loader = paella.player.videoLoader;
    self._master = loader.streams[0];
    self._slave = loader.streams[1];
  },
  
  // in Paella5 setStreamData() loads master & slave videos, to they need to be unloaded first.
  _doSourceToggle: function (sources, isPresOnly, data, currentTime) {
    var self = this;
    if (self._slave === null) {
      base.log.error("PO: Stream resources were not properly retrieved at set up");
      return;
    }
    var wasSingle = paella.player.videoContainer.isMonostream;
    paella.player.videoContainer.masterVideo().getVideoData().then(function (videoData) {
      self._setSeekToTime(videoData.currentTime);
      // pause videos to temporarily stop update timers
      paella.player.videoContainer.pause().
      then(function () {
        self._removeVideoNodes();
        if (! wasSingle) {
          // set the cookie to monostream so setStreamData correctly sets single stream initialization
          base.cookies.set("lastProfile", self._presentationOnlyProfile);
        }
        if (sources !== null) {
          base.log.debug("PO: Updating videoContainer object sources, this reloads the video container(s)");
          paella.player.videoContainer.setStreamData(sources).then(function () {
            console.log("PO: successfully set stream sources");
            if (isPresOnly && ! wasSingle) {
              base.log.debug("PO: Changing from multi to single stream, monostream on is " + paella.player.videoContainer.isMonostream);
              // setStreamData has already loaded _presentationOnlyProfile from the cookie
            } else if (! isPresOnly && wasSingle) {
              base.log.debug("PO: Changing from single to multi-stream, monostream off is " + ! paella.player.videoContainer.isMonostream);
              self._currentProfile = paella.player.config.defaultProfile;
              self._triggerProfileUpdate();
            } else {
              base.log.debug("PO: WARN Unexpected toggle state.");
            }
            // reset the volume
            paella.player.videoContainer.setVolume(videoData.volume).then(function () {
              // finally, change the quality to index requested
              self._setQuality(data.index, ! videoData.paused);
            });
          }).fail(function (error) {
            console.log("PO: WARN - error during source reset");
            console.log(error);
          });
        }
      });
    });
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
    base.log.debug("PO: removed video1 and video2 nodes");
  },
  
  _reenableQualityLabel: function () {
    if (paella.plugins.singleMultipleQualitiesPlugin) {
      paella.plugins.singleMultipleQualitiesPlugin.turnOnVisibility();
    }
  }
});

paella.plugins.presentationOnlyPlugin = new paella.plugins.PresentationOnlyPlugin();