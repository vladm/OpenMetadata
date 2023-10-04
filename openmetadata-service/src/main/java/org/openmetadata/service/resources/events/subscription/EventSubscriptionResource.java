/*
 *  Copyright 2021 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.openmetadata.service.resources.events.subscription;

import static org.openmetadata.common.utils.CommonUtil.listOrEmpty;
import static org.openmetadata.schema.api.events.CreateEventSubscription.SubscriptionType.ACTIVITY_FEED;

import io.swagger.v3.oas.annotations.ExternalDocumentation;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import javax.json.JsonPatch;
import javax.validation.Valid;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.ws.rs.BadRequestException;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.PATCH;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.SecurityContext;
import javax.ws.rs.core.UriInfo;
import lombok.extern.slf4j.Slf4j;
import org.openmetadata.common.utils.CommonUtil;
import org.openmetadata.schema.api.events.CreateEventSubscription;
import org.openmetadata.schema.entity.events.EventSubscription;
import org.openmetadata.schema.entity.events.SubscriptionStatus;
import org.openmetadata.schema.type.EntityHistory;
import org.openmetadata.schema.type.Function;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.MetadataOperation;
import org.openmetadata.schema.type.SubscriptionResourceDescriptor;
import org.openmetadata.service.Entity;
import org.openmetadata.service.OpenMetadataApplicationConfig;
import org.openmetadata.service.events.scheduled.ReportsHandler;
import org.openmetadata.service.events.subscription.AlertUtil;
import org.openmetadata.service.events.subscription.EventsSubscriptionRegistry;
import org.openmetadata.service.exception.EntityNotFoundException;
import org.openmetadata.service.jdbi3.CollectionDAO;
import org.openmetadata.service.jdbi3.EventSubscriptionRepository;
import org.openmetadata.service.jdbi3.ListFilter;
import org.openmetadata.service.resources.Collection;
import org.openmetadata.service.resources.EntityResource;
import org.openmetadata.service.security.Authorizer;
import org.openmetadata.service.util.EntityUtil;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.util.ResultList;
import org.quartz.SchedulerException;

@Slf4j
@Path("/v1/events/subscriptions")
@Tag(
    name = "Events",
    description =
        "The `Events` are changes to metadata and are sent when entities are created, modified, or updated. External systems can subscribe to events using event subscription API over Webhooks, Slack, or Microsoft Teams.")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Collection(name = "events/subscriptions")
public class EventSubscriptionResource extends EntityResource<EventSubscription, EventSubscriptionRepository> {
  public static final String COLLECTION_PATH = "/v1/events/subscriptions";
  public static final String FIELDS = "owner,filteringRules";

  public EventSubscriptionResource(Authorizer authorizer) {
    super(Entity.EVENT_SUBSCRIPTION, authorizer);
  }

  @Override
  protected List<MetadataOperation> getEntitySpecificOperations() {
    addViewOperation("filteringRules", MetadataOperation.VIEW_BASIC);
    return null;
  }

  public static class EventSubscriptionList extends ResultList<EventSubscription> {
    /* Required for serde */
  }

  public static class EventSubResourceDescriptorList extends ResultList<SubscriptionResourceDescriptor> {
    /* Required for serde */
  }

  @Override
  public void initialize(OpenMetadataApplicationConfig config) {
    try {
      repository.initSeedDataFromResources();
      EventsSubscriptionRegistry.initialize(listOrEmpty(EventSubscriptionResource.getDescriptors()));
      ReportsHandler.initialize();
      initializeEventSubscriptions();
    } catch (Exception ex) {
      // Starting application should not fail
      LOG.warn("Exception during initialization", ex);
    }
  }

  private void initializeEventSubscriptions() {
    try {
      CollectionDAO daoCollection = repository.getDaoCollection();
      List<String> listAllEventsSubscriptions =
          daoCollection
              .eventSubscriptionDAO()
              .listAllEventsSubscriptions(daoCollection.eventSubscriptionDAO().getTableName());
      List<EventSubscription> eventSubList = JsonUtils.readObjects(listAllEventsSubscriptions, EventSubscription.class);
      eventSubList.forEach(
          subscription -> {
            if (subscription.getSubscriptionType() != ACTIVITY_FEED) {
              repository.addSubscriptionPublisher(subscription);
            }
          });
    } catch (Exception ex) {
      // Starting application should not fail
      LOG.warn("Exception during initializeEventSubscriptions", ex);
    }
  }

  @GET
  @Operation(
      operationId = "listEventSubscriptions",
      summary = "List all available Event Subscriptions",
      description = "Get a list of All available Event Subscriptions",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "List of Event Subscriptions",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = EventSubscriptionResource.EventSubscriptionList.class)))
      })
  public ResultList<EventSubscription> listEventSubscriptions(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(
              description = "Fields requested in the returned resource",
              schema = @Schema(type = "string", example = FIELDS))
          @QueryParam("fields")
          String fieldsParam,
      @Parameter(description = "Limit the number event subscriptions returned. (1 to 1000000, default = " + "10) ")
          @DefaultValue("10")
          @Min(0)
          @Max(1000000)
          @QueryParam("limit")
          int limitParam,
      @Parameter(
              description = "Returns list of event subscriptions before this cursor",
              schema = @Schema(type = "string"))
          @QueryParam("before")
          String before,
      @Parameter(
              description = "Returns list of event subscriptions after this cursor",
              schema = @Schema(type = "string"))
          @QueryParam("after")
          String after) {
    ListFilter filter = new ListFilter(null);
    return listInternal(uriInfo, securityContext, fieldsParam, filter, limitParam, before, after);
  }

  @GET
  @Path("/{id}")
  @Valid
  @Operation(
      operationId = "getEventSubscriptionByID",
      summary = "Get a event Subscription by ID",
      description = "Get a event Subscription by given Id",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Entity events",
            content =
                @Content(mediaType = "application/json", schema = @Schema(implementation = EventSubscription.class))),
        @ApiResponse(responseCode = "404", description = "Entity for instance {id} is not found")
      })
  public EventSubscription getEventsSubscriptionById(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Id of the Event Subscription", schema = @Schema(type = "UUID")) @PathParam("id")
          UUID id,
      @Parameter(
              description = "Fields requested in the returned resource",
              schema = @Schema(type = "string", example = FIELDS))
          @QueryParam("fields")
          String fieldsParam) {
    return getInternal(uriInfo, securityContext, id, fieldsParam, null);
  }

  @GET
  @Path("/name/{eventSubscriptionName}")
  @Operation(
      operationId = "getEventSubscriptionByName",
      summary = "Get an Event Subscription by name",
      description = "Get an Event Subscription by name.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Event Subscription with request name is returned",
            content =
                @Content(mediaType = "application/json", schema = @Schema(implementation = EventSubscription.class))),
        @ApiResponse(
            responseCode = "404",
            description = "Event Subscription for instance {eventSubscriptionName} is not found")
      })
  public EventSubscription getEventsSubscriptionByName(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Name of the Event Subscription", schema = @Schema(type = "string"))
          @PathParam("eventSubscriptionName")
          String name,
      @Parameter(
              description = "Fields requested in the returned resource",
              schema = @Schema(type = "string", example = FIELDS))
          @QueryParam("fields")
          String fieldsParam) {
    return getByNameInternal(uriInfo, securityContext, name, fieldsParam, null);
  }

  @POST
  @Operation(
      operationId = "createEventSubscription",
      summary = "Create a new Event Subscription",
      description = "Create a new Event Subscription",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Event Subscription Created",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = CreateEventSubscription.class))),
        @ApiResponse(responseCode = "400", description = "Bad request")
      })
  public Response createEventSubscription(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext, @Valid CreateEventSubscription request) {
    EventSubscription eventSub = getEventSubscription(request, securityContext.getUserPrincipal().getName());
    // Only one Creation is allowed
    if (eventSub.getAlertType() == CreateEventSubscription.AlertType.DATA_INSIGHT_REPORT
        && ReportsHandler.getInstance() != null
        && ReportsHandler.getInstance().getReportMap().size() > 0) {
      throw new BadRequestException("Data Insight Report Alert already exists.");
    }
    Response response = create(uriInfo, securityContext, eventSub);
    repository.addSubscriptionPublisher(eventSub);
    return response;
  }

  @PUT
  @Operation(
      operationId = "createOrUpdateEventSubscription",
      summary = "Updated an existing or create a new Event Subscription",
      description = "Updated an existing or create a new Event Subscription",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "create Event Subscription",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = CreateEventSubscription.class))),
        @ApiResponse(responseCode = "400", description = "Bad request")
      })
  public Response createOrUpdateEventSubscription(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext, @Valid CreateEventSubscription create) {
    // Only one Creation is allowed for Data Insight
    if (create.getAlertType() == CreateEventSubscription.AlertType.DATA_INSIGHT_REPORT) {
      try {
        repository.getByName(null, create.getName(), repository.getFields("id"));
      } catch (EntityNotFoundException ex) {
        if (ReportsHandler.getInstance() != null && ReportsHandler.getInstance().getReportMap().size() > 0) {
          throw new BadRequestException("Data Insight Report Alert already exists.");
        }
      }
    }
    EventSubscription eventSub = getEventSubscription(create, securityContext.getUserPrincipal().getName());
    Response response = createOrUpdate(uriInfo, securityContext, eventSub);
    repository.updateEventSubscription((EventSubscription) response.getEntity());
    return response;
  }

  @PUT
  @Path("/trigger/{id}")
  @Operation(
      operationId = "triggerDataInsightJob",
      summary = "Trigger a existing Data Insight Report Job to run",
      description = "Trigger a existing Data Insight Report Job to run",
      responses = {
        @ApiResponse(responseCode = "200", description = "Trigger a Data Insight Job"),
        @ApiResponse(responseCode = "400", description = "Bad request")
      })
  public Response triggerDataInsightJob(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Id of the event Subscription", schema = @Schema(type = "UUID")) @PathParam("id")
          UUID id)
      throws SchedulerException {
    authorizer.authorizeAdmin(securityContext);
    EventSubscription eventSub = repository.find(id, Include.NON_DELETED);
    return ReportsHandler.getInstance().triggerExistingDataInsightJob(eventSub);
  }

  @PATCH
  @Path("/{id}")
  @Operation(
      operationId = "patchEventSubscription",
      summary = "Update an Event Subscriptions",
      description = "Update an existing Event Subscriptions using JsonPatch.",
      externalDocs = @ExternalDocumentation(description = "JsonPatch RFC", url = "https://tools.ietf.org/html/rfc6902"))
  @Consumes(MediaType.APPLICATION_JSON_PATCH_JSON)
  public Response patchEventSubscription(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Id of the event Subscription", schema = @Schema(type = "UUID")) @PathParam("id")
          UUID id,
      @RequestBody(
              description = "JsonPatch with array of operations",
              content =
                  @Content(
                      mediaType = MediaType.APPLICATION_JSON_PATCH_JSON,
                      examples = {
                        @ExampleObject("[" + "{op:remove, path:/a}," + "{op:add, path: /b, value: val}" + "]")
                      }))
          JsonPatch patch) {
    Response response = patchInternal(uriInfo, securityContext, id, patch);
    repository.updateEventSubscription((EventSubscription) response.getEntity());
    return response;
  }

  @GET
  @Path("/{id}/versions")
  @Operation(
      operationId = "listAllEventSubscriptionVersion",
      summary = "List Event Subscription versions",
      description = "Get a list of all the versions of an Event Subscription identified by `Id`",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "List of Event Subscription versions",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = EntityHistory.class)))
      })
  public EntityHistory listEventSubscriptionVersions(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Id of the Event Subscription", schema = @Schema(type = "UUID")) @PathParam("id")
          UUID id) {
    return super.listVersionsInternal(securityContext, id);
  }

  @GET
  @Path("/{id}/versions/{version}")
  @Operation(
      operationId = "getSpecificEventSubscriptionVersion",
      summary = "Get a version of the Event Subscription",
      description = "Get a version of the Event Subscription by given `Id`",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Get specific version of Event Subscription",
            content =
                @Content(mediaType = "application/json", schema = @Schema(implementation = EventSubscription.class))),
        @ApiResponse(
            responseCode = "404",
            description = "Event Subscription for instance {id} and version {version} is " + "not found")
      })
  public EventSubscription getEventSubscriptionVersion(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Id of the Event Subscription", schema = @Schema(type = "UUID")) @PathParam("id")
          UUID id,
      @Parameter(
              description = "Event Subscription version number in the form `major`.`minor`",
              schema = @Schema(type = "string", example = "0.1 or 1.1"))
          @PathParam("version")
          String version) {
    return super.getVersionInternal(securityContext, id, version);
  }

  @DELETE
  @Path("/{id}")
  @Valid
  @Operation(
      operationId = "deleteEventSubscription",
      summary = "Delete an Event Subscription by Id",
      description = "Delete an Event Subscription",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Entity events",
            content =
                @Content(mediaType = "application/json", schema = @Schema(implementation = EventSubscription.class))),
        @ApiResponse(responseCode = "404", description = "Entity for instance {id} is not found")
      })
  public Response deleteEventSubscription(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Id of the Event Subscription", schema = @Schema(type = "UUID")) @PathParam("id")
          UUID id)
      throws InterruptedException, SchedulerException {
    Response response = delete(uriInfo, securityContext, id, true, true);
    EventSubscription deletedEntity = (EventSubscription) response.getEntity();
    repository.deleteEventSubscriptionPublisher(deletedEntity);
    return response;
  }

  @DELETE
  @Path("/name/{name}")
  @Operation(
      operationId = "deleteEventSubscriptionByName",
      summary = "Delete an Event Subscription by name",
      description = "Delete an Event Subscription by given `name`.",
      responses = {
        @ApiResponse(responseCode = "200", description = "OK"),
        @ApiResponse(responseCode = "404", description = "Entity for instance {name} is not found")
      })
  public Response deleteEventSubscriptionByName(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Name of the Event Subscription", schema = @Schema(type = "string")) @PathParam("name")
          String name)
      throws InterruptedException, SchedulerException {
    Response response = deleteByName(uriInfo, securityContext, name, true, true);
    EventSubscription deletedEntity = (EventSubscription) response.getEntity();
    repository.deleteEventSubscriptionPublisher(deletedEntity);
    return response;
  }

  @GET
  @Path("/name/{eventSubscriptionName}/status")
  @Valid
  @Operation(
      operationId = "getEventSubscriptionStatus",
      summary = "Get Event Subscription status",
      description = "Get a event Subscription status by given Name",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Return the current status of the Event Subscription",
            content =
                @Content(mediaType = "application/json", schema = @Schema(implementation = SubscriptionStatus.class))),
        @ApiResponse(responseCode = "404", description = "Entity for instance {id} is not found")
      })
  public SubscriptionStatus getEventSubscriptionStatusByName(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Name of the Event Subscription", schema = @Schema(type = "string"))
          @PathParam("eventSubscriptionName")
          String name) {
    EventSubscription sub = repository.getByName(null, name, repository.getFields("name"));
    return repository.getStatusForEventSubscription(sub.getId());
  }

  @GET
  @Path("/{eventSubscriptionId}/status")
  @Valid
  @Operation(
      operationId = "getEventSubscriptionStatusById",
      summary = "Get Event Subscription status by Id",
      description = "Get a event Subscription status by given Name",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Return the current status of the Event Subscription",
            content =
                @Content(mediaType = "application/json", schema = @Schema(implementation = SubscriptionStatus.class))),
        @ApiResponse(responseCode = "404", description = "Entity for instance {id} is not found")
      })
  public SubscriptionStatus getEventSubscriptionStatusById(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Name of the Event Subscription", schema = @Schema(type = "UUID"))
          @PathParam("eventSubscriptionId")
          UUID id) {
    return repository.getStatusForEventSubscription(id);
  }

  @GET
  @Path("/functions")
  @Operation(
      operationId = "listEventSubscriptionFunctions",
      summary = "Get list of Event Subscription functions used in filtering EventSubscription",
      description = "Get list of Event Subscription functions used in filtering conditions in Event Subscriptions")
  public List<Function> listEventSubscriptionFunctions(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext) {
    return new ArrayList<>(AlertUtil.getAlertFilterFunctions().values());
  }

  @GET
  @Path("/resources")
  @Operation(
      operationId = "listEventSubscriptionResources",
      summary = "Get list of Event Subscriptions Resources used in filtering Event Subscription",
      description = "Get list of EventSubscription functions used in filtering conditions in Event Subscription")
  public ResultList<SubscriptionResourceDescriptor> listEventSubResources(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext) {
    return new ResultList<>(EventsSubscriptionRegistry.listResourceDescriptors());
  }

  @GET
  @Path("/validation/condition/{expression}")
  @Operation(
      operationId = "validateCondition",
      summary = "Validate a given condition",
      description = "Validate a given condition expression used in filtering rules.",
      responses = {
        @ApiResponse(responseCode = "204", description = "No value is returned"),
        @ApiResponse(responseCode = "400", description = "Invalid expression")
      })
  public void validateCondition(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Expression to validate", schema = @Schema(type = "string")) @PathParam("expression")
          String expression) {
    AlertUtil.validateExpression(expression, Boolean.class);
  }

  public EventSubscription getEventSubscription(CreateEventSubscription create, String user) {
    return copy(new EventSubscription(), create, user)
        .withAlertType(create.getAlertType())
        .withTrigger(create.getTrigger())
        .withEnabled(create.getEnabled())
        .withBatchSize(create.getBatchSize())
        .withTimeout(create.getTimeout())
        .withFilteringRules(create.getFilteringRules())
        .withSubscriptionType(create.getSubscriptionType())
        .withSubscriptionConfig(create.getSubscriptionConfig())
        .withProvider(create.getProvider());
  }

  public static List<SubscriptionResourceDescriptor> getDescriptors() throws IOException {
    List<String> jsonDataFiles = EntityUtil.getJsonDataResources(".*json/data/EventSubResourceDescriptor.json$");
    if (jsonDataFiles.size() != 1) {
      LOG.warn("Invalid number of jsonDataFiles {}. Only one expected.", jsonDataFiles.size());
      return Collections.emptyList();
    }
    String jsonDataFile = jsonDataFiles.get(0);
    try {
      String json = CommonUtil.getResourceAsStream(EventSubscriptionResource.class.getClassLoader(), jsonDataFile);
      return JsonUtils.readObjects(json, SubscriptionResourceDescriptor.class);
    } catch (Exception e) {
      LOG.warn("Failed to initialize the events subscription resource descriptors from file {}", jsonDataFile, e);
    }
    return Collections.emptyList();
  }
}
