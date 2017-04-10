'use strict';

angular.module('openshiftConsole').component('nextSteps', {
  controller: [
    'ProcessedTemplateService',
    NextSteps
  ],
  bindings: {
    project: '<',
    projectName: '<',
    loginBaseUrl: '<',
    fromSampleRepo: '<',
    createdBuildConfig: '<'
  },
  templateUrl: 'views/directives/next-steps.html'
});

function NextSteps(ProcessedTemplateService) {
  var ctrl = this;
  ctrl.showParamsTable = false;

  var processedTemplateData = ProcessedTemplateService.getTemplateData();
  ctrl.parameters = processedTemplateData.params;
  ctrl.templateMessage = processedTemplateData.message;
  ProcessedTemplateService.clearTemplateData();

  var hasBuildConfigTrigger = function(type) {
    var triggers = _.get(ctrl,  'createdBuildConfig.spec.triggers', []);
    return _.some(triggers, { type: type });
  };

  ctrl.createdBuildConfigWithGitHubTrigger = function() {
    return hasBuildConfigTrigger('GitHub');
  };

  ctrl.createdBuildConfigWithConfigChangeTrigger = function() {
    return hasBuildConfigTrigger('ConfigChange');
  };

  function pendingTasks(tasks) {
    var pendingTasks = [];
    angular.forEach(tasks, function(task) {
      if (task.status !== "completed") {
        pendingTasks.push(task);
      }
    });
    return pendingTasks;
  }

  function erroredTasks(tasks) {
    var erroredTasks = [];
    angular.forEach(tasks, function(task) {
      if (task.hasErrors) {
        erroredTasks.push(task);
      }
    });
    return erroredTasks;
  }

  ctrl.allTasksSuccessful = function(tasks) {
    return !pendingTasks(tasks).length && !erroredTasks(tasks).length;
  };

  ctrl.erroredTasks = erroredTasks;
  ctrl.pendingTasks = pendingTasks;

  ctrl.toggleParamsTable = function() {
    ctrl.showParamsTable = true;
  };

}
