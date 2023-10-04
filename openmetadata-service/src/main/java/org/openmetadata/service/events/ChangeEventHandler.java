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

package org.openmetadata.service.events;

import static org.openmetadata.common.utils.CommonUtil.listOrEmpty;
import static org.openmetadata.service.events.subscription.AlertsRuleEvaluator.getEntity;
import static org.openmetadata.service.formatter.util.FormatterUtil.getChangeEventFromResponseContext;
import static org.openmetadata.service.jdbi3.unitofwork.JdbiUnitOfWorkProvider.getWrappedInstanceForDaoClass;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerResponseContext;
import javax.ws.rs.core.SecurityContext;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.openmetadata.schema.EntityInterface;
import org.openmetadata.schema.entity.feed.Thread;
import org.openmetadata.schema.type.ChangeEvent;
import org.openmetadata.schema.type.EventType;
import org.openmetadata.service.Entity;
import org.openmetadata.service.OpenMetadataApplicationConfig;
import org.openmetadata.service.events.subscription.AlertUtil;
import org.openmetadata.service.jdbi3.CollectionDAO;
import org.openmetadata.service.jdbi3.FeedRepository;
import org.openmetadata.service.socket.WebSocketManager;
import org.openmetadata.service.util.FeedUtils;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.util.NotificationHandler;

@Slf4j
public class ChangeEventHandler implements EventHandler {
  private ObjectMapper mapper;
  private NotificationHandler notificationHandler;

  public void init(OpenMetadataApplicationConfig config) {
    this.mapper = new ObjectMapper();
    this.notificationHandler = new NotificationHandler();
  }

  @SneakyThrows
  public Void process(ContainerRequestContext requestContext, ContainerResponseContext responseContext) {
    String method = requestContext.getMethod();
    SecurityContext securityContext = requestContext.getSecurityContext();
    String loggedInUserName = securityContext.getUserPrincipal().getName();
    try {
      CollectionDAO collectionDAO = (CollectionDAO) getWrappedInstanceForDaoClass(CollectionDAO.class);
      CollectionDAO.ChangeEventDAO changeEventDAO = collectionDAO.changeEventDAO();
      FeedRepository feedRepository = new FeedRepository();
      if (responseContext.getEntity() != null && responseContext.getEntity().getClass().equals(Thread.class)) {
        // we should move this to Email Application notifications instead of processing it here.
        notificationHandler.processNotifications(responseContext);
      } else {
        ChangeEvent changeEvent = getChangeEventFromResponseContext(responseContext, loggedInUserName, method);
        if (changeEvent != null) {
          // Always set the Change Event Username as context Principal, the one creating the CE
          changeEvent.setUserName(loggedInUserName);
          LOG.info(
              "Recording change event {}:{}:{}:{}",
              changeEvent.getTimestamp(),
              changeEvent.getEntityId(),
              changeEvent.getEventType(),
              changeEvent.getEntityType());
          EventPubSub.publish(changeEvent);
          if (changeEvent.getEntity() != null) {
            Object entity = changeEvent.getEntity();
            changeEvent = copyChangeEvent(changeEvent);
            changeEvent.setEntity(JsonUtils.pojoToMaskedJson(entity));
          }

          changeEventDAO.insert(JsonUtils.pojoToJson(changeEvent));

          // Add a new thread to the entity for every change event
          // for the event to appear in activity feeds
          if (Entity.shouldDisplayEntityChangeOnFeed(changeEvent.getEntityType())
              && (AlertUtil.shouldProcessActivityFeedRequest(changeEvent))) {
            for (Thread thread : listOrEmpty(FeedUtils.getThreads(changeEvent, loggedInUserName))) {
              // Don't create a thread if there is no message
              if (thread.getMessage() != null && !thread.getMessage().isEmpty()) {
                feedRepository.create(thread, changeEvent);
                String jsonThread = mapper.writeValueAsString(thread);
                WebSocketManager.getInstance()
                    .broadCastMessageToAll(WebSocketManager.FEED_BROADCAST_CHANNEL, jsonThread);
                if (changeEvent.getEventType().equals(EventType.ENTITY_DELETED)) {
                  deleteAllConversationsRelatedToEntity(getEntity(changeEvent), collectionDAO);
                }
              }
            }
          }
        }
      }
    } catch (Exception e) {
      LOG.error("Failed to capture the change event for method {} due to ", method, e);
    }
    return null;
  }

  private static ChangeEvent copyChangeEvent(ChangeEvent changeEvent) {
    return new ChangeEvent()
        .withEventType(changeEvent.getEventType())
        .withEntityId(changeEvent.getEntityId())
        .withEntityType(changeEvent.getEntityType())
        .withUserName(changeEvent.getUserName())
        .withTimestamp(changeEvent.getTimestamp())
        .withChangeDescription(changeEvent.getChangeDescription())
        .withCurrentVersion(changeEvent.getCurrentVersion());
  }

  private void deleteAllConversationsRelatedToEntity(EntityInterface entityInterface, CollectionDAO collectionDAO) {
    String entityId = entityInterface.getId().toString();
    List<String> threadIds = collectionDAO.feedDAO().findByEntityId(entityId);
    for (String threadId : threadIds) {
      UUID id = UUID.fromString(threadId);
      collectionDAO.relationshipDAO().deleteAll(id, Entity.THREAD);
      collectionDAO.feedDAO().delete(id);
    }
  }

  public void close() {
    /* Nothing to do */
  }
}
