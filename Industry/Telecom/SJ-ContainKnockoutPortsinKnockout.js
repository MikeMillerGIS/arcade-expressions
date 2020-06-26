// Assigned To: StructureJunction
// Type: Calculation
// Name: Contain Knock out port in knockout
// Description: Contains a knock out port in a knockout using the ContainerGuid field
// Subtypes: Wire Vault
// Field: AssetID
// Trigger: Insert
// Exclude From Client: True

// *************       User Variables       *************
// This section has the functions and variables that need to be adjusted based on your implementation

var assigned_to_field = $feature.assetid;
var valid_asset_types = [364];
var container_class  = "StructureJunction";

// ************* End User Variables Section *************

var container_guid = $feature.containerGUID;
var asset_type = $feature.assettype;
if (IsEmpty(container_guid) || IndexOf(valid_asset_types, asset_type) == -1) {
    return assigned_to_field;
}

var edit_payload = [{
    'className': container_class,
    'updates': [{
        'globalID': $feature.containerGUID,
        'associationType': 'container'
    }]
}];

return {"result": assigned_to_field, "edit": edit_payload};