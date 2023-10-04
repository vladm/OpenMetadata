package org.openmetadata.service.search;

import static org.openmetadata.service.exception.CatalogExceptionMessage.NOT_IMPLEMENTED_METHOD;

import java.io.IOException;
import java.security.KeyStoreException;
import java.text.ParseException;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import javax.net.ssl.SSLContext;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.tuple.Pair;
import org.openmetadata.schema.dataInsight.DataInsightChartResult;
import org.openmetadata.schema.service.configuration.elasticsearch.ElasticSearchConfiguration;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.service.exception.CustomExceptionMessage;
import org.openmetadata.service.search.models.IndexMapping;
import org.openmetadata.service.util.SSLUtil;
import org.opensearch.action.bulk.BulkRequest;
import org.opensearch.action.bulk.BulkResponse;
import org.opensearch.client.RequestOptions;

public interface SearchClient {

  String UPDATE = "update";

  String ADD = "add";

  String DELETE = "delete";
  String GLOBAL_SEARCH_ALIAS = "AllEntities";

  String DEFAULT_UPDATE_SCRIPT = "for (k in params.keySet()) { ctx._source.put(k, params.get(k)) }";
  String CLASSIFICATION_DISABLE_SCRIPT = "ctx._source.disabled=%s";
  String REMOVE_DOMAINS_CHILDREN_SCRIPT = "ctx._source.remove('domain')";
  String PROPAGATE_FIELD_SCRIPT = "if(ctx._source.%s == null){ ctx._source.put('%s', params)}";
  String REMOVE_PROPAGATED_FIELD_SCRIPT =
      "if((ctx._source.%s != null) && (ctx._source.%s.id == '%s')){ ctx._source.remove('%s')}";
  String UPDATE_PROPAGATED_FIELD_SCRIPT =
      "if((ctx._source.%s == null) || (ctx._source.%s.id == '%s')) { ctx._source.put('%s', params)}";
  String SOFT_DELETE_RESTORE_SCRIPT = "ctx._source.put('deleted', '%s')";
  String REMOVE_TAGS_CHILDREN_SCRIPT =
      "for (int i = 0; i < ctx._source.tags.length; i++) { if (ctx._source.tags[i].tagFQN == '%s') { ctx._source.tags.remove(i) }}";
  String REMOVE_TEST_SUITE_CHILDREN_SCRIPT =
      "for (int i = 0; i < ctx._source.testSuites.length; i++) { if (ctx._source.testSuites[i].id == '%s') { ctx._source.testSuites.remove(i) }}";

  boolean isClientAvailable();

  ElasticSearchConfiguration.SearchType getSearchType();

  boolean indexExists(String indexName);

  boolean createIndex(IndexMapping indexMapping, String indexMappingContent);

  void updateIndex(IndexMapping indexMapping, String indexMappingContent);

  void deleteIndex(IndexMapping indexMapping);

  void createAliases(IndexMapping indexMapping);

  Response search(SearchRequest request) throws IOException;

  Response searchBySourceUrl(String sourceUrl) throws IOException;

  Response searchByField(String fieldName, String fieldValue, String index) throws IOException;

  Response aggregate(String index, String fieldName, String value, String query) throws IOException;

  Response suggest(SearchRequest request) throws IOException;

  void createEntity(String indexName, String docId, String doc);

  void createTimeSeriesEntity(String indexName, String docId, String doc);

  void updateEntity(String indexName, String docId, Map<String, Object> doc, String scriptTxt);

  void deleteByScript(String indexName, String scriptTxt, Map<String, Object> params);

  void deleteEntity(String indexName, String docId);

  void deleteEntityByFields(String indexName, List<Pair<String, String>> fieldAndValue);

  void softDeleteOrRestoreEntity(String indexName, String docId, String scriptTxt);

  void softDeleteOrRestoreChildren(String indexName, String scriptTxt, List<Pair<String, String>> fieldAndValue);

  void updateChildren(String indexName, Pair<String, String> fieldAndValue, Pair<String, EntityReference> updates);

  TreeMap<Long, List<Object>> getSortedDate(
      String team,
      Long scheduleTime,
      Long currentTime,
      DataInsightChartResult.DataInsightChartType chartType,
      String indexName)
      throws IOException, ParseException;

  Response listDataInsightChartResult(
      Long startTs,
      Long endTs,
      String tier,
      String team,
      DataInsightChartResult.DataInsightChartType dataInsightChartName,
      Integer size,
      Integer from,
      String queryFilter,
      String dataReportIndex)
      throws IOException, ParseException;

  default BulkResponse bulk(BulkRequest data, RequestOptions options) throws IOException {
    throw new CustomExceptionMessage(Response.Status.NOT_IMPLEMENTED, NOT_IMPLEMENTED_METHOD);
  }

  default org.elasticsearch.action.bulk.BulkResponse bulk(
      org.elasticsearch.action.bulk.BulkRequest data, org.elasticsearch.client.RequestOptions options)
      throws IOException {
    throw new CustomExceptionMessage(Response.Status.NOT_IMPLEMENTED, NOT_IMPLEMENTED_METHOD);
  }

  default int getSuccessFromBulkResponse(BulkResponse response) {
    throw new CustomExceptionMessage(Response.Status.NOT_IMPLEMENTED, NOT_IMPLEMENTED_METHOD);
  }

  default int getSuccessFromBulkResponse(org.elasticsearch.action.bulk.BulkResponse response) {
    throw new CustomExceptionMessage(Response.Status.NOT_IMPLEMENTED, NOT_IMPLEMENTED_METHOD);
  }

  void close();

  default SSLContext createElasticSearchSSLContext(ElasticSearchConfiguration elasticSearchConfiguration)
      throws KeyStoreException {
    return elasticSearchConfiguration.getScheme().equals("https")
        ? SSLUtil.createSSLContext(
            elasticSearchConfiguration.getTruststorePath(),
            elasticSearchConfiguration.getTruststorePassword(),
            "ElasticSearch")
        : null;
  }
}
