// based on es.upv.paella.multipleQualitiesPlugin, "paella.plugins.MultipleQualitiesPlugin"
Class ("paella.plugins.MultiplePresentationQualitiesPlugin", paella.ButtonPlugin, {
  currentUrl: null,
  currentMaster: null,
  currentSlave: null,
  currentLabel:'',
  availableMasters:[],
  availableSlaves:[],
  showWidthRes: null,
  _domElement: null,
  // to filter out presentations without a matching file str match
  // the default value can be changed by the config file.
  _presenterHasAudioTag: 'multiaudio',
  _isCurrentlySingleStream: false,
  presentationOnlyLabel: 'Go_to_Presentation_Only',
  singleStreamLabel: 'SINGLESTREAM',
  bothVideosLabel: 'Go_to_Both_Videos',
  multiStreamLabel: 'MULTISTREAM',
  toggleButton: null,
  singleLabelButton: null,
  multiLabelButton: null,

  getAlignment: function () {
    return 'right';
  },
  getSubclass: function () {
    return "showMultipleQualitiesPlugin";
  },
  getIndex: function () {
    return 2030;
  },
  getMinWindowSize: function () {
    return 550;
  },
  getName: function () {
    return "edu.harvard.edu.paella.presentationQualitiesPlugin";
  },
  getDefaultToolTip: function () {
    return base.dictionary.translate("Change video quality");
  },

  checkEnabled: function (onSuccess) {
    var key, j;
    this.currentMaster = paella.player.videoContainer.currentMasterVideoData;
    this.currentSlave = paella.player.videoContainer.currentSlaveVideoData;

    var minVerticalRes = parseInt(this.config.minVerticalRes);
    var maxVerticalRes = parseInt(this.config.maxVerticalRes);
    if (this.config.presenterHasAudioTag) {
      this._presenterHasAudioTag = this.config.presenterHasAudioTag;
    }

    // Search for the resolutions
    var allMasterSources = paella.player.videoContainer.masterVideoData.sources;

    for (key in allMasterSources) {
      for (j = 0; j < allMasterSources[key].length;++ j) {
        if ((allMasterSources[key][j].type == this.currentMaster.type)) {
          if ((isNaN(minVerticalRes) == false) && (parseInt(allMasterSources[key][j].res.h) < minVerticalRes)) {
            continue;
          }
          if ((isNaN(maxVerticalRes) == false) && (parseInt(allMasterSources[key][j].res.h) > maxVerticalRes)) {
            continue;
          }
          this.availableMasters.push(allMasterSources[key][j]);
        }
      }
    }
    if (this.currentSlave) {
      var allSlaveSources = paella.player.videoContainer.slaveVideoData.sources;
      for (key in allSlaveSources) {
        for (j = 0; j < allSlaveSources[key].length;++ j) {
          if ((allSlaveSources[key][j].type == this.currentSlave.type)) {
            if ((isNaN(minVerticalRes) == false) && (parseInt(allSlaveSources[key][j].res.h) < minVerticalRes)) {
              continue;
            }
            if ((isNaN(maxVerticalRes) == false) && (parseInt(allSlaveSources[key][j].res.h) > maxVerticalRes)) {
              continue;
            }
            this.availableSlaves.push(allSlaveSources[key][j]);
          }
        }
      }
    }

    // Sort the available resolutions
    function sortfunc(a, b) {
      var ia = parseInt(a.res.h);
      var ib = parseInt(b.res.h);
      return ((ia < ib) ? -1: ((ia > ib) ? 1: 0));
    }

    this.availableMasters.sort(sortfunc);
    this.availableSlaves.sort(sortfunc);

    var isenabled = (this.availableMasters.length > 1 || this.availableSlaves.length > 1);
    onSuccess(isenabled);
  },

  setup: function () {
    var self = this;
    //RELOAD EVENT
    paella.events.bind(paella.events.singleVideoReady, function (event, params) {
      self.turnOnVisibility();
      self.setQualityLabel();
    });

    if (base.dictionary.currentLanguage() == "es") {
      var esDict = {
        'Presenter': 'Presentador',
        'Slide': 'Diapositiva'
      };
      base.dictionary.addDictionary(esDict);
    }
    this.setQualityLabel();

    //config
    self.showWidthRes = (self.config.showWidthRes !== undefined) ? self.config.showWidthRes: true;
  },

  getButtonType: function () {
    return paella.ButtonPlugin.type.popUpButton;
  },

  buildContent: function (domElement) {
    var self = this;
    self._domElement = domElement;
    var w, h, d, e, b = 0;
    var percen1, percen2, reso2, act_percen;
    percen1 = 100 / this.availableMasters.length;
    percen2 = 100 / this.availableSlaves.length;

    if (this.availableSlaves.length > 0 && ! this._isFiltered()) {
      this._buildSingleStreamDom(this.availableSlaves);
    }

    if (this.availableMasters.length >= this.availableSlaves.length) {
      this._buildMultiStreamDom(percen2, this.availableMasters, this.availableSlaves);
    } else {
      this._buildMultiStreamDom(percen1, this.availableSlaves, this.availableMasters);
    }
  },

  _buildSingleStreamDom: function (availableSlaves) {
    var w, h, d, e, b = 0;
    var reso;

    this.singleLabelButton = this.getItemButton(this.singleStreamLabel, this.singleStreamLabel);
    this._domElement.appendChild(this.singleLabelButton);

    for (var i = 0; i < availableSlaves.length; i++) {
      w = availableSlaves[i].res.w;
      h = availableSlaves[i].res.h;
      reso = w + "x" + h;
      if (this.showWidthRes) {
        this._domElement.appendChild(this.getItemButton(this.singleStreamLabel, reso, reso, reso));
      }
      else {
        this._domElement.appendChild(this.getItemButton(this.singleStreamLabel, h + "p", reso, reso));
      }
    }
  },

  _buildMultiStreamDom: function (percent, availableA, availableB) {
    var w, h, d, e, b = 0;
    var reso2;
    var act_percen = percent;

    // no mutli label when no slaves
    if (availableB.length > 0) {
      this.multiLabelButton = this.getItemButton(this.multiStreamLabel, this.multiStreamLabel);
      this._domElement.appendChild(this.multiLabelButton);
    }

    for (var i = 0; i < availableA.length; i++) {
      w = availableA[i].res.w;
      h = availableA[i].res.h;
      if (availableB.length > 0) {
        if (percent * (i + 1) < act_percen) {
          d = availableB[b].res.w;
          e = availableB[b].res.h;
          reso2 = d + "x" + e;
        } else {
          act_percen = percent + act_percen;
          d = availableB[b].res.w;
          e = availableB[b].res.h;
          reso2 = d + "x" + e;
          b++;
        }
      }
      if (this.showWidthRes) {
        this._domElement.appendChild(this.getItemButton(this.multiStreamLabel, w + "x" + h, w + "x" + h, reso2));
      }
      else {
        this._domElement.appendChild(this.getItemButton(this.multiStreamLabel, h + "p", w + "x" + h, reso2));
      }
    }
  },

  getCurrentResType: function() {
    if (paella.player.videoContainer.isMonostream) {
      return this.singleStreamLabel;
    }  else {
      return this.multiStreamLabel;
    }
  },

  getCurrentResLabel: function() {
      if (this.showWidthRes) {
        return paella.player.videoContainer.currentMasterVideoData.res.w + "x" + paella.player.videoContainer.currentMasterVideoData.res.h;
      }
      else {
         return paella.player.videoContainer.currentMasterVideoData.res.h + "p";
      }
  },

  getItemButton: function (type, label, reso, reso2) {
    var elem = document.createElement('div');
    if (this._isCurrentRes(label, type)) {
      elem.className = this.getButtonItemClass(label, true);
    } else {
      elem.className = this.getButtonItemClass(label, false);
    }
    elem.id = label + '_button';
    elem.innerHTML = label;
    elem.data = {
      type: type,
      label: label,
      reso: reso,
      reso2: reso2,
      plugin: this
    };
    if (type !== label) {
      $(elem).click(function (event) {
        this.data.plugin.onItemClick(this, this.data.label, this.data.reso, this.data.reso2, this.data.type);
      });
    }
    return elem;
  },

  onItemClick: function (button, label, reso, reso2, type) {
    var self = this;
    // Ensure quality label is current before testing res change
    self.setQualityLabel();
    var isSameRes =  self._isCurrentRes(label, type);

    paella.events.trigger(paella.events.hidePopUp, {
      identifier: this.getName()
    });

    // disapear until the new res is loaded
    self.turnOffVisibility();

    if (typeof paella.plugins.presentationOnlyPlugin !== "undefined") {
      paella.plugins.presentationOnlyPlugin.toggleResolution(label, reso, reso2, type);
      self._isCurrentlySingleStream = paella.plugins.presentationOnlyPlugin.isCurrentlySingleStream;
    } else {
      paella.player.reloadVideos(reso, reso2);
    }

    var arr = self._domElement.children;
    for (var i = 0; i < arr.length; i++) {
      arr[i].className = self.getButtonItemClass(i, false);
    }
    button.className = self.getButtonItemClass(i, true);
    base.log.debug("selected button " + button.innerText + ", label is " + this.currentLabel);
    // finally, re-enable plugin if no reload is expected
    if (isSameRes) {
      self.turnOnVisibility();
    }
  },

  setQualityLabel: function () {
    var postfix = '';
    var res = paella.player.videoContainer.currentMasterVideoData.res;
    base.log.debug("current master res height" + res.h);
    this.setText(res.h + "p");
    this.currentLabel = res.h + "p";
  },

  getButtonItemClass: function (profileName, selected) {
    return 'multipleQualityItem ' + profileName + ((selected) ? ' selected': '');
  },

  turnOffVisibility: function(){
    paella.PaellaPlayer.mode.none = 'none';
    this.config.visibleOn = [paella.PaellaPlayer.mode.none];
    this.hideUI();
  },

  turnOnVisibility: function(){
    this.config.visibleOn = undefined;
    this.checkVisibility();
  },

  _isCurrentRes: function(label, type) {
    var currentResLabel = this.getCurrentResLabel();
    var currentResType = this.getCurrentResType();
    if (label ===  currentResLabel && type === currentResType) {
      return true;
    } else {
      return false;
    }
  },

  _isFiltered: function () {
    var track1Data = paella.matterhorn.episode.mediapackage.media.track[0];
    if (track1Data && track1Data.tags &&  track1Data.tags.tag && !track1Data.tags.tag.contains(this._presenterHasAudioTag)) {
        base.log.debug("Not providing the presentation-only view because media is not tagged with " + this._presenterHasAudioTag);
        return true;
    }
    return false;
  }

});

paella.plugins.multipleQualitiesPlugin = new paella.plugins.MultiplePresentationQualitiesPlugin();
