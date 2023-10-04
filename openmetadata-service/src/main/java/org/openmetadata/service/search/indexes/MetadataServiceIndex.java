package org.openmetadata.service.search.indexes;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.openmetadata.schema.entity.services.MetadataService;
import org.openmetadata.service.Entity;
import org.openmetadata.service.search.SearchIndexUtils;
import org.openmetadata.service.search.models.SearchSuggest;
import org.openmetadata.service.util.JsonUtils;

public class MetadataServiceIndex implements SearchIndex {

  final MetadataService metadataService;

  private static final List<String> excludeFields = List.of("changeDescription");

  public MetadataServiceIndex(MetadataService metadataService) {
    this.metadataService = metadataService;
  }

  public Map<String, Object> buildESDoc() {
    Map<String, Object> doc = JsonUtils.getMap(metadataService);
    SearchIndexUtils.removeNonIndexableFields(doc, excludeFields);
    List<SearchSuggest> suggest = new ArrayList<>();
    suggest.add(SearchSuggest.builder().input(metadataService.getName()).weight(5).build());
    suggest.add(SearchSuggest.builder().input(metadataService.getFullyQualifiedName()).weight(5).build());
    doc.put(
        "fqnParts",
        getFQNParts(
            metadataService.getFullyQualifiedName(),
            suggest.stream().map(SearchSuggest::getInput).collect(Collectors.toList())));
    doc.put("suggest", suggest);
    doc.put("entityType", Entity.METADATA_SERVICE);
    if (metadataService.getOwner() != null) {
      doc.put("owner", getOwnerWithDisplayName(metadataService.getOwner()));
    }
    return doc;
  }
}
