/*
 *  Copyright 2022 Collate.
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

import { Drawer, Typography } from 'antd';
import { get } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ERROR_PLACEHOLDER_TYPE, SIZE } from '../../../enums/common.enum';
import { EntityType } from '../../../enums/entity.enum';
import { Tag } from '../../../generated/entity/classification/tag';
import { Container } from '../../../generated/entity/data/container';
import { Dashboard } from '../../../generated/entity/data/dashboard';
import { DashboardDataModel } from '../../../generated/entity/data/dashboardDataModel';
import { GlossaryTerm } from '../../../generated/entity/data/glossaryTerm';
import { Mlmodel } from '../../../generated/entity/data/mlmodel';
import { Pipeline } from '../../../generated/entity/data/pipeline';
import { SearchIndex } from '../../../generated/entity/data/searchIndex';
import { StoredProcedure } from '../../../generated/entity/data/storedProcedure';
import { Table } from '../../../generated/entity/data/table';
import { Topic } from '../../../generated/entity/data/topic';
import { DataProduct } from '../../../generated/entity/domains/dataProduct';
import {
  getEntityLinkFromType,
  getEntityName,
} from '../../../utils/EntityUtils';
import { DEFAULT_ENTITY_PERMISSION } from '../../../utils/PermissionsUtils';
import { getEncodedFqn, stringToHTML } from '../../../utils/StringsUtils';
import ErrorPlaceHolder from '../../common/error-with-placeholder/ErrorPlaceHolder';
import Loader from '../../Loader/Loader';
import { usePermissionProvider } from '../../PermissionProvider/PermissionProvider';
import {
  OperationPermission,
  ResourceEntity,
} from '../../PermissionProvider/PermissionProvider.interface';
import ContainerSummary from './ContainerSummary/ContainerSummary.component';
import DashboardSummary from './DashboardSummary/DashboardSummary.component';
import DataModelSummary from './DataModelSummary/DataModelSummary.component';
import DataProductSummary from './DataProductSummary/DataProductSummary.component';
import { EntitySummaryPanelProps } from './EntitySummaryPanel.interface';
import './EntitySummaryPanel.style.less';
import GlossaryTermSummary from './GlossaryTermSummary/GlossaryTermSummary.component';
import MlModelSummary from './MlModelSummary/MlModelSummary.component';
import PipelineSummary from './PipelineSummary/PipelineSummary.component';
import SearchIndexSummary from './SearchIndexSummary/SearchIndexSummary.component';
import StoredProcedureSummary from './StoredProcedureSummary/StoredProcedureSummary.component';
import TableSummary from './TableSummary/TableSummary.component';
import TagsSummary from './TagsSummary/TagsSummary.component';
import TopicSummary from './TopicSummary/TopicSummary.component';

export default function EntitySummaryPanel({
  entityDetails,
}: EntitySummaryPanelProps) {
  const { tab } = useParams<{ tab: string }>();
  const { getEntityPermission } = usePermissionProvider();
  const [isPermissionLoading, setIsPermissionLoading] =
    useState<boolean>(false);
  const [entityPermissions, setEntityPermissions] =
    useState<OperationPermission>(DEFAULT_ENTITY_PERMISSION);

  const id = useMemo(() => {
    setIsPermissionLoading(true);

    return entityDetails?.details?.id ?? '';
  }, [entityDetails?.details?.id]);

  const fetchResourcePermission = async (entityFqn: string) => {
    try {
      setIsPermissionLoading(true);
      const type =
        get(entityDetails, 'details.entityType') ?? ResourceEntity.TABLE;
      const permissions = await getEntityPermission(type, entityFqn);
      setEntityPermissions(permissions);
    } catch (error) {
      // Error
    } finally {
      setIsPermissionLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchResourcePermission(id);
    }
  }, [id]);

  const viewPermission = useMemo(
    () => entityPermissions.ViewBasic || entityPermissions.ViewAll,
    [entityPermissions]
  );

  const summaryComponent = useMemo(() => {
    if (isPermissionLoading) {
      return <Loader />;
    }
    if (!viewPermission) {
      return (
        <ErrorPlaceHolder
          size={SIZE.MEDIUM}
          type={ERROR_PLACEHOLDER_TYPE.PERMISSION}
        />
      );
    }
    const type = get(entityDetails, 'details.entityType') ?? EntityType.TABLE;
    const entity = entityDetails.details;
    switch (type) {
      case EntityType.TABLE:
        return <TableSummary entityDetails={entity as Table} />;

      case EntityType.TOPIC:
        return <TopicSummary entityDetails={entity as Topic} />;

      case EntityType.DASHBOARD:
        return <DashboardSummary entityDetails={entity as Dashboard} />;

      case EntityType.PIPELINE:
        return <PipelineSummary entityDetails={entity as Pipeline} />;

      case EntityType.MLMODEL:
        return <MlModelSummary entityDetails={entity as Mlmodel} />;

      case EntityType.CONTAINER:
        return <ContainerSummary entityDetails={entity as Container} />;

      case EntityType.STORED_PROCEDURE:
        return (
          <StoredProcedureSummary entityDetails={entity as StoredProcedure} />
        );

      case EntityType.DASHBOARD_DATA_MODEL:
        return (
          <DataModelSummary entityDetails={entity as DashboardDataModel} />
        );

      case EntityType.GLOSSARY_TERM:
        return <GlossaryTermSummary entityDetails={entity as GlossaryTerm} />;

      case EntityType.TAG:
        return <TagsSummary entityDetails={entity as Tag} />;

      case EntityType.DATA_PRODUCT:
        return <DataProductSummary entityDetails={entity as DataProduct} />;

      case EntityType.SEARCH_INDEX:
        return <SearchIndexSummary entityDetails={entity as SearchIndex} />;

      default:
        return null;
    }
  }, [tab, entityDetails, viewPermission, isPermissionLoading]);

  const entityLink = useMemo(
    () =>
      (entityDetails.details.fullyQualifiedName &&
        entityDetails.details.entityType &&
        getEntityLinkFromType(
          entityDetails.details.fullyQualifiedName,
          entityDetails.details.entityType as EntityType
        )) ??
      '',
    [entityDetails, getEntityLinkFromType, getEncodedFqn]
  );

  return (
    <Drawer
      destroyOnClose
      open
      className="summary-panel-container"
      closable={false}
      getContainer={false}
      headerStyle={{ padding: 16 }}
      mask={false}
      title={
        viewPermission && (
          <Link
            className="no-underline"
            data-testid="entity-link"
            to={entityLink}>
            <Typography.Text className="m-b-0 d-block summary-panel-title">
              {stringToHTML(getEntityName(entityDetails.details))}
            </Typography.Text>
          </Link>
        )
      }
      width="100%">
      {summaryComponent}
    </Drawer>
  );
}
