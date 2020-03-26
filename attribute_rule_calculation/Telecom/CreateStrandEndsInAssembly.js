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
var new_line = Polyline({
    "paths": [vertices],
    "spatialReference": {"wkid": point_geo.spatialReference.wkid}
});
new_line = offset(rotate(new_line, 90 - sym_rotation), offset_distance);

var edit_payload = [{
    'className': device_class,
    'adds': [{
        'attributes': {
            'assetgroup': port_ag,
            'assettype': port_at
        },
        'geometry': new_line,
        'associationType': 'content'
    }]
}];
return {"result": assigned_to_field, "edit": edit_payload};

