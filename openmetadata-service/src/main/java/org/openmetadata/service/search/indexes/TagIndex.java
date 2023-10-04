package org.openmetadata.service.search.indexes;

import static org.openmetadata.service.Entity.FIELD_DESCRIPTION;
import static org.openmetadata.service.Entity.FIELD_DISPLAY_NAME;
import static org.openmetadata.service.Entity.FIELD_NAME;
import static org.openmetadata.service.search.EntityBuilderConstant.FIELD_NAME_NGRAM;
import static org.openmetadata.service.search.EntityBuilderConstant.FULLY_QUALIFIED_NAME_PARTS;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.openmetadata.schema.entity.classification.Tag;
import org.openmetadata.service.Entity;
import org.openmetadata.service.search.SearchIndexUtils;
import org.openmetadata.service.search.models.SearchSuggest;
import org.openmetadata.service.util.JsonUtils;

public class TagIndex implements SearchIndex {
  final Tag tag;
  private static final List<String> excludeFields = List.of("changeDescription");

  public TagIndex(Tag tag) {
    this.tag = tag;
  }

  public Map<String, Object> buildESDoc() {
    Map<String, Object> doc = JsonUtils.getMap(tag);
    SearchIndexUtils.removeNonIndexableFields(doc, excludeFields);
    List<SearchSuggest> suggest = new ArrayList<>();
    suggest.add(SearchSuggest.builder().input(tag.getFullyQualifiedName()).weight(5).build());
    suggest.add(SearchSuggest.builder().input(tag.getName()).weight(10).build());
    doc.put(
        "fqnParts",
        getFQNParts(
            tag.getFullyQualifiedName(), suggest.stream().map(SearchSuggest::getInput).collect(Collectors.toList())));
    if (tag.getDisabled() != null && tag.getDisabled()) {
      doc.put("disabled", tag.getDisabled());
    } else {
      doc.put("disabled", "false");
    }
    doc.put("suggest", suggest);
    doc.put("entityType", Entity.TAG);
    return doc;
  }

  public static Map<String, Float> getFields() {
    Map<String, Float> fields = new HashMap<>();
    fields.put(FIELD_NAME, 10.0f);
    fields.put(FIELD_DISPLAY_NAME, 10.0f);
    fields.put(FIELD_NAME_NGRAM, 1.0f);
    fields.put("classification.name", 1.0f);
    fields.put(FIELD_DESCRIPTION, 3.0f);
    fields.put(FULLY_QUALIFIED_NAME_PARTS, 10.0f);
    return fields;
  }
}
