'use strict';

(function () {
  angular.module('openshiftConsole').component('virtualMachineRow', {
    controller: [
      '$scope',
      '$filter',
      '$routeParams',
      'APIService',
      'AuthorizationService',
      'DataService',
      'ListRowUtils',
      'Navigate',
      'ProjectsService',
      'KubevirtVersions',
      'VmActions',
      'RdpService',
      VirtualMachineRow
    ],
    controllerAs: 'row',
    bindings: {
      apiObject: '<',
      state: '<',
      vm: '<',
      vmi: '<',
      pods: '<',
      services: '<'
    },
    templateUrl: 'views/overview/_virtual-machine-row.html'
  });

  var RDP_PORT = 3389;

  function VirtualMachineRow(
    $scope,
    $filter,
    $routeParams,
    APIService,
    AuthorizationService,
    DataService,
    ListRowUtils,
    Navigate,
    ProjectsService,
    KubevirtVersions,
    VmActions,
    RdpService) {
    var row = this;
    row.KubevirtVersions = KubevirtVersions;
    row.VmActions = VmActions;

    _.extend(row, ListRowUtils.ui);
    row.actionsDropdownVisible = function () {
      // no actions on those marked for deletion
      if (_.get(row.vm, 'metadata.deletionTimestamp')) {
        return false;
      }

      return $filter('canIDoAny')('virtualMachineInstances') || $filter('canIDoAny')('virtualMachines');
    };
    row.projectName = $routeParams.project;

    row.vmCopy = function() {
      var copy = angular.copy(row.vm);
      delete copy._pod;
      delete copy._vm;
      delete copy._services;
      return copy;
    }

    row.isWindowsVM = function () {
      // https://github.com/kubevirt/kubevirt/blob/576d232e3c181134e69719cdb2d624ac52e7eecb/docs/devel/guest-os-info.md
      var os = _.get(row.vmi, 'metadata.labels["kubevirt.io/os"]') ;
      return os && _.startsWith(os, 'win');
    };
    row.isRdpService = function () { // TODO check / delete
      var ovm = row.apiObject;
      return !_.isEmpty(ovm.services);
    };

    /**
     * Requires Service object to be created:
     *   https://github.com/kubevirt/user-guide/blob/master/workloads/virtual-machines/expose-service.md
     */
    row.onOpenRemoteDesktop = function () { // TODO move to RdpService
      var ovm = row.apiObject;
      if (_.isEmpty(ovm.services)) {
        return ;
      }
      var service = _.find(services, function (service) {return RdpService.findRDPPort(service, RDP_PORT);}); // a service which one of the ports is RDP
      var addressPort = RdpService.getAddressPort(service, ovm, RDP_PORT);
      if (addressPort) {
        RdpService.fileDownload(RdpService.buildRdp(addressPort.address, addressPort.port));
      }
    };
  }

})();
