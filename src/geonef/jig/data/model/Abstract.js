define("geonef/jig/data/model/Abstract", ["dojo", "geonef/jig/util/string"], function(dojo, utilString) {

/**
 * Base for model classes
 *
 */
dojo.declare('geonef.jig.data.model.Abstract', null,
{
  /**
   * Channel on which to publish notifications
   */
  channel: 'model/default',

  /**
   * @type {string} ID
   */
  id: undefined,

  properties: {
    id: 'string',
  },

  types: {
    string: {
    },
    integer: {
    },
    'float': {
    },
    'boolean': {
    },
    date: {
      fromServer: function(dateStr) {
        return dateStr ? new Date(dateStr) : null;
      },
      toServer: function(dateObj) {
        return dateObj ? dateObj.toString() : null;
      }
    },
    array: {
      fromServer: function(value) {
        return dojo.isArray(value) ? value : [];
      },
      toServer: function(value) {
        return dojo.isArray(value) ? value : [];
      }
    },
    location: {
      fromServer: function(obj) {
        return new OpenLayers.LonLat(obj.longitude, obj.latitude);
      },
      toServer: function(lonLat) {
        return { longitude: lonLat.lon, latitude: lonLat.lat };
      }
    },
    refMany: {
      fromServer: function(array, type) {
        if (!dojo.isArray(array)) { return []; }
        var _Class = geonef.jig.util.getClass(type.targetModel);
        var store = geonef.jig.data.model.getStore(_Class);
        var list = array.map(
          function(obj) { return store.getLazyObject(obj); });
        if (type.chained) {
          geonef.jig.util.chainArray(list);
        }
        return list;
      },
      toServer: function(array, type) {
        // do not cascade: foreign objects have to be saved independantly
        return undefined;
      }
    },
    refOne: {
      fromServer: function(obj, type) {
        var _Class = geonef.jig.util.getClass(type.targetModel);
        var object = geonef.jig.data.model.getStore(_Class).getLazyObject(obj);
        return object;
      },
      toServer: function(obj, type) {
        // do not cascade: foreign objects have to be saved independantly
        if (obj && !obj.id) {
          console.warn("toServer() on refOne will not cascade (target obj is new)");
        }

        return obj && obj.id ? { id: obj.id } : null;
      }
    },
    // embedMany: {
    //   fromServer: function(obj, type) {
    //     var _Class = geonef.jig.util.getClass(type.targetModel);
    //     var object = geonef.jig.data.model.getStore(_Class).getLazyObject(obj);
    //     return object;
    //   },
    //   toServer: function(obj, type) {
    //   }
    // }
  },

  /**
   * @type {geonef.jig.data.model.ModelStore} store to which this obj belong to
   */
  store: null,

  constructor: function(options) {
    if (options) {
      dojo.mixin(this, options);
    }
    this.normalizeProperties();
    this.init();
  },

  normalizeProperties: function() {
    var props = {};
    for (var p in this.properties) if (this.properties.hasOwnProperty(p)) {
      props[p] = this.properties[p];
      if (!dojo.isObject(props[p])) {
        props[p] = { type: props[p] };
      }
      if (props[p].readOnly !== true && props[p].readOnly !== false) {
        props[p].readOnly = false;
      }
    }
    this.properties = props;
  },

  init: function() {
  },

  /** hook */
  initNew: function() {
  },

  /**
   * Get value of given property - asynchronous
   *
   * For any "foo" property, the method "getFoo" is checked for existence.
   * It can return :
   *    - a dojo.Deferred object, which is then returned as is by "get"
   *    - an immediate value, which is passed as param to next deferred's callback
   *    - undefined, which is the same as if "getFoo" were not defined:
   *                 a query is made through the store to fetch the missing property.
   *
   * @param {string} property   Name of property
   * @return {dojo.Deferred}
   */
  get: function(property) {
    var meth = 'get'+geonef.jig.util.string.ucFirst(property);
    if (this[meth]) {
      var value = this.meth;
      if (value instanceof dojo.Deferred) {
        return value;
      }
      if (value !== undefined) {
        return geonef.jig.util.newResolvedDeferred(value);
      }
    }
    if (this[property] !== undefined || !this.id) {
      // if (!this.id) {
      //   console.log('in case', this, arguments);
      // }
      return geonef.jig.util.newResolvedDeferred(this[property]);
    }
    return this.store
        .fetchProps(this, [property])
        .then(function(obj) { return obj[property]; });
  },

  /**
   * Request value of differents properties
   *
   * The returned promise will be resolved when the specified properties
   * have been fetched. The callback arg is 'this'.
   *
   * @param {Array.<string>} propArray array of property names
   * @return {dojo.Deferred}
   */
  requestProps: function(propArray) {
    var self = this;
    return geonef.jig.util.whenAll(
      propArray.map(function(prop) { return self.get(prop); }))
    .then(function(props) {
            return self;
          });
  },

  /**
   * @param {string} property
   * @param any value
   */
  set: function(property, value) {
    var method = 'set'+geonef.jig.util.string.ucFirst(property);
    if (this[method]) {
      this[method](value);
    } else {
      this[property] = value;
    }
  },

  /**
   * @param {Object} object
   */
  setProps: function(object) {
    for (var p in object) if (object.hasOwnProperty(p)) {
      this.set(p, object[p]);
    }
  },


  /**
   * Get object ID
   */
  getId: function() {
    return this.id;
  },

  /**
   * Set object ID - called by ModelStore after new obj is persisted
   */
  setId: function(id) {
    this.id = id;
  },

  /**
   * @return {string} short string, text summary about the object
   */
  getSummary: function() {
    return this.getId();
  },

  /**
   * Set properties as fetched from the server
   */
  fromServerValue: function(props) {
    var p, typeN, type, value;
    for (p in props) if (props.hasOwnProperty(p)) {
      typeN = this.properties[p];
      if (typeN) {
        value = props[p];
        var typeSpec = typeN;
        type = this.types[typeSpec.type];
        // console.log('type', p, type, this.types, typeSpec);
        if (type.fromServer) {
          value = type.fromServer(value, typeSpec);
        }
        this[p] = value;
      }
    }
  },

  /**
   * Return properties as they should be sent to the server
   *
   * Only JSON-compatible values are valid: Object, Array, String, Numbers, Null.
   * Be careful: no NaN, undefined, or circular-references.
   *
   * @return {Object}
   */
  toServerValue: function() {
    var p, type, value;
    var props = this.properties;
    var struct = {};
    for (p in props) if (props.hasOwnProperty(p)) {
      value = this[p];
      if (value !== undefined) {
        var typeSpec = props[p];
        if (typeSpec.readOnly) { continue; }
        type = this.types[typeSpec.type];
        if (type && type.toServer) {
          value = type.toServer(value, typeSpec);
          if (value === undefined) {
            continue;
          }
        }
        struct[p] = value;
      }
    }

    return struct;
  },

  // restoreDefaults: function() {
  //   var props = this.properties;
  //   for (var prop in props) if (props.hasOwnProperty(prop)) {
  //     if (props[prop].defaultValue !== undefined) {
  //       this[prop] = props[prop].defaultValue;
  //     }
  //   }
  // },

  publish: function(argsArray) {
    argsArray = argsArray.slice(0);
    argsArray.unshift(this);
    dojo.publish(this.channel, argsArray);
  }

});

return geonef.jig.data.model.Abstract;
});