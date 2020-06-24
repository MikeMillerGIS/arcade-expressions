// Assigned To: CommunicationsJunction
// Type: Calculation
// Name: Attach or Contain junction in structure
// Description: Generates connection points at a vertex when within a distance of a structure junction
// Subtypes: Connection Point
// Field: assetid
// Trigger: Insert
// Exclude From Client: True

// *************       User Variables       *************
// This section has the functions and variables that need to be adjusted based on your implementation
var assigned_to_field = $feature.assetid;
var valid_asset_types = [1, 2, 3];
var container_class = "StructureJunction";

// ************* End User Variables Section *************

if (Count(valid_asset_types) > 0 && IndexOf(valid_asset_types, $feature.assettype) == -1) {
    return assigned_to_field;
}

var container_guid = $feature.containerGUID;
if (IsEmpty(container_guid)){
      return assigned_to_field;
}

var associationType = $feature.containerType;
if (IsEmpty(associationType)){
      return assigned_to_field;
}

var edit_payload = [{
    'className': container_class,
    'updates': [{
        'globalID': container_guid,
        'associationType': associationType
    }]
}];

return {"result": assigned_to_field, "edit": edit_payload};