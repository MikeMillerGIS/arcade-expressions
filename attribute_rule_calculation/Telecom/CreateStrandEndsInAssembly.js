// This rule creates connection points in an assembly

// ***************************************
// This section has the functions and variables that need to be adjusted based on your implementation
var assigned_to_field = $feature.terminatorspaceing;
// Instead of assigning the rule at the subtype, it is assigned to all subtypes and returns if not valid

// Limit the rule to valid subtypes
var valid_asset_groups = [];
var valid_asset_types = [];
if (count(valid_asset_groups) > 0 && (valid_asset_groups, $feature.assetgroup) == -1) {
    return assigned_to_field;
}
if (count(valid_asset_types) > 0 && (valid_asset_types, $feature.assettype) == -1) {
    return valid_asset_types;
}

var point_spacing = DefaultValue($feature.terminatorspacing, .1);
var point_count = DefaultValue($feature.terminatorcount, 0);
var sym_rotation = DefaultValue($feature.symbolrotation, 0);
var offset_distance = DefaultValue($feature.terminatoroffset, 0);

var device_class = 'CommunicationDevice';
var port_ag = 8;
var port_at = 144;
// ************* End Section *****************

var point_geo = Geometry($feature);
var wkid = point_geo.spatialReference.wkid;
var point_y = point_geo.Y;
point_y = point_y - (point_count / 2 * point_spacing);
var point_z = point_geo.Z;
point_z = point_z - (point_count / 2 * point_spacing);
var point_x = point_geo.X;
var vertices = [];

for (var i = 0; i < point_count; i++) {

    vertices[i] = [point_x, point_y, point_z];
    point_y = point_y + point_spacing;
    point_z = point_z + point_spacing;
}
var new_line = Polyline({"paths": [vertices], "spatialReference": {"wkid": point_geo.spatialReference.wkid}});
new_line = offset(rotate(new_line, 90 - sym_rotation), offset_distance);

var new_strand_ends = [];
var first_path = new_line['paths'][0];
for (var i in first_path) {
    point_x = first_path[i][0];
    point_y = first_path[i][1];
    point_z = first_path[i][2];
    new_strand_ends[i] = {
        'attributes': {
            'assetgroup': port_ag,
            'assettype': port_at
        },
        'geometry': Point({"x": point_x, "y": point_y, "z": point_z, "spatialReference": {"wkid": wkid}}),
        'associationType': 'content'
    };
}

var edit_payload = [{
    'className': device_class,
    'adds': new_strand_ends
}];
return {"result": assigned_to_field, "edit": edit_payload};

