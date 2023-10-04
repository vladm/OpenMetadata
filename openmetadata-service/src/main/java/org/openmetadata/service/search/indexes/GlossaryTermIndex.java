package org.openmetadata.service.search.indexes;

import static org.openmetadata.service.Entity.FIELD_DESCRIPTION;
import static org.openmetadata.service.Entity.FIELD_DISPLAY_NAME;
import static org.openmetadata.service.Entity.FIELD_NAME;
import static org.openmetadata.service.search.EntityBuilderConstant.FIELD_DISPLAY_NAME_NGRAM;
import static org.openmetadata.service.search.EntityBuilderConstant.FIELD_NAME_NGRAM;
import static org.openmetadata.service.search.EntityBuilderConstant.FULLY_QUALIFIED_NAME;
import static org.openmetadata.service.search.EntityBuilderConstant.FULLY_QUALIFIED_NAME_PARTS;
import static org.openmetadata.service.search.EntityBuilderConstant.NAME_KEYWORD;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.openmetadata.schema.entity.data.GlossaryTerm;
import org.openmetadata.service.Entity;
import org.openmetadata.service.search.SearchIndexUtils;
import org.openmetadata.service.search.models.SearchSuggest;
import org.openmetadata.service.util.JsonUtils;

public class GlossaryTermIndex implements SearchIndex {
  final GlossaryTerm glossaryTerm;
  final List<String> excludeFields = List.of("changeDescription");

  public GlossaryTermIndex(GlossaryTerm glossaryTerm) {
    this.glossaryTerm = glossaryTerm;
  }

  public Map<String, Object> buildESDoc() {
    Map<String, Object> doc = JsonUtils.getMap(glossaryTerm);
    SearchIndexUtils.removeNonIndexableFields(doc, excludeFields);
    List<SearchSuggest> suggest = new ArrayList<>();
    suggest.add(SearchSuggest.builder().input(glossaryTerm.getName()).weight(5).build());
    if (glossaryTerm.getDisplayName() != null && !glossaryTerm.getDisplayName().isEmpty()) {
      suggest.add(SearchSuggest.builder().input(glossaryTerm.getDisplayName()).weight(10).build());
    }
    doc.put(
        "fqnParts",
        getFQNParts(
            glossaryTerm.getFullyQualifiedName(),
            suggest.stream().map(SearchSuggest::getInput).collect(Collectors.toList())));
    doc.put("suggest", suggest);
    doc.put("entityType", Entity.GLOSSARY_TERM);
    if (glossaryTerm.getOwner() != null) {
      doc.put("owner", getOwnerWithDisplayName(glossaryTerm.getOwner()));
    }
    if (glossaryTerm.getDomain() != null) {
      doc.put("domain", getDomainWithDisplayName(glossaryTerm.getDomain()));
    }
    return doc;
  }

  public static Map<String, Float> getFields() {
    Map<String, Float> fields = new HashMap<>();
    fields.put(FIELD_DISPLAY_NAME, 10.0f);
    fields.put(FIELD_DISPLAY_NAME_NGRAM, 1.0f);
    fields.put(FIELD_NAME, 10.0f);
    fields.put(NAME_KEYWORD, 1.0f);
    fields.put(FIELD_NAME_NGRAM, 1.0f);
    fields.put(FULLY_QUALIFIED_NAME + ".keyword", 3.0f);
    fields.put(FULLY_QUALIFIED_NAME + ".ngram", 1.0f);
    fields.put("synonyms", 5.0f);
    fields.put("synonyms.ngram", 1.0f);
    fields.put(FIELD_DESCRIPTION, 3.0f);
    fields.put("glossary.name", 5.0f);
    fields.put("glossary.displayName", 5.0f);
    fields.put("glossary.displayName.ngram", 1.0f);
    fields.put(FULLY_QUALIFIED_NAME_PARTS, 10.0f);
    return fields;
  }
}
