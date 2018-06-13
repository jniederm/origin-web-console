'use strict';

angular.module('openshiftConsole')
  .controller('VirtualMachinesController', [
    '$filter',
    '$routeParams',
    '$scope',
    'APIService',
    'DataService',
    'ProjectsService',
    'LabelFilter',
    'Logger',
    'KubevirtVersions',
    'getVmReferenceId',
    function (
    $filter,
    $routeParams,
    $scope,
    APIService,
    DataService,
    ProjectsService,
    LabelFilter,
    Logger,
    KubevirtVersions,
    getVmReferenceId
    ) {
    $scope.projectName = $routeParams.project;
    $scope.unfilteredVmis = {};   // {{ [vmName: string]: Vmi }}
    $scope.unfilteredVms = {};  // {{ [vmName: string]: Vm }}
    $scope.mergedVms = {};       // {{ [vmName: string]: { vmi?: Vmi, vm: Vm } }}
    $scope.labelSuggestions = {};
    $scope.clearFilter = function() {
      LabelFilter.clear();
    };

    var watches = [];

    ProjectsService
      .get($routeParams.project)
      .then(_.spread(function(project, context) {
        $scope.project = project;

        watches.push(DataService.watch(KubevirtVersions.virtualMachineInstance, context, function(vmis) {
          $scope.vmisLoaded = true;
          $scope.unfilteredVmis = vmis.by('metadata.name');
          updateMergedVms();
        }));

        watches.push(DataService.watch(KubevirtVersions.virtualMachine, context, function(vms) {
          $scope.vmsLoaded = true;
          $scope.unfilteredVms = vms.by('metadata.name');
          updateMergedVms();
        }));

        LabelFilter.onActiveFiltersChanged(function() {
          // trigger a digest loop
          $scope.$evalAsync(function() {
            filterVms();
          });
        });

        function filterVms() {
          $scope.mergedVms = _($scope.unfilteredMergedVms)
            .filter(function (mergedVm) {
              return LabelFilter.getLabelSelector().matches(mergedVm.vm);
            })
            .sortBy('vm.metadata.name')
            .value();
          $scope.filterWithZeroResults = !LabelFilter.getLabelSelector().isEmpty() && _.isEmpty($scope.mergedVms) && !_.isEmpty($scope.unfilteredMergedVms);
        }

        function updateMergedVms() {
          $scope.unfilteredMergedVms = mergeVmsAndVmis($scope.unfilteredVms, $scope.unfilteredVmis);
          LabelFilter.addLabelSuggestionsFromResources($scope.unfilteredVms, $scope.labelSuggestions);
          LabelFilter.setLabelSuggestions($scope.labelSuggestions);
          filterVms();
        }

        /**
         * @param {{ [vmName: string]: Vm }} vms
         * @param {{ [vmName: string]: Vmi }} vmis
         * @return {{ [vmName: string]: { vm?: Vm, ovm?: Ovm } }}
         */
        function mergeVmsAndVmis(vms, vmis) {
          var vmIdToVmi = _.keyBy(vmis, getVmReferenceId);
          var mergedVms = _.map(vms, function (vm) {
            var vmi = vmIdToVmi[vm.metadata.uid];
            var mergedVm = { vm: vm };
            if (vmi) {
              mergedVm.vmi = vmi;
            }
            return mergedVm;
          });
          return _.keyBy(mergedVms, 'vm.metadata.name');
        }

        $scope.allVmsLoaded = function () {
          return $scope.vmisLoaded && $scope.vmsLoaded;
        };

        $scope.$on('$destroy', function(){
          DataService.unwatchAll(watches);
        });
      }));
  }]);

angular.module('openshiftConsole')
  .constant('getVmReferenceId', function (vmi) {
    var references = _.get(vmi, 'metadata.ownerReferences');
    if (references === undefined) {
      return undefined;
    }
    return _(references)
      .filter({ kind: 'OfflineVirtualMachine' }) // TODO rename to VirtualMachine
      .first()
      .uid;
  });

angular.module('openshiftConsole').constant('KubevirtVersions', {
  // TODO remove ovm and add vmi
  virtualMachine: {
    resource: 'offlinevirtualmachines',
    group: 'kubevirt.io',
    version: 'v1alpha1',
    kind: 'OfflineVirtualMachine'
  },
  virtualMachineInstance: {
    resource: 'virtualmachines',
    group: 'kubevirt.io',
    version: 'v1alpha1',
    kind: 'VirtualMachine'
  }
});
