package org.openmetadata.service.search.indexes;

import java.util.Map;
import org.openmetadata.schema.analytics.ReportData;
import org.openmetadata.service.util.JsonUtils;

public class EntityReportDataIndex implements SearchIndex {
  private final ReportData reportData;

  public EntityReportDataIndex(ReportData reportData) {
    this.reportData = reportData;
  }

  @Override
  public Map<String, Object> buildESDoc() {
    Map<String, Object> doc = JsonUtils.getMap(reportData);
    doc.put("entityType", "entityReportData");
    return doc;
  }
}
