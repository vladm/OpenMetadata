package org.openmetadata.service.dataInsight;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.List;
import org.elasticsearch.search.SearchHits;
import org.elasticsearch.search.aggregations.Aggregations;
import org.openmetadata.schema.dataInsight.DataInsightChartResult;

public abstract class DataInsightAggregatorInterface {
  protected static final String ENTITY_TYPE = "entityType";
  protected static final String SERVICE_NAME = "serviceName";
  protected static final String COMPLETED_DESCRIPTION_FRACTION = "completedDescriptionFraction";
  protected static final String HAS_OWNER_FRACTION = "hasOwnerFraction";
  protected static final String ENTITY_COUNT = "entityCount";
  protected static final String TIMESTAMP = "timestamp";
  protected static final String ENTITY_TIER = "entityTier";
  protected final Aggregations aggregationsEs;
  protected final org.opensearch.search.aggregations.Aggregations aggregationsOs;
  protected final org.opensearch.search.SearchHits hitsOs;
  protected final SearchHits hitsEs;
  protected final DataInsightChartResult.DataInsightChartType dataInsightChartType;

  protected DataInsightAggregatorInterface(
      Aggregations aggregations, DataInsightChartResult.DataInsightChartType dataInsightChartType) {
    this.aggregationsEs = aggregations;
    this.aggregationsOs = null;
    this.dataInsightChartType = dataInsightChartType;
    this.hitsOs = null;
    this.hitsEs = null;
  }

  protected DataInsightAggregatorInterface(
      org.opensearch.search.aggregations.Aggregations aggregations,
      DataInsightChartResult.DataInsightChartType dataInsightChartType) {
    this.aggregationsEs = null;
    this.aggregationsOs = aggregations;
    this.dataInsightChartType = dataInsightChartType;
    this.hitsOs = null;
    this.hitsEs = null;
  }

  protected DataInsightAggregatorInterface(
      SearchHits hits, DataInsightChartResult.DataInsightChartType dataInsightChartType) {
    this.aggregationsEs = null;
    this.aggregationsOs = null;
    this.dataInsightChartType = dataInsightChartType;
    this.hitsOs = null;
    this.hitsEs = hits;
  }

  protected DataInsightAggregatorInterface(
      org.opensearch.search.SearchHits hits, DataInsightChartResult.DataInsightChartType dataInsightChartType) {
    this.aggregationsEs = null;
    this.aggregationsOs = null;
    this.dataInsightChartType = dataInsightChartType;
    this.hitsOs = hits;
    this.hitsEs = null;
  }

  public abstract DataInsightChartResult process() throws ParseException;

  public abstract List<Object> aggregate() throws ParseException;

  public Long convertDatTimeStringToTimestamp(String dateTimeString) throws ParseException {
    SimpleDateFormat dateTimeFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    return dateTimeFormat.parse(dateTimeString).getTime();
  }
}
