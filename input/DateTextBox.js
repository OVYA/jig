define(
  ["module", "dojo/_base/declare", "dijit/form/DateTextBox", "dojo/date/stamp"],
  function(module, declare, DateTextBox, stamp) {
    /**
   * Extension of dijit/DataTextBox to deal with string date value
   *
   * It is used in the same way, except that it will work when set with
   * a string date value.
   *
   * The value getter is unchanged and returns a Date object.
   */
    return declare(DateTextBox, {
      timestamp: false,
      autoSerialize: false,
      serializeOptions: {
        selector: "date"
      },

      _setValueAttr: function(value) {
        if (typeof value == "string") {
          var displayValue = value;
          var date = stamp.fromISOString(displayValue);
          this.set("value", date);
          this.set("dropDownDefaultValue", date);
        } else {
          this.inherited(arguments);
          this.set("dropDownDefaultValue", value);
        }
      },

      _getValueAttr: function() {
        var value = this.inherited(arguments);
        if (value && this.autoSerialize) {
          value = this.serialize(value, this.serializeOptions);
        }
        return value;
      },

      declaredClass: module.id
    });
  }
);
