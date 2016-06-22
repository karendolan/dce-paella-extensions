// Same as MHAnnotationServiceDefaultDataDelegate except returns the root level annotation data
paella.dataDelegates.TimedCommentsDataDelegate = Class.create(paella.DataDelegate, {

  // stub to get the user's annotation name
  getMyName: function (context, params, onSuccess) {
    var series = params.series;
    paella.ajax.get({
      url: '/annotation/myname', params: {
        series: seriesId,
        type: "paella/" + context
      }
    });
  },

  read: function (context, params, onSuccess) {
    var thisClass = this;
    var question = params.question;
    var episodeId = params.id;
    var ifModifiedSince = params.ifModifiedSince;
    if (question === 'canAnnotate') {
      thisClass.isCanAnnotate(context, episodeId, onSuccess);
    } else {
      thisClass.getAnnotations(context, episodeId, ifModifiedSince, onSuccess);
    }
  },

  // #DCE note: This saves annotations as public in a digest format with question/answer.
  // Write creates a new note
  write: function (context, params, value, onSuccess) {
    var thisClass = this;
    if (params.update) {
      thisClass.updateExistingAnnot(context, params, value, onSuccess);
    } else {
      thisClass.createNewAnnot(context, params, value, onSuccess);
    }
  },

  isCanAnnotate: function (context, episodeId, onSuccess) {
    paella.ajax.get({
      url: '/annotation/canAnnotate', params: {
        mediaPackageId: episodeId,
        type: "paella/" + context
      }
    },
    function (data, contentType, returnCode) {
      var canAnnotate = data;
      onSuccess(data, true);
    },
    function (data, contentType, returnCode) {
      onSuccess(data, false);
    });
  },

  getAnnotations: function (context, episodeId, ifModifiedByDate, onSuccess) {
    var commentResultsLimit = 30000; //set to large limit, default is 10
    paella.ajax.get({
      url: '/annotation/annotations.json', params: {
        limit: commentResultsLimit,
        episode: episodeId,
        ifModifiedSince: ifModifiedByDate,
        type: "paella/" + context
      }
    },
    function (data, contentType, returnCode) {
      if (returnCode === 304) {
        if (onSuccess) onSuccess('No change', true);
        return true;
      }
      var annotations = data.annotations.annotation;
      var total = data.annotations.total;
      if (!(annotations instanceof Array)) {
        annotations =[annotations];
      }
      if (total > 0) {
        try {
          value = JSON.parse(annotations);
        }
        catch (err) {
          base.log.debug("TC Error " + err + " unable to json parse " + annotations);
        }
        // Transform stringfied value into json object
        annotations = annotations.map(function (obj) {
          var rObj = obj;
          if (obj.value && (typeof obj.value !== 'object')) {
            try {
              rObj.value = JSON.parse(obj.value);
            } catch (err) {
              base.log.debug("TC Error " + err + " unable to json parse " + obj.value);
            }
          }
          return rObj;
        });
        if (onSuccess) onSuccess(annotations, true);
      } else {
        if (onSuccess) onSuccess(undefined, false);
      }
    },
    function (data, contentType, returnCode) {
      onSuccess(undefined, false);
    });
  },

  createNewAnnot: function (context, params, value, onSuccess) {
    var thisClass = this;
    var episodeId = params.id;
    var inpoint = params.inpoint;
    var isprivate = params.isprivate;
    if (typeof (value) == 'object') value = JSON.stringify(value);

    paella.ajax.put({
      url: '/annotation/',
      params: {
        episode: episodeId,
        type: 'paella/' + context,
        value: value,
        'in': inpoint,
        'out': inpoint + 10, // default 10 sec duration
        isPrivate: isprivate //boolean
      }
    },
    function (data, contentType, returnCode) {
      onSuccess({
      },
      true);
    },
    function (data, contentType, returnCode) {
      onSuccess({
      },
      false);
    });
  },

  // Update adds a reply to an existing comment
  updateExistingAnnot: function (context, params, value, onSuccess) {
    var thisClass = this;
    var annotationId = params.annotationId;
    if (typeof (value) == 'object') value = JSON.stringify(value);

    paella.ajax.put({
      url: '/annotation/' + annotationId, params: {
        value: value
      }
    },
    function (data, contentType, returnCode) {
      onSuccess({
      },
      true);
    },
    function (data, contentType, returnCode) {
      onSuccess({
      },
      false);
    });
  },

  remove: function (context, params, onSuccess) {
    var episodeId = params.id;

    paella.ajax.get({
      url: '/annotation/annotations.json', params: {
        episode: episodeId, type: "paella/" + context
      }
    },
    function (data, contentType, returnCode) {
      var annotations = data.annotations.annotation;
      if (annotations) {
        if (!(annotations instanceof Array)) {
          annotations =[annotations];
        }
        var asyncLoader = new paella.AsyncLoader();
        for (var i = 0; i < annotations.length;++ i) {
          var annotationId = data.annotations.annotation.annotationId;
          asyncLoader.addCallback(new paella.JSONCallback({
            url: '/annotation/' + annotationId
          },
          "DELETE"));
        }
        asyncLoader.load(function () {
          if (onSuccess) {
            onSuccess({
            },
            true);
          }
        },
        function () {
          onSuccess({
          },
          false);
        });
      } else {
        if (onSuccess) {
          onSuccess({
          },
          true);
        }
      }
    },
    function (data, contentType, returnCode) {
      if (onSuccess) {
        onSuccess({
        },
        false);
      }
    });
  }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Captions Loader
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
paella.TimedCommentsParser = Class.create({

  parseCaptions: function (text) {
    var xml = $(text);
    var ps = xml.find("body div p");
    var captions =[];
    var i = 0;
    for (i = 0; i < ps.length; i++) {
      var c = this.getCaptionInfo(ps[i]);
      c.id = i;
      captions.push(c);
    }
    return captions;
  },

  getCaptionInfo: function (cap) {
    var b = this.parseTimeTextToSeg(cap.getAttribute("begin"));
    var d = this.parseTimeTextToSeg(cap.getAttribute("end"));
    var v = $(cap).text();

    return {
      s: b, d: d, e: b + d, name: v, content: v
    };
  },

  parseTimeTextToSeg: function (ttime) {
    var nseg = 0;
    var segtime = /^([0-9]*([.,][0-9]*)?)s/.test(ttime);
    if (segtime) {
      nseg = parseFloat(RegExp.$1);
    } else {
      var split = ttime.split(":");
      var h = parseInt(split[0]);
      var m = parseInt(split[1]);
      var s = parseInt(split[2]);
      nseg = s +(m * 60) +(h * 60 * 60);
    }
    return nseg;
  },

  captionsToDxfp: function (captions) {
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml = xml + '<tt xml:lang="en" xmlns="http://www.w3.org/2006/10/ttaf1" xmlns:tts="http://www.w3.org/2006/04/ttaf1#styling">\n';
    xml = xml + '<body><div xml:id="captions" xml:lang="en">\n';

    for (var i = 0; i < captions.length; i = i + 1) {
      var c = captions[i];
      xml = xml + '<p begin="' + paella.utils.timeParse.secondsToTime(c.begin) + '" end="' + paella.utils.timeParse.secondsToTime(c.duration) + '">' + c.value + '</p>\n';
    }
    xml = xml + '</div></body></tt>';

    return xml;
  }
});

paella.dataDelegates.MHCaptionsDataDelegate = Class.create(paella.DataDelegate, {
  read: function (context, params, onSuccess) {
    var catalogs = paella.matterhorn.episode.mediapackage.metadata.catalog;
    if (!(catalogs instanceof Array)) {
      catalogs =[catalogs];
    }

    var captionsFound = false;

    for (var i = 0; ((i < catalogs.length) && (captionsFound == false));++ i) {
      var catalog = catalogs[i];

      if (catalog.type == 'captions/timedtext') {
        captionsFound = true;

        // Load Captions!
        paella.ajax.get({
          url: catalog.url
        },
        function (data, contentType, returnCode, dataRaw) {

          var parser = new paella.matterhorn.TimedCommentsParser();
          var captions = parser.parseCaptions(data);
          if (onSuccess) onSuccess({
            captions: captions
          },
          true);
        },
        function (data, contentType, returnCode) {
          if (onSuccess) {
            onSuccess({
            },
            false);
          }
        });
      }
    }

    if (captionsFound == false) {
      if (onSuccess) {
        onSuccess({
        },
        false);
      }
    }
  },

  write: function (context, params, value, onSuccess) {
    if (onSuccess) {
      onSuccess({
      },
      false);
    }
  },

  remove: function (context, params, onSuccess) {
    if (onSuccess) {
      onSuccess({
      },
      false);
    }
  }
});