// Assigned To: Line
// Name: Calc Material from Asset Type
// Description: Converts the Asset Type codes to Material codes.
// Subtypes: All
// Field: AssetType
// Execute: Insert, Update

// ***************************************
// This section has the functions and variables that need to be adjusted based on your implementation

// Limit the rule to valid asset groups and asset types

var assigned_to_field = $feature.assettype;
var material_field = 'material';

var valid_asset_groups = [1, 2, 3, 4, 5, 6, 7];

var at_to_mat = {
    '2': 'O',
    '11': '0',
    '12': 'R',
    '6': 'S',
    '4': 'X'
};
// ************* End Section *****************

var idx_at = IndexOf(at_to_mat, Text(assigned_to_field));
if (idx_at == -1) {
    return assigned_to_field;
}
return at_to_mat[Text(assigned_to_field)];