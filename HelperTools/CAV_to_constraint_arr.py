import arcpy
import pandas as pd
import os

fc = r"C:\\temp\\UPDM2019\\UN\\Pipeline_UtilityNetwork.gdb\\UtilityNetwork\\PipelineLine"
field_group_name = 'Limit Material By Asset Type'


def view_cav(table, subtype_field):
    index = ['fieldGroupName', 'subtype', 'isRetired', 'id']
    data = {}
    for cav in arcpy.da.ListContingentValues(table):
        contingent_value = {k: getattr(cav, k, None) for k in index}
        for field in cav.values:
            contingent_value[field.name] = dict(CODED_VALUE=field.code,
                                                RANGE=field.range,
                                                ANY='<ANY>',
                                                NULL='<NULL>')[field.type]
        data.setdefault(cav.fieldGroupName, []).append(contingent_value)
    return [pd.DataFrame(values).set_index(index).rename_axis(index={'subtype': subtype_field}).fillna('<NULL>') for
            values in data.values()]


desc = arcpy.Describe(fc)


for df in view_cav(fc, desc.subtypeFieldName):
    if field_group_name in df.index:
        subtypes = set()
        valid_combos = []
        df = df.reset_index().drop(['fieldGroupName', 'id'], axis=1)
        df = df[df['isRetired'] == False].drop(['isRetired'], axis=1)
        for row in df.itertuples(index=False):
            valid_combos.append("::".join(map(str, row)).replace('<NULL>', ''))
            subtypes.add(str(row[0]))

        feat_list = [f'$feature.{fld}' for fld in df.columns]
        subtypes = sorted(subtypes)
        func = f'''
// Assigned To: {os.path.basename(fc)}
// Type: Constraint
// Name: {field_group_name}
// Description: Limit values
// Subtypes: All
// Error: 5601
// Error Message: Incompatible types for {', '.join(list(df.columns))}
// Execute: Insert, Update


// ***************************************
// This section has the functions and variables that need to be adjusted based on your implementation

var valid_asset_groups = [{','.join(subtypes)}];
if (indexof(valid_asset_groups, $feature.{desc.subtypeFieldName}) == -1) {{
    return true;
}}
var feature_values = Concatenate([{','.join(feat_list)}], '::');
var valid_values = {valid_combos};
// ************* End Section *****************

if (IndexOf(valid_values, feature_values) == -1) {{
    return {{"errorMessage": "The selected attributes for {', '.join(list(df.columns))} are not valid."}}
}}
return true;
'''
        print(func)
        break
