// Assigned To: CommunicationsLine
// Name: Update strand summary information in cable
// Description: Rule generates strands inside the cable based on the content count field
// Subtypes: All
// Field: fiberpendingconnect
// Execute: Update

// **************************************
// This section has the functions and variables that need to be adjusted based on your implementation
var assigned_to_field = $feature.fiberdedicated;
var valid_asset_groups = [1,3,4,5,6,7,9 ];
var valid_asset_types = [3];
var sqlquery = 'assettype = 163 and strandstatus = 6';
if (count(valid_asset_groups) > 0 && indexof(valid_asset_groups, $feature.assetgroup) == -1) {
    return assigned_to_field;
}
if (count(valid_asset_types) > 0 && indexof(valid_asset_types, $feature.assettype) == -1) {
    return assigned_to_field;
}

var line_class = "CommunicationsLine";

function get_features_switch_yard(class_name, fields, include_geometry) {
    var class_name = Split(class_name, '.')[-1];
    var feature_set = null;
    if (class_name == "CommunicationsDevice") {
        feature_set = FeatureSetByName($datastore, "CommunicationsDevice", fields, include_geometry);
    } else if (class_name == "CommunicationsLine") {
        feature_set = FeatureSetByName($datastore, "CommunicationsLine", fields, include_geometry);
    } else if (class_name == "CommunicationsAssembly") {
        feature_set = FeatureSetByName($datastore, "CommunicationsAssembly", fields, include_geometry);
    } else if (class_name == 'Associations') {
        feature_set = FeatureSetByName($datastore, 'UN_5_Associations', fields, false);
    } else {
        feature_set = FeatureSetByName($datastore, "CommunicationsDevice", fields, include_geometry);
    }
    return feature_set;
}


// ************* End Section *****************
function pop_empty(dict) {
    var new_dict = {};
    for (var k in dict) {
        if (IsNan(dict[k])) {
            continue;
        }
        if (IsEmpty(dict[k])) {
            continue;
        }
        new_dict[k] = dict[k];
    }
    return new_dict
}

function keys_to_list(dict) {
    if (IsEmpty(dict)) {
        return []
    }
    var keys = []
    for (var k in dict) {
        var res = number(k)
        if (!IsNan(res)) {
            keys[count(keys)] = res
        }
    }
    return sort(keys)

}

function get_associated_feature_ids(feature, association_type) {
    // Query to get all the content associations
    var associations = FeatureSetByAssociation(feature, association_type);
    // If there is no content, exit the function
    if (count(associations) == 0) {
        return null;
    }
    // loop over all associated records to get a list of the associated classes and the IDs of the features
    var associated_ids = {};
    for (var row in associations) {
        if (HasKey(associated_ids, row.className) == false) {
            associated_ids[row.className] = [];
        }
        associated_ids[row.className][Count(associated_ids[row.className])] = row.globalId;
    }
    //return a dict by class name with GlobalIDs of features
    return associated_ids;
}

// Function to check if a bit is in an int value
function has_bit(num, test_value) {
    // num = number to test if it contains a bit
    // test_value = the bit value to test for
    // determines if num has the test_value bit set
    // Equivalent to num AND test_value == test_value

    // first we need to determine the bit position of test_value
    var bit_pos = -1;
    for (var i=0; i < 64; i++) {
        // equivalent to test_value >> 1
        var test_value = Floor(test_value / 2);
        bit_pos++
        if (test_value == 0)
            break;
    }
    // now that we know the bit position, we shift the bits of
    // num until we get to the bit we care about
    for (var i=1; i <= bit_pos; i++) {
        var num = Floor(num / 2);
    }

    if (num % 2 == 0) {
        return false
    }
    else {
       return true
    }
}

function get_features_counts_by_query(associated_ids,sql){
    // dict to store the features by class name
    var associated_features = {};
    // loop over classes
    var feature_set = FeatureSetByName($datastore, "CommunicationsLine", ['*'], false);
    var global_ids = associated_ids["CommunicationsLine"];
    var fcnt = count(Filter(feature_set, sql + " AND globalid IN @global_ids"));
    // Return the features
    return fcnt;
}
// Validation

// Limit the rule to valid subtypes
if (indexof(valid_asset_types, $feature.assettype) == -1) {
    return assigned_to_field;
}

// Only features with an association status of container(bit 1)
// need to be evaluated
var association_status = $feature.ASSOCIATIONSTATUS;
// Only features with an association status of container(bit 1)
// need to be evaluated
if (IsEmpty(association_status) || has_bit(association_status,1) == false){
    return assigned_to_field;
}

var associated_ids = get_associated_feature_ids($feature, "content");
if (IsEmpty(associated_ids)){
    return "No Associations";
}

var fiberdedicated = get_features_counts_by_query(associated_ids,'assettype = 163 and strandstatus = 4');

return {"result": get_features_counts_by_query(associated_ids,sqlquery)};