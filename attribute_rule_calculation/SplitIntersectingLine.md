# Split intersecting line

This calculation attribute rule split a line when a point is placed

## Use cases

Split a water main when a valve is placed

## Workflow

Using ArcGIS Pro, use the Add Attribute Rule geoprocessing tool to define this rule on a feature class and optionally on a subtype in that feature class.  Use the following values when defining the rule, the other options are not required or depend on your situation.
  
  - **Rule Type:** Calculation
  - **Triggering Events:** Update

## Expression Template

This Arcade expression will split a line when a point is placed.  [Example](./SplitIntersectingLine.zip)



```js
// Split the intersecting line

// ***************************************
// This section has the functions and variables that need to be adjusted based on your implementation

// The field the rule is assigned to
var field_value = $feature.ValueCopied;
// The line class to split
var line_class_name = "Line";
var line_fs = FeatureSetByName($datastore, "Line", ['*'], true);

// ************* End Section *****************

function dist_to_line(start_coord, end_coord, point_coord) {
    var Dx = end_coord[0] - start_coord[0];
    var Dy = end_coord[1] - start_coord[1];
    return ABS(Dy * point_coord[0] - Dx * point_coord[1] - start_coord[0] * end_coord[1] + end_coord[0] * start_coord[1]) / SQRT(POW(Dx, 2) + POW(Dy, 2));
}

function compare_coordinate(source_geo, coordinate) {
    // TODO, probably move to Equals and compare the geometry
    if (Round(coordinate[0], 2) != Round(source_geo.X, 2) ||
        Round(coordinate[1], 2) != Round(source_geo.Y, 2)) {
        return false
    }
    return true;
    // TODO - Figure out Z
    if (Count(coordinate > 2) && IsEmpty(source_geo.Z) == false) {
        if (Round(coordinate[2], 2) != Round(source_geo.Z, 2)) {
            return false
        }
    }
    return true
}

function pop_keys(dict, keys) {
    var new_dict = {};
    for (var k in dict) {
        if (IndexOf(keys, Upper(k)) != -1) {
            continue
        }
        new_dict[k] = dict[k];
    }
    return new_dict
}

var intersecting_lines = Intersects(line_fs, $feature);
// If no features were found, return the original value
if (IsEmpty(intersecting_lines) || Count(intersecting_lines) == 0) {
    return field_value;
}
var point_geo = Geometry($feature);

var update_features = [];
var new_features = [];

// Get the first line to get spatial ref, Z info and determine if Zs should be return/interpolated in lines
// TODO: Handle M's
var interpolate_z = false;
var first_line = First(intersecting_lines);
var first_geo = Geometry(first_line);
var first_shape = Dictionary(Text(first_geo));
var point_coord = null;
var line_spat_ref = first_geo.spatialReference.wkid;

if (Count(first_shape['paths'][0][0]) >= 3 && IsEmpty(point_geo.Z)) {
    point_coord = [point_geo.X, point_geo.Y];
    interpolate_z = true
} else if (Count(first_shape['paths'][0][0]) >= 3 && IsEmpty(point_geo.Z) == false) {
    point_coord = [point_geo.X, point_geo.Y, point_geo.Z];
} else {
    point_coord = [point_geo.X, point_geo.Y];
}
// Loop through lines to split
for (var line_feature in intersecting_lines) {
    var line_geo = Geometry(line_feature);
    var line_shape = Dictionary(Text(line_geo));

    // If the point is at the start or end, skip splitting line
    if (compare_coordinate(point_geo, line_shape['paths'][0][0]) || compare_coordinate(point_geo, line_shape['paths'][-1][-1])) {
        continue;
    }
    var split_found = false;
    var new_shape_1 = [];
    var new_shape_2 = [];
    var split_found = false;

    for (var i in line_shape['paths']) {
        var current_path = line_shape['paths'][i];

        var new_path_1 = [];
        var new_path_2 = [];

        for (var j in current_path) {
            if (split_found == true) {
                new_path_2[Count(new_path_2)] = current_path[j];
                continue
            }
            // Add the coordinate to both features if the split is on the from
            if (compare_coordinate(point_geo, current_path[j])) {
                new_path_1[Count(new_path_1)] = point_coord;
                new_path_2[Count(new_path_2)] = point_coord;
                split_found = true;
                continue;
            }

            // Save the last coordinate
            if (Count(current_path) == j - 1) {
                new_path_1[Count(new_path_1)] = current_path[j];
                continue;
            }
            // If the To is the last coordinate and matches the point, continue
            if (compare_coordinate(point_geo, current_path[j + 1])) {
                new_path_1[Count(new_path_1)] = current_path[j];
                continue;
            }

            var from_coord = current_path[j];
            var to_coord = current_path[j + 1];

            if (dist_to_line(from_coord, to_coord, point_coord) < .01) {
                new_path_1[Count(new_path_1)] = current_path[j];
                new_path_1[Count(new_path_1)] = point_coord;
                // Start the next line
                new_path_2[Count(new_path_2)] = point_coord;
                split_found = true;
                continue
            }
            new_path_1[Count(new_path_1)] = current_path[j];

        }
        if (Count(new_path_1) > 0) {
            new_shape_1[Count(new_shape_1)] = new_path_1;
        }
        if (Count(new_path_2) > 0) {
            new_shape_2[Count(new_shape_2)] = new_path_2;
        }
    }
    // Convert feature to dictionary to get all its attributes
    var line_att = Dictionary(Text(line_feature))['attributes'];

    // Get the length of the new lings
    var polyline_1 = Polyline({"paths": new_shape_1, "spatialReference": {"wkid": line_spat_ref}});
    var polyline_2 = Polyline({"paths": new_shape_2, "spatialReference": {"wkid": line_spat_ref}});
    var polyline_1_length = Length(polyline_1);
    var polyline_2_length = Length(polyline_2);

    // List of keys to remove from new feature, existing features change only requires global id
    var keys = ['SHAPE_LENGTH', 'GLOBALID', 'OBJECTID'];
    // Check length of new shapes, adjust the current feature to the longest segment
    if (polyline_1_length > polyline_2_length) {
        update_features[Count(update_features)] = {
            'globalID': line_feature.globalID,
            'geometry': polyline_1
        };
        new_features[Count(new_features)] =
            {
                'globalID': GUID(),
                'geometry': polyline_2,
                'attributes': pop_keys(line_att, keys)
            };
    } else {
        update_features[Count(update_features)] = {
            'globalID': line_feature.globalID,
            'geometry': polyline_2
        };
        new_features[Count(new_features)] =
            {
                'globalID': GUID(),
                'geometry': polyline_1,
                'attributes': pop_keys(line_att, keys)
            };
    }
}
return {
    'result': field_value,
    'edit': [
        {
            'className': line_class_name,
            'updates': update_features,
            'adds': new_features
        }
    ]
};
```