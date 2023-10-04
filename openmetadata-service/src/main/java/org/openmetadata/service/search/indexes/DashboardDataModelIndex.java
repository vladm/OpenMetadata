package org.openmetadata.service.search.indexes;

import static org.openmetadata.service.Entity.FIELD_DESCRIPTION;
import static org.openmetadata.service.Entity.FIELD_DISPLAY_NAME;
import static org.openmetadata.service.Entity.FIELD_NAME;
import static org.openmetadata.service.search.EntityBuilderConstant.COLUMNS_NAME_KEYWORD;
import static org.openmetadata.service.search.EntityBuilderConstant.DISPLAY_NAME_KEYWORD;
import static org.openmetadata.service.search.EntityBuilderConstant.FIELD_DISPLAY_NAME_NGRAM;
import static org.openmetadata.service.search.EntityBuilderConstant.FIELD_NAME_NGRAM;
import static org.openmetadata.service.search.EntityBuilderConstant.FULLY_QUALIFIED_NAME_PARTS;
import static org.openmetadata.service.search.EntityBuilderConstant.NAME_KEYWORD;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.openmetadata.schema.entity.data.DashboardDataModel;
import org.openmetadata.service.Entity;
import org.openmetadata.service.search.SearchIndexUtils;
import org.openmetadata.service.search.models.SearchSuggest;
import org.openmetadata.service.util.JsonUtils;

public class DashboardDataModelIndex implements SearchIndex {

  private static final List<String> excludeFields = List.of("changeDescription");

  final DashboardDataModel dashboardDataModel;

  public DashboardDataModelIndex(DashboardDataModel dashboardDataModel) {
    this.dashboardDataModel = dashboardDataModel;
  }

  public Map<String, Object> buildESDoc() {
    Map<String, Object> doc = JsonUtils.getMap(dashboardDataModel);
    SearchIndexUtils.removeNonIndexableFields(doc, excludeFields);
    List<SearchSuggest> suggest = new ArrayList<>();
    suggest.add(SearchSuggest.builder().input(dashboardDataModel.getName()).weight(10).build());
    suggest.add(SearchSuggest.builder().input(dashboardDataModel.getFullyQualifiedName()).weight(5).build());
    doc.put("suggest", suggest);
    doc.put("entityType", Entity.DASHBOARD_DATA_MODEL);
    doc.put(
        "fqnParts",
        getFQNParts(
            dashboardDataModel.getFullyQualifiedName(),
            suggest.stream().map(SearchSuggest::getInput).collect(Collectors.toList())));
    if (dashboardDataModel.getOwner() != null) {
      doc.put("owner", getOwnerWithDisplayName(dashboardDataModel.getOwner()));
    }
    if (dashboardDataModel.getDomain() != null) {
      doc.put("domain", getDomainWithDisplayName(dashboardDataModel.getDomain()));
    }
    return doc;
  }

  public static Map<String, Float> getFields() {
    Map<String, Float> fields = new HashMap<>();
    fields.put(FIELD_DISPLAY_NAME, 15.0f);
    fields.put(FIELD_DISPLAY_NAME_NGRAM, 1.0f);
    fields.put(FIELD_NAME, 15.0f);
    fields.put(FIELD_NAME_NGRAM, 1.0f);
    fields.put(DISPLAY_NAME_KEYWORD, 25.0f);
    fields.put(NAME_KEYWORD, 25.0f);
    fields.put(FIELD_DESCRIPTION, 1.0f);
    fields.put(COLUMNS_NAME_KEYWORD, 10.0f);
    fields.put(FULLY_QUALIFIED_NAME_PARTS, 10.0f);
    fields.put("columns.name", 2.0f);
    fields.put("columns.name.ngram", 1.0f);
    fields.put("columns.displayName", 1.0f);
    fields.put("columns.description", 1.0f);
    fields.put("columns.children.name", 2.0f);
    return fields;
  }
}
