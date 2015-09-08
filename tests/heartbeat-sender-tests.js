var test = require('tape');
var _ = require('lodash');
var callNextTick = require('call-next-tick');

var mockConfig = {
  heartBeatTime: 100          
};

test('Heartbeat test', function heartbeatTest(t) {
  t.plan(4);

  // Set up mocks and checks.
  setUpTopLevelGlobalMocks({
    classMethods: {
      registerEvent: mockRegisterEvent
    }
  });
  setUpAssertingMocks();


  // Loading the plugin code actually executes the plugin.
  // That is how Paella plugins work.
  require('../vendor/plugins/edu.harvard.dce.paella.heartbeatSender/heartbeat_sender');


  function setUpAssertingMocks() {
    global.base.Timer = timer;
  }

  function timer(callback, time, params) {
    t.equal(
      typeof callback,
      'function',
      'Passes a function to the timer.'
    );
    t.equal(
      time,
      mockConfig.heartBeatTime,
      'Sets the timer to run at the interval specified in the config.'
    );

    callNextTick(callback, global.base.Timer);
    callNextTick(checkRepeatValue);

    var instance = this;

    function checkRepeatValue() {
      t.equal(instance.repeat, true, 'Sets the timer to repeat.');
    }
  }

  function mockRegisterEvent(eventName) {
    t.equal(eventName, 'HEARTBEAT', 'The heartbeat event is registered.');
  }
});


// opts is not a required parameter. But if you do specify it, here's an example
// of what is expected:
// {
//  classMethods: {
//    nameOfMethodYouWantAttachedToEveryInstance: function myFn() { ... },
//    otherMethod: function myOtherFn() { ... }
//  }
// }
function setUpTopLevelGlobalMocks(opts) {
  global.paella = {
    EventDrivenPlugin: '',
    plugins: {}
  };

  global.base = {};

  global.Class = function Class(classPath, classType, classDef) {
    var classSegments = classPath.split('.');
    if (classSegments.length === 3) {
      global.paella.plugins[classSegments[2]] = createClass;
    }

    function createClass() {
      var classInst = _.cloneDeep(classDef);
      classInst.config = _.cloneDeep(mockConfig);      
      classInst.setup();

      if (opts && opts.classMethods) {
        for (methodName in opts.classMethods) {
          classInst[methodName] = opts.classMethods[methodName];
        }
      }

      return classInst;
    }
  };
}