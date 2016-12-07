/** WARNING this plugin is tied to the syntax provided by Opencast 1x Annoation Service.
/* The annotation format assumes an embedded annoation value surrounded by
/* Opencast annoation service metadata */
/* Example of expect syntax:
/*   {
/*      "annotationId": 235367673,
/*      "mediapackageId": "137c0efa-798b-494d-a2a8-e1d76d6421d7",
/*      "sessionId": "q3rwk2r3z86m12dt7dv643mmc",
/*      "inpoint": 4,
/*      "outpoint": 410,
/*      "length": 406,
/*      "type": "paella/timedComments",
/*      "isPrivate": false,
/*      "value": {"timedComment": {
/*               "value": "This is my comment text",
/*               "parent": "235367659",
/*               "userName": "student4",
/*               "mode": "reply"
/*      }},
/*      "created": "2016-09-02T13:44:43-04:00"
/* }
/* NOTE: the value object, above, is destringified by the custom data delegate.
/*
/* versus a normalized syntax
/* {
/*    "annotationId": 235367673,
/*    "created": "2016-09-02T13:44:43.364Z",
/*    "value": "This is my comment text",
/*    "parent": "235367659",
/*    "userName": "student4",
/*    "mode": "reply",
/*    "inpoint": 4,
/*    "outpoint": 410,
/*    "isPrivate": false
/* }
/*
/* */

//var data = new Identicon('hash', 420).toString();
//document.write('<img width=420 height=420 src="data:image/png;base64,' + data + '">');
Class ("paella.plugins.TimedCommentsOverlay", paella.EventDrivenPlugin, {
  containerId: 'paella_plugin_TimedCommentsOverlay',
  container: null,
  innerContainer: null,
  lastEvent: null,
  publishCommentTextArea: null,
  publishCommentButtons: null,
  publishCommentisPrivate: null,
  canPublishAComment: false,
  _shortMonths:[ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  _curActiveTop: null,
  _curScrollTop: 0,
  _isActive: false,
  _isAutoScroll: false,
  _annotations: null, //will store the annotations
  _rootElement: null,
  _prevProfile: null,//we store the profile we had before opening the annotation
  _optimalProfile: 'tiny_presentation',
  _userData: undefined,
  _Identicon: null,
  checkEnabled: function (onSuccess) {
    onSuccess(true);
  },
  getIndex: function () {
    return 449;
  },
  getName: function () {
    return "edu.harvard.dce.paella.timedCommentsOverlayPlugin";
  },
  
  getEvents: function () {
    // Inserting a new event types
    paella.events.refreshTimedComments = "dce:refreshTimedComments";
    paella.events.showTimedComments = "dce:showTimedComments";
    paella.events.hideTimedComments = "dce:hideTimedComments";
    return[paella.events.showTimedComments, paella.events.hideTimedComments, paella.events.refreshTimedComments, paella.events.play, paella.events.timeupdate, paella.events.pause, paella.events.endVideo];
  },
  
  onEvent: function (eventType, params) {
    var thisClass = this;
    switch (eventType) {
      
      case paella.events.play:
      // play means focus is off the comment box so it's ok to scroll
      thisClass._isAutoScroll = true;
      thisClass.updateCurrentTimeStamp();
      if (thisClass._isActive) {
        paella.player.videoContainer.currentTime().then(function (time) {
          thisClass.scrollTimedComments(thisClass._isAutoScroll, time);
        });
      }
      break;
      
      case paella.events.timeupdate:
      thisClass.updateCurrentTimeStamp();
      if (thisClass._isActive) {
        paella.player.videoContainer.currentTime().then(function (time) {
          thisClass.scrollTimedComments(thisClass._isAutoScroll, time);
        });
      }
      break;
      
      case paella.events.pause:
      case paella.events.endVideo:
      thisClass._isAutoScroll = false;
      break;
      
      case paella.events.showTimedComments:
      thisClass.loadTimedComments();
      if (paella.player.playing()) {
        thisClass._isAutoScroll = true;
      }
      break;
      
      case paella.events.hideTimedComments:
      thisClass._isActive = false;
      if (thisClass._rootElement) {
        thisClass.unloadTimedComments();
      }
      break;
      
      case paella.events.refreshTimedComments:
      if (thisClass._isActive) {
        thisClass.reloadComments(params.data);
      }
    }
    thisClass.lastEvent = eventType;
  },
  
  getUserData: function () {
    var self = this;
    var defer = new $.Deferred();
    if (self._userData) {
      defer.resolve(self._userData);
    } else {
      paella.opencast.getUserInfo().then(
      function (me) {
        self._userData = me;
        defer.resolve(self._userData);
      },
      function () {
        defer.reject();
      });
    }
    return defer;
  },
  
  reloadComments: function (annotData) {
    var thisClass = this;
    thisClass._curScrollTop = $("#innerAnnotation") ? $("#innerAnnotation").scrollTop(): 0;
    // isActive is set back to true in data load promise
    thisClass._isActive = false;
    if (thisClass._rootElement) {
      $(thisClass._rootElement).empty();
      $(thisClass._rootElement).resizable('destroy');
      $(thisClass._rootElement).draggable('destroy');
    }
    thisClass.loadTimedComments(annotData);
  },
  
  unloadTimedComments: function () {
    var thisClass = this;
    if (thisClass._rootElement) {
      $(thisClass._rootElement).remove();
    }
  },
  
  loadTimedComments: function (annotData) {
    var thisClass = this;
    if (annotData) {
      thisClass.loadWithData(annotData);
    } else {
      paella.data.read('timedComments', {
        id: paella.initDelegate.getId()
      },
      function (data, status) {
        thisClass.loadWithData(data);
      });
    }
  },
  
  loadWithData: function (data) {
    var thisClass = this;
    thisClass._annotations = data;
    thisClass.sortAnnotations();
    
    paella.player.videoContainer.currentTime().then(function (time) {
      thisClass.getUserData().then(function (userData) {
        thisClass.drawTimedComments(time, userData);
      }).then(function () {
        $("#innerAnnotation").animate({
          scrollTop: thisClass._curScrollTop
        },
        100);
        // changing the layout profile that is most optimal to show comments
        thisClass.changeToOptimalVideoProfile(thisClass._optimalProfile);
        thisClass._isActive = true;
      });
    });
  },
  
  // Sort annotations for display in annotation UI
  sortAnnotations: function () {
    var thisClass = this;
    var commentList =[];
    var replyList =[];
    var replyMap = {
    };
    
    if (thisClass._annotations) {
      // DCE modification is that Each comment and reply are in a separate annotation
      // to sort, create a map of comment replies and a separate collection of comment parents
      thisClass._annotations.forEach(function (annot) {
        var timedComment = annot.value.timedComment;
        if (timedComment.mode == 'comment') {
          commentList.push(annot);
        } else {
          var mapList = replyMap[annot.value.timedComment.parent];
          if (! mapList) {
            mapList =[];
          }
          mapList.push(annot);
          replyMap[annot.value.timedComment.parent] = mapList;
        }
      });
      
      // Sort comments by inpoint, then by annotation date
      commentList = commentList.sort(function (a, b) {
        // First, sort by inpoint (a comment and its replies will have the same inpoint)
        // multiple comments can share the same inpoint
        var ret = a.inpoint - b.inpoint;
        if (ret != 0) {
          return ((a.inpoint > b.inpoint) ? 1: -1);
        }
        // secondly by created time
        var adate = new Date(a.created).getTime();
        var bdate = new Date(b.created).getTime();
        return ((adate > bdate) ? 1: ((adate < bdate) ? -1: 0));
      });
      
      // Sort individual reply groups by annot date
      commentList.forEach(function (comment) {
        // sort individual reply groups
        var mapList = replyMap[comment.annotationId];
        if (mapList) {
          // not all comments have replies
          mapList = mapList.sort(function (a, b) {
            var adate = new Date(a.created).getTime();
            var bdate = new Date(b.created).getTime();
            return ((adate > bdate) ? 1: ((adate < bdate) ? -1: 0));
          });
          // concat each sorted reply group
          replyList = replyList.concat(mapList);
        }
      });
      // merge back together into the single list
      thisClass._annotations = thisClass.mergeCommentsReplies(commentList, replyList);
    }
  },
  
  // add the sorted replies in with the parent comments
  mergeCommentsReplies: function (comments, replies) {
    var combined =[];
    var ci = 0;
    var ri = 0;
    while (ci < comments.length || ri < replies.length) {
      var currentCommentMpId = comments[ci].annotationId + "";
      combined.push(comments[ci++]);
      while ((ri < replies.length) && (replies[ri].value.timedComment.parent === currentCommentMpId)) {
        combined.push(replies[ri++]);
      }
    }
    return combined;
  },
  
  changeToOptimalVideoProfile: function (profile) {
    if (paella.Profiles && paella.Profiles.profileList && paella.Profiles.profileList[profile]) {
      paella.events.trigger(
      paella.events.setProfile, {
        profileName: profile
      });
    }
  },
  
  drawTimedComments: function (time, userData) {
    var thisClass = this;
    var defer = new $.Deferred();
    
    //Difficult to stop player clickthrough in overlayContainer, so moving it up a level to playerContainer
    //var overlayContainer = $("#overlayContainer");
    var overlayContainer = $('#playerContainer');
    if (! overlayContainer) {
      base.log.debug("TC Unable to find overlayContainer. Cannot show comments.");
      return;
    }
    
    if (thisClass._rootElement) {
      $(thisClass._rootElement).empty();
    } else {
      thisClass._rootElement = document.createElement("div");
    }
    
    thisClass._rootElement.className = 'timedComments';
    thisClass._rootElement.id = 'TimedCommentPlugin_Comments';
    
    // The first child is the innerAnnotation content body if there are annotations already there
    if (thisClass._annotations) {
      var innerAnnots = thisClass.buildInnerAnnotationElement(thisClass._annotations);
      $(thisClass._rootElement).append(innerAnnots);
    }
    
    // The next child is the new comment input form
    var newCommentForm = $(thisClass.tc_new_comment);
    $(thisClass._rootElement).append(newCommentForm);
    // send custom attributes and get handles on input elements
    var commentAreaId = thisClass._rootElement.id + "_commentText";
    var commentTextArea = $(newCommentForm).find('input.tc_comment_textarea');
    var commentisPrivate = $(newCommentForm).find('input#tc_comment_private_checkbox');
    $(commentTextArea).attr('id', commentAreaId);
    thisClass.publishCommentTextArea = commentTextArea;
    thisClass.publishCommentisPrivate = commentisPrivate;
    
    // append all to the overlay container
    overlayContainer.append(thisClass._rootElement);
    
    // create the circle (actually not displaying circle any more in mockup)
    var circle = document.createElement("div");
    circle.id = "circle";
    overlayContainer.append(circle);
    var vcMenu = $(thisClass.vc_menu);
    overlayContainer.append(vcMenu);
    
    // update the comment time
    var currentTime = Math.floor(time);
    if ($('#tc_current_timestamp').length > 0) {
      $('#tc_current_timestamp').html(thisClass.getFriendlyTimeStamp(currentTime));
    } else {
      base.log.debug("TC Unable to find tc_current_timestamp. Cannot set current time for new comment.");
    }
    
    // movable & resizable comments box
    $('#TimedCommentPlugin_Comments').draggable({
      cancel: "#innerAnnotation, .tc_new_comment"
    });
    $('#TimedCommentPlugin_Comments').resizable({
      minWidth: 200,
      minHeight: 200
    });
    
    // Admins have a special view
    if ($.inArray('ROLE_ADMIN', userData.roles) !== -1) {
      // Disable input if user is logged in as admin
      $(".timedComments").find('input').attr('disabled', 'disabled').attr('placeholder', 'You must log out of Engage server to annotate');
      // Enable edit of existing comments
      $(".tc_comment_text").attr("contenteditable", "true");
      $(".tc_comment_text").attr('data-type', 'update');
      $(".tc_comment_text").addClass("tc_admin_edit");
      $(".tc_comment_text").keydown(function (event) {
        if (event.keyCode == 13) {
          event.preventDefault();
          event.stopPropagation();
          thisClass.onTextAreaSubmit(this);
          return false;
        }
      });
    }
    
    // Halt comment refreshes when typing a comment or repy
    $('.tc_reply_textarea, .tc_comment_textarea, .tc_admin_edit').focusin(function () {
      thisClass._isActive = false;
      // stop all typing leaks to underlying player
      paella.keyManager.enabled = false;
    }).focusout(function () {
      thisClass._isActive = true;
      // re-enable typing leaks to underlying player
      paella.keyManager.enabled = true;
    });
    // stop keypress from leaking through to underlying div (video play/pause)
    $('.tc_reply_textarea, .tc_comment_textarea').keydown(function (event) {
      var charCode = (typeof event.which == "number") ? event.which: event.keyCode;
      switch (charCode) {
        // spacebar event
        case 32:
        event.preventDefault();
        $(this).val($(this).val() + " ");
        return false;
        // enter key event
        case 13:
        event.preventDefault();
        event.stopPropagation();
        thisClass.onTextAreaSubmit(this);
        return false;
      }
      event.stopImmediatePropagation();
    });
    
    // prevent space bar event trickle pause/play & use enter for submit (short comments)
    $('.tc_reply_textarea, .tc_comment_textarea').keyup(function (event) {
      var charCode = (typeof event.which == "number") ? event.which: event.keyCode;
      switch (event.keyCode) {
        // spacebar event, prevent click through
        case 32:
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
        // enter key event
        case 13:
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    });
    // stop click from leaking through to underlying div (video play/pause)
    $('#TimedCommentPlugin_Comments').click(function (event) {
      event.stopImmediatePropagation();
    });
    
    // Allow user to scroll when moues over timed contents area, i.e. stop autoscoll
    $('#TimedCommentPlugin_Comments').on({
      mouseenter: function (event) {
        thisClass._isAutoScroll = false;
      },
      mouseleave: function (event) {
        thisClass._isAutoScroll = true;
      }
    });
    return defer.resolve();
  },
  
  // builds the series of timestamp blocks (blocks of 1 comment & its replies)
  buildInnerAnnotationElement: function (comments) {
    
    var thisClass = this;
    $(thisClass.innerContainer).empty();
    
    var innerAnnotation = document.createElement('div');
    innerAnnotation.id = "innerAnnotation";
    thisClass.innerContainer = innerAnnotation;
    var timeBlockcount = 0;
    
    var messageDiv = document.createElement("div");
    messageDiv.id = "annotationHeaderNote";
    messageDiv.innerHTML = "My Notes";
    innerAnnotation.appendChild(messageDiv);
    
    
    var newEl;
    var commentBlock;
    var previousParentId;
    
    // Just so that we don't repeat code...
    function addReplyBox () {
      // Add the reply box at the end of the block containing comment plus its replies
      newEl = $(thisClass.tc_reply_box);
      // Set the button and input ids
      var textAreaId = timeStampBlockEl.id + "_replyText";
      var replyTextArea = $(newEl).find('input.tc_reply_textarea');
      $(replyTextArea).attr('id', textAreaId);
      $(replyTextArea).attr("data-type", "reply");
      $(commentBlock).append(newEl);
      timeStampBlockEl.appendChild(commentBlock);
      innerAnnotation.appendChild(timeStampBlockEl);
    }
    
    comments.forEach(function (l) {
      var parsedComments = l.value;
      if (parsedComments && (typeof parsedComments !== 'object')) {
        parsedComments = JSON.parse(parsedComments);
      }
      if (parsedComments[ "timedComment"]) {
        var comment = parsedComments[ "timedComment"];
        
        if (comment.mode == "comment") {
          // This is the comment
          if (previousParentId) {
            // Add previous reply box
            addReplyBox();
          }
          previousParentId = l.annotationId;++ timeBlockcount;
          base.log.debug("creating comment block for " + l.annotationId);
          timeStampBlockEl = document.createElement('div');
          timeStampBlockEl.className = "tc_timestamp_block";
          timeStampBlockEl.setAttribute('data-sec-begin', l.inpoint);
          timeStampBlockEl.setAttribute('data-sec-end', l.outpoint);
          timeStampBlockEl.setAttribute('data-sec-id', l.annotationId);
          timeStampBlockEl.id = 'TimedCommentPlugin_Comments_' + timeBlockcount;
          
          // The innerAnnotation's first child is the timestamp
          var timeStampEl = document.createElement('div');
          timeStampEl.className = "tc_timestamp";
          timeStampEl.setAttribute('data-sec-begin-button', l.inpoint);
          var timeStampText = thisClass.getFriendlyTimeStamp(l.inpoint);
          timeStampEl.innerHTML = timeStampText;
          timeStampBlockEl.appendChild(timeStampEl);
          // jump to time on click on just the timestamp div
          $(timeStampEl).click(function (e) {
            var secBegin = $(this).attr("data-sec-begin-button");
            paella.player.videoContainer.seekToTime(parseInt(secBegin));
          });
          
          commentBlock = document.createElement("div");
          commentBlock.className = "tc_comment_block";
          commentBlock.setAttribute('data-parent-id', l.annotationId);
          commentBlock.setAttribute('data-inpoint', l.inpoint);
          commentBlock.setAttribute('data-private', l.isPrivate);
          // create the comment
          newEl = $(thisClass.tc_comment);
        } else {
          // This is a reply
          newEl = $(thisClass.tc_reply);
        }
        newEl.attr('data-annot-id', l.annotationId);
        var friendlyDateStrig = thisClass.getFriendlyDate(comment.created);
        $(newEl).find(".tc_comment_text").html(comment.value);
        $(newEl).find(".user_name").html(comment.userName);
        var identiconSize = 20;
        var options = {
          foreground:[10, 10, 10, 100], // rgba
          background:[245, 245, 245, 100], // rgba
          margin: 0.1, // 10% margin
          size: identiconSize // identiconSize+px square
        };
        var identiconData = new Identicon(thisClass.getHashStrFromString(comment.userName), options).toString();
        $(newEl).find(".identicon").html('<img width=' + identiconSize + ' height=' + identiconSize + ' src="data:image/png;base64,' + identiconData + '">');
        $(newEl).find(".user_comment_date").html(friendlyDateStrig);
        $(commentBlock).append(newEl);
      }
    });
    
    if (previousParentId) {
      // Add last reply box
      addReplyBox();
    }
    
    return innerAnnotation;
  },
  
  onTextAreaSubmit: function (textareaDiv) {
    var thisClass = this;
    var txtValue = $(textareaDiv).val();
    var txtType = $(textareaDiv).attr('data-type');
    if (txtType === "update") {
      txtValue = $(textareaDiv).text();
      thisClass.updateAnnot(textareaDiv);
    } else if (txtValue.replace(/\s/g, '') !== "") {
      // only allow new comment if not empty text
      if (txtType === "reply") {
        thisClass.addReply(textareaDiv);
      } else {
        thisClass.addComment();
      }
    }
  },
  
  updateAnnot: function (textareaDiv) {
    var thisClass = this;
    var confirmText = 'Ok to make update: "' + $(textareaDiv).text() + '" ?';
    if (confirm(confirmText)) {
      thisClass.editComment(textareaDiv);
    } else {
      // reload to change back
      thisClass.reloadComments();
    }
  },
  
  updateCurrentTimeStamp: function () {
    var self = this;
    // updated to use new promise for current time
    paella.player.videoContainer.currentTime().then(function (time) {
      var currentTime = Math.floor(time);
      var currentTimeDiv = $('#tc_current_timestamp');
      if (currentTimeDiv) {
        currentTimeDiv.html(self.getFriendlyTimeStamp(currentTime));
      }
    });
  },
  
  scrollTimedComments: function (doScroll, time) {
    var thisClass = this;
    var currentTime = Math.floor(time);
    // no need to update anything else if no comments or scrolling is off
    if ($(".tc_timestamp_block").length < 1 || $("#innerAnnotation").hasClass('scrolling')) return;
    var newTopActive = null, lastBeforeTime = null, lastAfterTime = null;
    
    $(".tc_timestamp_block").filter(function () {
      if ($(this).attr("data-sec-begin") <= currentTime && $(this).attr("data-sec-end") >= currentTime) {
        if (newTopActive === null) {
          newTopActive = this;
        }
        $(this).addClass("active");
      } else {
        $(this).removeClass("active");
      }
      if ($(this).attr("data-sec-end") < currentTime) {
        lastBeforeTime = this;
      }
      if (lastAfterTime === null && $(this).attr("data-sec-begin") > currentTime) {
        // get the fist one (sorted ASC)
        lastAfterTime = this;
      }
    });
    
    if (newTopActive === null && (lastBeforeTime || lastAfterTime)) {
      if (lastBeforeTime) {
        newTopActive = lastBeforeTime;
      } else {
        newTopActive = lastAfterTime;
      }
    }
    
    if ((newTopActive != thisClass._curActiveTop) && doScroll) {
      thisClass._curActiveTop = newTopActive;
      base.log.debug("TC, going to scroll element " + $(newTopActive).attr('id') + " currently at " + $(newTopActive).position().top + " from top, scroll positon is currently at " + $("#innerAnnotation").scrollTop());
      var scrollTo = $("#innerAnnotation").scrollTop() + $(newTopActive).position().top -15;
      if (scrollTo < 0) scrollTo = 0;
      $("#innerAnnotation").animate({
        scrollTop: scrollTo
      },
      100).removeClass('scrolling');
    } else {
      $("#innerAnnotation").removeClass('scrolling');
    }
    this._curScrollTop = $("#innerAnnotation").scrollTop();
  },
  
  // new comment creates a new annotation entry
  editComment: function (textArea) {
    var thisClass = this;
    thisClass._curScrollTop = $("#innerAnnotation").scrollTop();
    var txtValue = paella.AntiXSS.htmlEscape($(textArea).text());
    var id = $(textArea).parent().attr("data-annot-id");
    
    var commentValue = null;
    
    $(thisClass._annotations).each(function (index, annot) {
      if (annot.annotationId.toString() === id.toString()) {
        commentValue = annot.value;
        if (commentValue && (typeof commentValue !== 'object')) {
          commentValue = JSON.parse(commentValue);
        }
      }
    });
    
    commentValue.timedComment.value = txtValue;
    
    paella.data.write('timedComments', {
      id: paella.initDelegate.getId(),
      update: true,
      annotationId: id
    },
    commentValue,
    function (response, status) {
      if (status) thisClass.reloadComments();
    });
  },
  
  // new comment creates a new annotation entry
  addComment: function () {
    var thisClass = this;
    thisClass._curScrollTop = $("#innerAnnotation").scrollTop();
    var txtValue = paella.AntiXSS.htmlEscape(thisClass.publishCommentTextArea.val());
    var isPrivate = thisClass.publishCommentisPrivate.val() === true ? true: false;
    
    thisClass.getUserData().then(function (user) {
      var newComment = {
      };
      newComment.userName = user.username;
      newComment.mode = "comment";
      newComment.value = txtValue;
      // NOTE newComment.created is set by server to server time
      var data = {
        timedComment: newComment
      };
      paella.player.videoContainer.currentTime().then(function (time) {
        thisClass.writeComment(data, time, isPrivate);
      });
    },
    // else log issue
    base.log.debug("TC, unable to retrieve user information, cannot write comment"));
  },
  
  writeComment: function (data, inPoint, isPrivate) {
    var thisClass = this;
    paella.player.videoContainer.currentTime().then(function (time) {
      paella.data.write('timedComments', {
        id: paella.initDelegate.getId(),
        inpoint: Math.floor(inPoint),
        isprivate: isPrivate
      },
      data, function (response, status) {
        if (status) thisClass.reloadComments();
      });
    });
  },
  
  //#DCE Rute 7/21: adding a reply creates a new annotation entry. The inpoint is the same as the
  // parent annotation to help sorting.
  addReply: function (textArea) {
    var thisClass = this;
    thisClass._curScrollTop = $("#innerAnnotation").scrollTop();
    var txtValue = paella.AntiXSS.htmlEscape($(textArea).val());
    
    // retrieve parent annotation data from the encompasing comment block
    var commentBlock = $(textArea).closest(".tc_comment_block");
    var parentAnnotId = commentBlock.attr("data-parent-id");
    var isPrivate = commentBlock.attr("data-private");
    var inPoint = commentBlock.attr("data-inpoint");
    
    // create the new reply
    thisClass.getUserData().then(function (user) {
      var newComment = {
      };
      newComment.userName = user.username;
      newComment.mode = "reply";
      newComment.value = txtValue;
      newComment.parent = parentAnnotId.toString();
      // NOTE newComment.created is set by server to server time
      var data = {
        timedComment: newComment
      };
      thisClass.writeComment(data, inPoint, isPrivate);
    },
    // else log issue
    base.log.debug("TC, unable to retrieve user information, cannot write comment"));
  },
  
  hideContent: function () {
    var thisClass = this;
    $(thisClass.container).hide();
  },
  
  getFriendlyDate: function (dateString) {
    var result;
    var date = new Date(dateString);
    var options = {
      month: "short", day: "2-digit",
      hour: 'numeric', minute: 'numeric', hour12: false
    };
    // check Safari (v9 & v10) and mobile browser date format support
    if (typeof Intl == 'object' && typeof Intl.DateTimeFormat == 'function') {
      result = new Intl.DateTimeFormat("en-US", options).format(date);
    } else {
      // browsers that don't support Intl.DateTimeFormat
      var day = date.getDate();
      var monthIndex = date.getMonth();
      var hour = ('00' + date.getHours()).slice(-2);
      var minute = ('00' + date.getMinutes()).slice(-2);
      result = this._shortMonths[monthIndex] + " " + day + ", " + hour + ":" + minute + "US ET";
    }
    return result;
  },
  
  getFriendlyTimeStamp: function (seconds) {
    var hrs = ~~(seconds / 3600);
    var mins = ~~((seconds % 3600) / 60);
    var secs = Math.floor(seconds % 60);
    // Uncomment to add the "00:" hour by default
    //if (hrs < 1 && mins < 1) {
    //  return secs + "s";
    //}
    if (mins < 10) mins = '0' + mins;
    if (secs < 10) secs = '0' + secs;
    if (hrs < 1) {
      return mins + ':' + secs;
    }
    if (hrs < 10) hrs = '0' + hrs;
    return hrs + ':' + mins + ':' + secs;
  },
  
  getDomFromHTMLString: function (template) {
    var thisClass = this;
    parser = new DOMParser();
    return parser.parseFromString(template, "text/html");
    // returns a HTMLDocument, which also is a Document.
  },
  
  //By Lukx, June 25, 2013 at 2:16 am
  //Ref: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
  getHashStrFromString: function (s) {
    var hash = 0;
    if (!s || s.length === 0) {
      return hash;
    }
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + c;
      hash = hash & hash; // Convert to 32bit integer
    }
    var hasStr32 = hash.toString();
    hasStr32 = (Array(33).join(hasStr32) + hasStr32).slice(-32)
    console.log("KAREN: " + hasStr32 + " length " + hasStr32.length);
    return hasStr32;
  },
  
  // TODO: move these to template files
  tc_comment: '<div class="tc_comment"><div class="tc_comment_text"></div><div class="identidiv"><div class="identicon"></div><div class="tc_comment_data"><div class="user_name"></div><div class="user_comment_date"></div></div></div></div>',
  tc_reply: '<div class="tc_comment tc_reply"><div class="tc_comment_text tc_reply_text"></div><div class="identidiv"><div class="identicon"></div><div class="tc_comment_data"><div class="user_name"></div><div class="user_comment_date"></div></div></div></div>',
  tc_reply_box: '<div class="tc_comment tc_reply_box"><form class="tc_new_reply_form" role="form"><input type="text" class="tc_reply_textarea" aria-label="reply text area" placeholder="Type a reply [enter to submit] 256 char" maxlength="256"></input></form></div>',
  tc_new_comment: '<div class="tc_new_comment"><div id="tc_current_timestamp" class="tc_timestamp"></div><form class="tc_new_comment_form" role="form"><div class="tc_comment tc_comment_box"><input type="text" class="tc_comment_textarea" aria-label="Create a new comment" placeholder="Type new comment at the current time [enter to submit] 256 char" maxlength="256"></input><input type="hidden" id="tc_comment_private_checkbox" value="false" /></div></form></div>',
  vc_menu: '<div id="vcMenu"><div class="vcMenuButton">Make a note</div><div class="vcMenuButton">Show notes</div></div>'
});
paella.plugins.timedCommentsOverlay = new paella.plugins.TimedCommentsOverlay();