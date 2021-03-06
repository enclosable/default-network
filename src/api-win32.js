// Generated by CoffeeScript 1.10.0
(function() {
  var async, collect, exec, getAdapter, getAdapterConfig, getAdapterNameByIndex, getDefaultGateway, getDefaultNetwork, net, parseCSV, wmic;

  net = require('net');

  exec = require('child_process').exec;

  async = require('async');

  parseCSV = require('csv-parse');

  wmic = function(cls, keys, callback) {
    var command;
    command = "wmic path " + cls + " get " + (keys.join(',')) + " /format:csv";
    return exec(command, function(error, stdout, stderr) {
      if (error != null) {
        return callback(error);
      }
      return parseCSV(stdout, {
        columns: true,
        rowDelimiter: '\r\r\n',
        skip_empty_lines: true,
        trim: true
      }, function(error, records) {
        return callback(error, records);
      });
    });
  };

  getAdapterConfig = function(callback) {
    return wmic('Win32_NetworkAdapterConfiguration', ['Index', 'IPEnabled', 'DefaultIPGateway'], function(error, records) {
      return callback(error, records);
    });
  };

  getAdapter = function(callback) {
    return wmic('Win32_NetworkAdapter', ['Index', 'NetConnectionID'], function(error, records) {
      return callback(error, records);
    });
  };

  getDefaultGateway = function(callback) {
    return getAdapterConfig(function(error, records) {
      var address, data, defaultGateway, i, index, j, len, len1, record, ref;
      if (error != null) {
        return callback(error);
      }
      data = {};
      for (i = 0, len = records.length; i < len; i++) {
        record = records[i];
        if (record['IPEnabled'] == null) {
          continue;
        }
        if (record['DefaultIPGateway'] == null) {
          continue;
        }
        if (record['Index'] == null) {
          continue;
        }
        if (record['IPEnabled'] !== 'TRUE') {
          continue;
        }
        if (record['DefaultIPGateway'].trim() === '') {
          continue;
        }
        if (isNaN(parseInt(record['Index']))) {
          continue;
        }
        index = record['Index'];
        defaultGateway = record['DefaultIPGateway'].trim();
        defaultGateway = (defaultGateway.match(/{(.*)}/) || [])[1] || '';
        ref = defaultGateway.split(';');
        for (j = 0, len1 = ref.length; j < len1; j++) {
          address = ref[j];
          switch (net.isIP(address)) {
            case 4:
              data[index] || (data[index] = []);
              data[index].push({
                family: 'IPv4',
                address: address
              });
              break;
            case 6:
              data[index] || (data[index] = []);
              data[index].push({
                family: 'IPv6',
                address: address
              });
              break;
            default:
              return callback(new Error(address + " is not IP address"));
          }
        }
      }
      return callback(null, data);
    });
  };

  getAdapterNameByIndex = function(index, callback) {
    return getAdapter(function(error, records) {
      var i, len, record;
      if (error != null) {
        return callback(error);
      }
      for (i = 0, len = records.length; i < len; i++) {
        record = records[i];
        if (record['Index'] === index) {
          return callback(null, record['NetConnectionID']);
        }
      }
      return callback(new Error("inteface " + index + " is not available"));
    });
  };

  getDefaultNetwork = function(callback) {
    return getDefaultGateway(function(error, gateways) {
      var indexes;
      if (error != null) {
        return callback(error);
      }
      indexes = Object.keys(gateways);
      return async.map(indexes, function(index, callback) {
        return getAdapterNameByIndex(index, function(error, name) {
          var iface;
          if (error != null) {
            return callback(error);
          }
          iface = {
            index: index,
            name: name
          };
          return callback(null, iface);
        });
      }, function(error, ifaces) {
        var data, i, iface, len;
        if (error != null) {
          return callback(error);
        }
        data = {};
        for (i = 0, len = ifaces.length; i < len; i++) {
          iface = ifaces[i];
          data[iface.name] = gateways[iface.index];
        }
        return callback(null, data);
      });
    });
  };

  collect = function(callback) {
    return getDefaultNetwork(function(error, data) {
      if (error != null) {
        return callback(null, {});
      }
      return callback(null, data);
    });
  };

  module.exports = {
    collect: collect
  };

}).call(this);
