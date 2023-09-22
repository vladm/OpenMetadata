package org.openmetadata.service.resources.analytics;

import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import javax.validation.Valid;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.SecurityContext;
import javax.ws.rs.core.UriInfo;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import org.openmetadata.schema.analytics.ReportData;
import org.openmetadata.schema.analytics.ReportData.ReportDataType;
import org.openmetadata.schema.type.MetadataOperation;
import org.openmetadata.service.Entity;
import org.openmetadata.service.jdbi3.CollectionDAO;
import org.openmetadata.service.jdbi3.ReportDataRepository;
import org.openmetadata.service.resources.Collection;
import org.openmetadata.service.resources.EntityTimeSeriesResource;
import org.openmetadata.service.security.Authorizer;
import org.openmetadata.service.security.policyevaluator.OperationContext;
import org.openmetadata.service.security.policyevaluator.ReportDataContext;
import org.openmetadata.service.security.policyevaluator.ResourceContextInterface;
import org.openmetadata.service.util.ResultList;

@Slf4j
@Path("/v1/analytics/dataInsights/data")
@Tag(name = "Data Insights", description = "APIs related to Data Insights data and charts.")
@Hidden
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Collection(name = "analytics")
public class ReportDataResource extends EntityTimeSeriesResource<ReportData, ReportDataRepository> {
  public static final String COLLECTION_PATH = "v1/analytics/dataInsights/data";

  public ReportDataResource(CollectionDAO repository, Authorizer authorizer) {
    super(ReportData.class, new ReportDataRepository(repository), authorizer);
  }

  public static class ReportDataResultList extends ResultList<ReportData> {
    /* Required for serde */
  }

  @GET
  @Operation(
      operationId = "getReportData",
      summary = "List the report data",
      description =
          "Get a list of all the report data for a given data insight report type , optionally filtered by  `startTs` and `endTs` of the result. "
              + "Use cursor-based pagination to limit the number of "
              + "entries in the list using `limit` and `before` or `after` query params.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "List of report data",
            content =
                @Content(mediaType = "application/json", schema = @Schema(implementation = ReportDataResultList.class)))
      })
  public ResultList<ReportData> list(
      @Context SecurityContext securityContext,
      @Parameter(description = "report data type", schema = @Schema(implementation = ReportDataType.class))
          @NonNull
          @QueryParam("reportDataType")
          ReportDataType reportDataType,
      @Parameter(
              description = "Filter report data results after the given start timestamp",
              schema = @Schema(type = "number"))
          @NonNull
          @QueryParam("startTs")
          Long startTs,
      @Parameter(
              description = "Filter report data results before the given end timestamp",
              schema = @Schema(type = "number"))
          @NonNull
          @QueryParam("endTs")
          Long endTs) {
    OperationContext operationContext = new OperationContext(Entity.DATA_INSIGHT_CHART, MetadataOperation.VIEW_ALL);
    ResourceContextInterface resourceContext = ReportDataContext.builder().build();
    authorizer.authorize(securityContext, operationContext, resourceContext);
    return repository.getReportData(reportDataType, startTs, endTs);
  }

  @POST
  @Operation(
      operationId = "addReportData",
      summary = "Add data to a data insight report",
      description = "Add data to a data insight report type",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Successfully added reportData.",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ReportData.class)))
      })
  public Response addReportData(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext, @Valid ReportData reportData) {
    OperationContext operationContext = new OperationContext(Entity.DATA_INSIGHT_CHART, MetadataOperation.CREATE);
    ResourceContextInterface resourceContext = ReportDataContext.builder().build();
    authorizer.authorize(securityContext, operationContext, resourceContext);
    return create(reportData, ReportDataRepository.REPORT_DATA_EXTENSION, reportData.getReportDataType().toString());
  }

  @DELETE
  @Path("/{reportDataType}/{date}")
  @Operation(
      operationId = "deleteReportData",
      summary = "Delete report data for a given report data type ando date",
      description = "Delete report data for a given report data type and date.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Successfully deleted report data.",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ReportData.class)))
      })
  public Response deleteReportData(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "report data type", schema = @Schema(implementation = ReportDataType.class))
          @NonNull
          @PathParam("reportDataType")
          ReportDataType reportDataType,
      @Parameter(description = "date in format YYYY-MM-DD", schema = @Schema(type = "String"))
          @NonNull
          @PathParam("date")
          String date)
      throws IOException {
    OperationContext operationContext = new OperationContext(Entity.DATA_INSIGHT_CHART, MetadataOperation.DELETE);
    ResourceContextInterface resourceContext = ReportDataContext.builder().build();
    authorizer.authorize(securityContext, operationContext, resourceContext);
    repository.deleteReportDataAtDate(reportDataType, date);
    return Response.ok().build();
  }
}
