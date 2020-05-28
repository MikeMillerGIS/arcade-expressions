// Assigned To: StructureLine
// Name: Create ducts in duct bank
// Description: Rule generates ducts inside duct banks based on the ductshigh and ductswide fields
// Subtypes: Wire Duct Bank
// Field: Assetid
// Execute: Insert

// ***************************************
// This section has the functions and variables that need to be adjusted based on your implementation
var valid_asset_types = [81];

var assigned_to_value = $feature.assetid;
var line_class = "StructureLine";
var point_class = "StructureJunction";
var duct_count = $feature.maximumcapacity;
// The Asset Group and Asset Type of the duct
var duct_AG = 101;
var duct_AT = 41;
var duct_from_portid = 'fromportid';
var duct_to_portid = 'toportid';
var knock_out_sql = "AssetGroup = 110 and AssetType = 363";
var knock_out_duct_wide_field = 'ductcountwide';
var knock_out_duct_high_field = 'ductcounthigh';
var z_level = -10000;


function get_features_switch_yard(class_name, fields, include_geometry) {
    var class_name = Split(class_name, '.')[-1];
    var feature_set = null;
    if (class_name == "StructureJunction") {
        feature_set = FeatureSetByName($datastore, "StructureJunction", fields, include_geometry);
    } else if (class_name == 'Associations') {
        feature_set = FeatureSetByName($datastore, 'UN_5_Associations', fields, false);
    } else {
        feature_set = FeatureSetByName($datastore, "StructureJunction", fields, include_geometry);
    }
    return feature_set;
}

// ************* End Section *****************

// update all z-values and drop m-values
function adjust_z(line_dict, z_value) {
    var new_paths = [];
    for (var i in line_dict['paths']) {
        var current_path = line_dict['paths'][i];
        var new_path = [];
        for (var j in current_path) {
            new_path[Count(new_path)] = [current_path[j][0], current_path[j][1], z_value];
        }
        new_paths[Count(new_paths)] = new_path
    }
    line_dict['paths'] = new_paths;
    return line_dict
}

// get "StructureJunction" feature that intersect with input point geo json. filter using knock_out_sql. returns Point type or null
function get_snapped_point(point_geo) {
    // TODO: make sure switching to point_class didn't break anything
    var fs = get_features_switch_yard("StructureJunction", ["globalid", "assetgroup", 'assettype', knock_out_duct_high_field, knock_out_duct_wide_field], false);
    var snapped_feats = Intersects(fs, Point(point_geo));
    var snapped_feat = First(Filter(snapped_feats, knock_out_sql));
    if (!IsEmpty(snapped_feat)) {
        return snapped_feat;
    }
    return null;

function next_avail(arr, num_ports) {
    if (Count(arr) >= num_ports) {
        return null;
    }
    var sorted_arr = sort(arr);
    for (var i in sorted_arr) {
        if (i+1 == sorted_arr[i]) {
            continue;
        }
        arr[Count(arr)] = i+1;
        return i+1
    }
}

// Validation
// Limit the rule to valid subtypes
if (IndexOf(valid_asset_types, $feature.assettype) == -1) {
    return assigned_to_value;
}
// Require a value for duct count
if (IsEmpty(duct_count) || duct_count == 0) {
    return {'errorMessage': 'A value is required for the content count field'};
}

// Get the start and end vertex of the line
var assigned_line_geo = Geometry($feature);
var vertices = assigned_line_geo['paths'][0];
var from_point = vertices[0];
var to_point = vertices[-1];

// Get the snapped feature.
var from_snapped_feat = get_snapped_point(from_point);
if (IsEmpty(from_snapped_feat)) {
    return {'errorMessage': 'A duct bank must start at a knock out'};
}
// Get from duct count from from knockout attribute fields
var from_duct_count = DefaultValue(from_snapped_feat[knock_out_duct_wide_field], 0) * DefaultValue(from_snapped_feat[knock_out_duct_high_field], 0);
if (from_duct_count < duct_count) {
    return {'errorMessage': 'A duct bank has more ducts than the knock out at the start of the line can support'};
}
var to_snapped_feat = get_snapped_point(to_point);
if (IsEmpty(to_snapped_feat)) {
    return {'errorMessage': 'A duct bank must end at a knock out'};
}
var to_duct_count = DefaultValue(to_snapped_feat[knock_out_duct_wide_field], 0) * DefaultValue(to_snapped_feat[knock_out_duct_high_field], 0);
if (to_duct_count < duct_count) {
    return {'errorMessage': 'A duct bank has more ducts than the knock out at the end of the line can support'};
}

// Create payload to add new lines
var line_attributes = {};
var line_adds = [];
var junction_adds = [];

// Copy the line and move the Z
var line_json = Text(assigned_line_geo);

for (var j = 0; j < duct_count; j++) {
    var content_shape = Dictionary(line_json);
    content_shape = adjust_z(content_shape, z_level);
    line_attributes = {
        'AssetGroup': duct_AG,
        'AssetType': duct_AT,

    };
    line_adds[Count(line_adds)] = {
        'attributes': line_attributes,
        'geometry': Polyline(content_shape),
        'associationType': 'content'
    };
}
var edit_payload = [{'className': line_class, 'adds': line_adds}];

return {
    "result": assigned_to_value,
    "edit": edit_payload
};