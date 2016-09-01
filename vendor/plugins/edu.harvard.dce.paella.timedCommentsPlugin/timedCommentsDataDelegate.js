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
