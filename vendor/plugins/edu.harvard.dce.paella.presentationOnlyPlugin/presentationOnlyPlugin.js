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
    return[paella.events.setProfile, paella.events.singleVideoReady];
  },

  checkEnabled: function (onSuccess) {
    onSuccess(! paella.player.isLiveStream() && ! paella.player.videoContainer.isMonostream);
  },

  onEvent: function (eventType, params) {
    var thisClass = this;
    switch (eventType) {

      case paella.events.setProfile:
        this._currentProfile = params.profileName;
        break;

      // Mitigate seek to time race condition by seeking on video loaded event
      case paella.events.singleVideoReady:
        if (this._currentProfile === '') {
          this._firstLoadAction();
        } else {
          this._toggleSeekToTime();
        }
        break;
    }
  },

/**
 * Called directly by qualitiesPresentationPlugin
 * 1. if on single and mutli coming across, change to multi of passed res
 * 2. if on multi and single coming accross, change to single and passed res
 * 3. if on same type and different res change, change res
 * 4. if on same type and same res, don't do anything
 *
 */
  toggleResolution: function (label, reso, reso2, type) {
    var thisClass = this;
    var sources = null;
    if (thisClass._slave === null) {
      base.log.debug("PO: Getting  original stream sources");
      thisClass._getStreamSources();
    }
    if (!thisClass.isCurrentlySingleStream && type === paella.plugins.multipleQualitiesPlugin.singleStreamLabel) {
      thisClass._toggleMultiToSingleProfile(reso, reso2);
    } else if (thisClass.isCurrentlySingleStream && type === paella.plugins.multipleQualitiesPlugin.multiStreamLabel) {
      thisClass._toggleSingleToMultiProfile(reso, reso2);
    } else if (label === thisClass._currentQuality) {
      base.log.debug("PO: no work needed, same quality " + label + ", reso:" + reso + ", reso2: " + reso2);
    } else if (label !== thisClass._currentQuality && ! thisClass.isCurrentlySingleStream) {
      base.log.debug("PO: Multi view, changing resolution from " + thisClass._currentQuality + " to " + label + ". Calling default reload.");
      paella.player.reloadVideos(reso, reso2);
    } else if (label !== thisClass._currentQuality && thisClass.isCurrentlySingleStream) {
      base.log.debug("PO: Single view, changing resolution from " + thisClass._currentQuality + " to " + label + ". Calling default reload.");
      paella.player.reloadVideos(reso, reso2);
    }
    thisClass._currentQuality = label;
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
        this.isCurrentlySingleStream = false;
        this._currentProfile = paella.player.config.defaultProfile;
        this._triggerProfileUpdate();
      } else {
        this.isCurrentlySingleStream = false;
      }
    }
  },

  _toggleMultiToSingleProfile: function (reso, reso2) {
    base.log.debug("PO: toggle from Multi to Single with resolution " + reso);
    var thisClass = this;
    var sources = null;
    this._getSources();
    sources =[ {
      data: thisClass._slave, type: thisClass._preferredMethodSlave
    },
    null];
    thisClass._doToggle(sources, true, reso, reso2);
    paella.plugins.viewModeTogglePlugin.turnOffVisibility();
  },

  _toggleSingleToMultiProfile: function (reso, reso2) {
    base.log.debug("PO: toggle from Single to Multi with master " + reso + " and slave " + reso2);
    var thisClass = this;
    var sources = null;
    this._getSources();
    sources =[ {
      data: thisClass._master, type: thisClass._preferredMethodMaster
    }, {
      data: thisClass._slave, type: thisClass._preferredMethodSlave
    }];
    thisClass._doToggle(sources, false, reso, reso2);
    paella.plugins.viewModeTogglePlugin.turnOnVisibility();
  },

  _changeToPresentationOnlyStream: function (reso, reso2) {
    this._swapTags();
    paella.player.videoContainer.setMonoStreamMode();
    paella.player.videoContainer.reloadVideos(reso, reso2);
  },

  _changeBacktoMutliStream: function (reso, reso2) {
    paella.player.videoContainer.reloadVideos(reso, reso2);
    paella.player.videoContainer.isSlaveReady = true;
    paella.player.videoContainer.isMonostream = false;
  },

  _changePresentationResolution: function (reso, reso2) {
    base.log.debug("PO: current master height (2) " + paella.player.videoContainer.currentMasterVideoData.res.h);
    paella.player.videoContainer.reloadVideos(reso, reso2);
  },

  _triggerProfileUpdate: function () {
    // Trigger profile change to reset view
    paella.events.trigger(paella.events.setProfile, {
      profileName: this._currentProfile
    });
  },

  _setSeekToTime: function(){
   this._seekToThisTime = paella.player.videoContainer.currentTime();
   this._isSeekToTime = true;
 },

  _toggleSeekToTime: function() {
    if (this._isSeekToTime) {
      this._isSeekToTime = false;
      paella.player.videoContainer.seekToTime(this._seekToThisTime);
    }
  },

  _getStreamSources: function () {
    var self = this;
    var loader = paella.initDelegate.initParams.videoLoader;
    self._preferredMethodMaster = loader.getPreferredMethod(0);
    self._preferredMethodSlave = loader.getPreferredMethod(1);
    self._master = loader.streams[0];
    self._slave = loader.streams[1];
  },

  _swapTags: function () {
    var video1 = $('#' + paella.player.videoContainer.video1Id);
    var video2 = $('#' + paella.player.videoContainer.video2Id);

    video1.attr('id', paella.player.videoContainer.video2Id);
    video2.attr('id', paella.player.videoContainer.video1Id);

    video1.addClass('slaveVideo');
    video1.removeClass('masterVideo');
    video1.volume = 0;

    video2.addClass('masterVideo');
    video2.removeClass('slaveVideo');
    video2.volume = 1;

    var tempMaster = paella.player.videoContainer.currentMasterVideoRect;
    paella.player.videoContainer.currentMasterVideoRect = paella.player.videoContainer.currentSlaveVideoRect;
    paella.player.videoContainer.currentSlaveVideoRect = tempMaster;
    base.log.debug("PO: swapped video1 and video2");
  },

  _doToggle: function (sources, isPresOnly, reso, reso2) {
    var self = this;
    if (self._slave === null) {
      base.log.error("PO: Stream resources were not properly retrieved at set up");
      return;
    }
    var isPaused = paella.player.videoContainer.paused();
    self._setSeekToTime();
    var currentMaster = paella.player.videoContainer.currentMasterVideoData;
    if (sources !== null) {
      base.log.debug("PO: Updating videoContainer object sources");
      paella.player.videoContainer.setSources(sources[0], sources[1]);
    }

    if (isPresOnly && ! self.isCurrentlySingleStream) {
      base.log.debug("PO: Change to single-stream: current master res height (2) " + paella.player.videoContainer.currentMasterVideoData.res.h);
      self._changeToPresentationOnlyStream(reso, reso2);
      base.log.debug("PO: Is monostream " + paella.player.videoContainer.isMonostream);
      // Change to single view
      self._currentProfile = self._presentationOnlyProfile;
      self._triggerProfileUpdate();
    } else if (! isPresOnly && self.isCurrentlySingleStream) {
      base.log.debug("PO: Change back to multi-stream: current master res height (2) " + paella.player.videoContainer.currentMasterVideoData.res.h);
      self._changeBacktoMutliStream(reso, reso2);
      base.log.debug("PO: Is monostream " + paella.player.videoContainer.isMonostream);
      // change to default multi-view profile
      self._currentProfile = paella.player.config.defaultProfile;
      self._triggerProfileUpdate();
    } else {
      base.log.debug("PO: Just loading a different single-stream resolution: current master res height (2) " + paella.player.videoContainer.currentMasterVideoData.res.h);
      self._changePresentationResolution(reso, reso2);
      base.log.debug("PO: Is monostream " + paella.player.videoContainer.isMonostream);
    }

    //start 'em up
    if (!isPaused && paella.player.paused()) {
      paella.events.trigger(paella.events.play);
    }

    base.log.debug("PO: setting isPresOnly from " + self.isCurrentlySingleStream + "  to " + isPresOnly);
    self.isCurrentlySingleStream = isPresOnly;
  }
});

paella.plugins.presentationOnlyPlugin = new paella.plugins.PresentationOnlyPlugin();