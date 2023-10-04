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

package org.openmetadata.service.jdbi3;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.openmetadata.schema.ColumnsEntityInterface;
import org.openmetadata.schema.api.lineage.AddLineage;
import org.openmetadata.schema.entity.data.Table;
import org.openmetadata.schema.type.ColumnLineage;
import org.openmetadata.schema.type.Edge;
import org.openmetadata.schema.type.EntityLineage;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.LineageDetails;
import org.openmetadata.schema.type.Relationship;
import org.openmetadata.service.Entity;
import org.openmetadata.service.jdbi3.CollectionDAO.EntityRelationshipRecord;
import org.openmetadata.service.util.FullyQualifiedName;
import org.openmetadata.service.util.JsonUtils;

@Repository
public class LineageRepository {
  private final CollectionDAO dao;

  public LineageRepository() {
    this.dao = Entity.getCollectionDAO();
    Entity.setLineageRepository(this);
  }

  public EntityLineage get(String entityType, String id, int upstreamDepth, int downstreamDepth) {
    EntityReference ref = Entity.getEntityReferenceById(entityType, UUID.fromString(id), Include.NON_DELETED);
    return getLineage(ref, upstreamDepth, downstreamDepth);
  }

  public EntityLineage getByName(String entityType, String fqn, int upstreamDepth, int downstreamDepth) {
    EntityReference ref = Entity.getEntityReferenceByName(entityType, fqn, Include.NON_DELETED);
    return getLineage(ref, upstreamDepth, downstreamDepth);
  }

  public void addLineage(AddLineage addLineage) {
    // Validate from entity
    EntityReference from = addLineage.getEdge().getFromEntity();
    from = Entity.getEntityReferenceById(from.getType(), from.getId(), Include.NON_DELETED);

    // Validate to entity
    EntityReference to = addLineage.getEdge().getToEntity();
    to = Entity.getEntityReferenceById(to.getType(), to.getId(), Include.NON_DELETED);

    if (addLineage.getEdge().getLineageDetails() != null
        && addLineage.getEdge().getLineageDetails().getPipeline() != null) {

      // Validate pipeline entity
      EntityReference pipeline = addLineage.getEdge().getLineageDetails().getPipeline();
      pipeline = Entity.getEntityReferenceById(pipeline.getType(), pipeline.getId(), Include.NON_DELETED);

      // Add pipeline entity details to lineage details
      addLineage.getEdge().getLineageDetails().withPipeline(pipeline);
    }

    // Validate lineage details
    String detailsJson = validateLineageDetails(from, to, addLineage.getEdge().getLineageDetails());

    // Finally, add lineage relationship
    dao.relationshipDAO()
        .insert(from.getId(), to.getId(), from.getType(), to.getType(), Relationship.UPSTREAM.ordinal(), detailsJson);
  }

  private String validateLineageDetails(EntityReference from, EntityReference to, LineageDetails details) {
    if (details == null) {
      return null;
    }

    List<ColumnLineage> columnsLineage = details.getColumnsLineage();
    if (columnsLineage != null && !columnsLineage.isEmpty()) {
      if (areValidEntities(from, to)) {
        throw new IllegalArgumentException(
            "Column level lineage is only allowed between two tables or from table to dashboard.");
      }
      Table fromTable = dao.tableDAO().findEntityById(from.getId());
      ColumnsEntityInterface toTable = getToEntity(to);
      for (ColumnLineage columnLineage : columnsLineage) {
        for (String fromColumn : columnLineage.getFromColumns()) {
          // From column belongs to the fromNode
          if (fromColumn.startsWith(fromTable.getFullyQualifiedName())) {
            ColumnUtil.validateColumnFQN(fromTable.getColumns(), fromColumn);
          } else {
            Table otherTable = dao.tableDAO().findEntityByName(FullyQualifiedName.getTableFQN(fromColumn));
            ColumnUtil.validateColumnFQN(otherTable.getColumns(), fromColumn);
          }
        }
        ColumnUtil.validateColumnFQN(toTable.getColumns(), columnLineage.getToColumn());
      }
    }
    return JsonUtils.pojoToJson(details);
  }

  private ColumnsEntityInterface getToEntity(EntityReference from) {
    return from.getType().equals(Entity.TABLE)
        ? dao.tableDAO().findEntityById(from.getId())
        : dao.dashboardDataModelDAO().findEntityById(from.getId());
  }

  private boolean areValidEntities(EntityReference from, EntityReference to) {
    return !from.getType().equals(Entity.TABLE)
        || !(to.getType().equals(Entity.TABLE) || to.getType().equals(Entity.DASHBOARD_DATA_MODEL));
  }

  public boolean deleteLineage(String fromEntity, String fromId, String toEntity, String toId) {
    // Validate from entity
    EntityReference from = Entity.getEntityReferenceById(fromEntity, UUID.fromString(fromId), Include.NON_DELETED);

    // Validate to entity
    EntityReference to = Entity.getEntityReferenceById(toEntity, UUID.fromString(toId), Include.NON_DELETED);

    // Finally, delete lineage relationship
    return dao.relationshipDAO()
            .delete(from.getId(), from.getType(), to.getId(), to.getType(), Relationship.UPSTREAM.ordinal())
        > 0;
  }

  private EntityLineage getLineage(EntityReference primary, int upstreamDepth, int downstreamDepth) {
    List<EntityReference> entities = new ArrayList<>();
    EntityLineage lineage =
        new EntityLineage()
            .withEntity(primary)
            .withNodes(entities)
            .withUpstreamEdges(new ArrayList<>())
            .withDownstreamEdges(new ArrayList<>());
    getUpstreamLineage(primary.getId(), primary.getType(), lineage, upstreamDepth);
    getDownstreamLineage(primary.getId(), primary.getType(), lineage, downstreamDepth);

    // Remove duplicate nodes
    lineage.withNodes(lineage.getNodes().stream().distinct().collect(Collectors.toList()));
    return lineage;
  }

  private void getUpstreamLineage(UUID id, String entityType, EntityLineage lineage, int upstreamDepth) {
    if (upstreamDepth == 0) {
      return;
    }
    List<EntityRelationshipRecord> records;
    // pipeline information is not maintained
    if (entityType.equals(Entity.PIPELINE) || entityType.equals(Entity.STORED_PROCEDURE)) {
      records = dao.relationshipDAO().findFromPipeline(id, Relationship.UPSTREAM.ordinal());
    } else {
      records = dao.relationshipDAO().findFrom(id, entityType, Relationship.UPSTREAM.ordinal());
    }
    final List<EntityReference> upstreamEntityReferences = new ArrayList<>();
    for (EntityRelationshipRecord entityRelationshipRecord : records) {
      EntityReference ref =
          Entity.getEntityReferenceById(
              entityRelationshipRecord.getType(), entityRelationshipRecord.getId(), Include.ALL);
      LineageDetails lineageDetails = JsonUtils.readValue(entityRelationshipRecord.getJson(), LineageDetails.class);
      upstreamEntityReferences.add(ref);
      lineage
          .getUpstreamEdges()
          .add(new Edge().withFromEntity(ref.getId()).withToEntity(id).withLineageDetails(lineageDetails));
    }
    lineage.getNodes().addAll(upstreamEntityReferences);
    // from this id ---> find other ids

    upstreamDepth--;
    // Recursively add upstream nodes and edges
    for (EntityReference entity : upstreamEntityReferences) {
      getUpstreamLineage(entity.getId(), entity.getType(), lineage, upstreamDepth);
    }
  }

  private void getDownstreamLineage(UUID id, String entityType, EntityLineage lineage, int downstreamDepth) {
    if (downstreamDepth == 0) {
      return;
    }
    List<EntityRelationshipRecord> records;
    if (entityType.equals(Entity.PIPELINE) || entityType.equals(Entity.STORED_PROCEDURE)) {
      records = dao.relationshipDAO().findToPipeline(id, Relationship.UPSTREAM.ordinal());
    } else {
      records = dao.relationshipDAO().findTo(id, entityType, Relationship.UPSTREAM.ordinal());
    }
    final List<EntityReference> downstreamEntityReferences = new ArrayList<>();
    for (EntityRelationshipRecord entityRelationshipRecord : records) {
      EntityReference ref =
          Entity.getEntityReferenceById(
              entityRelationshipRecord.getType(), entityRelationshipRecord.getId(), Include.ALL);
      LineageDetails lineageDetails = JsonUtils.readValue(entityRelationshipRecord.getJson(), LineageDetails.class);
      downstreamEntityReferences.add(ref);
      lineage
          .getDownstreamEdges()
          .add(new Edge().withToEntity(ref.getId()).withFromEntity(id).withLineageDetails(lineageDetails));
    }
    lineage.getNodes().addAll(downstreamEntityReferences);

    downstreamDepth--;
    // Recursively add upstream nodes and edges
    for (EntityReference entity : downstreamEntityReferences) {
      getDownstreamLineage(entity.getId(), entity.getType(), lineage, downstreamDepth);
    }
  }
}
