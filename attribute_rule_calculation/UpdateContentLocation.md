
# Update Container and Structures associated features location

This calculation attribute rule is designed for the feature classes that participate in a Utility Network and for containers and structures.  When they are moved, the associated content will moved with it.
## Use cases

A pole is moved and the transformer and transformer bank is moved

## Workflow

Using ArcGIS Pro, use the Add Attribute Rule geoprocessing tool to define this rule on a feature class and optionally on a subtype in that feature class.  Use the following values when defining the rule, the other options are not required or depend on your situation.
  - **Field:** ownedby
  - **Rule Type:** Calculation
  - **Triggering Events:** Update
  - **Exclude from application evaluation:** True


## Expression Template

```js
/// This rule will update the location of the features in a container or structure is moved

// ***************************************
// This section has the functions and variables that need to be adjusted based on your implementation

// The field the rule is assigned to
var field_value = Text($feature.assetid);

// Get Feature Switch yard, adjust the string literals to match your GDB feature class names
function get_features_switch_yard(class_name, fields, include_geometry) {
    var feature_set = [];
    if (class_name == 'ElectricDistributionDevice' || class_name == '6') {
        feature_set = ['ElectricDistributionDevice', FeatureSetByName($datastore, 'ElectricDistributionDevice', fields, include_geometry)];
    } else if (class_name == 'ElectricDistributionJunction' || class_name == '9') {
        feature_set = ['ElectricDistributionJunction', FeatureSetByName($datastore, 'ElectricDistributionJunction', fields, include_geometry)];
    } else if (class_name == 'ElectricDistributionAssembly' || class_name == '8') {
        feature_set = ['ElectricDistributionAssembly', FeatureSetByName($datastore, 'ElectricDistributionAssembly', fields, include_geometry)];
    } else if (class_name == 'ElectricDistributionLine' || class_name == '7') {
        feature_set = ['ElectricDistributionLine', FeatureSetByName($datastore, 'ElectricDistributionLine', fields, include_geometry)];
    } else if (class_name == 'StructureJunction' || class_name == '3') {
        feature_set = ['StructureJunction', FeatureSetByName($datastore, 'StructureJunction', fields, include_geometry)];
    } else if (class_name == 'StructureLine' || class_name == '4') {
        feature_set = ['StructureLine', FeatureSetByName($datastore, 'StructureLine', fields, include_geometry)];
    } else if (class_name == 'StructureBoundary' || class_name == '5') {
        feature_set = ['StructureBoundary', FeatureSetByName($datastore, 'StructureBoundary', fields, include_geometry)];
    } else {
        feature_set = ['StructureBoundary', FeatureSetByName($datastore, 'StructureBoundary', fields, include_geometry)];
    }
    return feature_set;
}

function association_feature_set(association_fields) {
    // Using the GDB name(un_DSID_associations), Service ID(500001), or Service Layer Name(Associations), get the association table
    return FeatureSetByName($datastore, "un_5_associations", association_fields, false);
}

// ************* End Section *****************

// Function to check if a bit is in an int value
function has_bit(num, test_value) {
    // num = number to test if it contains a bit
    // test_value = the bit value to test for
    // determines if num has the test_value bit set
    // Equivalent to num AND test_value == test_value

    // first we need to determine the bit position of test_value
    var bit_pos = -1;
    for (var i = 0; i < 64; i++) {
        // equivalent to test_value >> 1
        var test_value = Floor(test_value / 2);
        bit_pos++;
        if (test_value == 0)
            break;
    }
    // now that we know the bit position, we shift the bits of
    // num until we get to the bit we care about
    for (var i = 1; i <= bit_pos; i++) {
        var num = Floor(num / 2);
    }

    if (num % 2 == 0) {
        return false
    } else {
        return true
    }

}

// Function to pop empty values in a dict
function pop_empty(dict) {
    var new_dict = {};
    for (var k in dict) {
        if (IsNan(dict[k])) {
            //new_dict[k] = null;
            continue;
        }
        if (IsEmpty(dict[k])) {
            //new_dict[k] = null;
            continue;
        }
        new_dict[k] = dict[k];
    }
    return new_dict
}

function get_all_associations(global_ids, feature_set, assoc_rows) {
    // Get the features that are content or attached
    // "fromglobalid in @global_ids AND associationtype in (2,3)"

    var assoc_records = Filter(feature_set, "fromglobalid in @global_ids AND associationtype in (2,3)");
    // Return if no record is found
    if (IsEmpty(assoc_records) || Count(assoc_records) == 0) {
        return assoc_rows;
    }
    var assoc_global_ids = [];
    for (var row in assoc_records) {
        var class_id_txt = Text(row.tonetworksourceid);
        if (HasKey(assoc_rows, class_id_txt) == false) {
            assoc_rows[class_id_txt] = [];
        }

        assoc_rows[class_id_txt][Count(assoc_rows[class_id_txt])] = row.toglobalid;
        assoc_global_ids[Count(assoc_global_ids)] = row.toglobalid;
    }
    return get_all_associations(assoc_global_ids, feature_set, assoc_rows)
}

var association_status = $feature.ASSOCIATIONSTATUS;
// Only features with an association status of container(bit 1) or structure(bit 2)
// need to be evaluated
if (has_bit(association_status, 1) == false && has_bit(association_status, 2) == false) {
    return field_value;
}
// If the feature geometry has not changed, we can exit early
var current_shape = Geometry($feature);
var original_shape = Geometry($feature);
if (current_shape != original_shape) {
    return field_value;
}
// Get the geometry offset from current and previous.
var dX = current_shape.X - original_shape.X;
var dY = current_shape.Y - original_shape.Y;
var dZ = current_shape.Z - original_shape.Z;

var globalid = $feature.GLOBALID;

var assoc_fields = ['tonetworksourceid', 'toglobalid'];
var assoc_rows = {};
var assoc_feature_set = association_feature_set(assoc_fields);
var associated_ids = get_all_associations([globalid], assoc_feature_set, assoc_rows);
var edit_payload = [];
for (var class_id in associated_ids) {
    var feature_set_info = get_features_switch_yard(class_id, ['globalID'], true);
    var class_name = feature_set_info[0];
    var feature_set = feature_set_info[1];
    var global_ids = associated_ids[class_id];
    var features = Filter(feature_set, "globalid IN @global_ids");
    var updates = [];
    for (var feature in features) {
        // Convert the shape to a dictionary so it is mutable.
        var shape = Dictionary(Text(Geometry(feature)));
        if (TypeOf(Geometry(feature)) == 'Point') {
            shape['x'] += dX;
            shape['y'] += dY;
            if (IsNan(shape['z']) == false) {
                shape['z'] += dZ;
            }
            shape = pop_empty(shape);
        } else if (TypeOf(Geometry(feature)) == 'Polyline') {

            var new_line = [];
            for (var i in shape['paths']) {
                new_line[i] = [];
                var path = shape['paths'][i];
                for (var j in path) {
                    var coordinate = path[j];
                    coordinate[0] += dX;
                    coordinate[1] += dY;
                    if (IsNan(coordinate[2]) == false) {
                        coordinate[2] += dZ;
                    }
                    if (IsNan(coordinate[3]) == false) {
                        coordinate[3] += dZ;
                    }
                    new_line[i][j] = coordinate;

                }
            }
            shape['paths'] = new_line;
        }
        updates[Count(updates)] = {'globalID': feature.globalID, 'geometry': Geometry(shape)}
    }
    edit_payload[Count(edit_payload)] = {'className': class_name, 'updates': updates}
}
return Text({"result": field_value, "edit": edit_payload});

```