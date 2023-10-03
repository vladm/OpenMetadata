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

import { Popover } from 'antd';
import i18next from 'i18next';
import {
  get,
  isEmpty,
  isNil,
  isObject,
  isUndefined,
  lowerCase,
  startCase,
} from 'lodash';
import { Bucket, EntityDetailUnion } from 'Models';
import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import ProfilePicture from '../components/common/ProfilePicture/ProfilePicture';
import QueryCount from '../components/common/QueryCount/QueryCount.component';
import { DataAssetsWithoutServiceField } from '../components/DataAssets/DataAssetsHeader/DataAssetsHeader.interface';
import {
  LeafNodes,
  LineagePos,
} from '../components/Entity/EntityLineage/EntityLineage.interface';
import {
  EntityUnion,
  EntityWithServices,
} from '../components/Explore/explore.interface';
import { ResourceEntity } from '../components/PermissionProvider/PermissionProvider.interface';
import {
  SearchedDataProps,
  SourceType,
} from '../components/searched-data/SearchedData.interface';
import { QueryVoteType } from '../components/TableQueries/TableQueries.interface';
import { FQN_SEPARATOR_CHAR } from '../constants/char.constants';
import {
  getContainerDetailPath,
  getDashboardDetailsPath,
  getDatabaseDetailsPath,
  getDatabaseSchemaDetailsPath,
  getDataModelDetailsPath,
  getGlossaryTermDetailsPath,
  getMlModelDetailsPath,
  getPipelineDetailsPath,
  getServiceDetailsPath,
  getStoredProcedureDetailPath,
  getTableDetailsPath,
  getTagsDetailsPath,
  getTopicDetailsPath,
  NO_DATA,
} from '../constants/constants';
import { EntityField } from '../constants/Feeds.constants';
import { GlobalSettingsMenuCategory } from '../constants/GlobalSettings.constants';
import { AssetsType, EntityType, FqnPart } from '../enums/entity.enum';
import { ExplorePageTabs } from '../enums/Explore.enum';
import { SearchIndex } from '../enums/search.enum';
import { ServiceCategory, ServiceCategoryPlural } from '../enums/service.enum';
import { PrimaryTableDataTypes } from '../enums/table.enum';
import { Tag } from '../generated/entity/classification/tag';
import { Container } from '../generated/entity/data/container';
import { Dashboard } from '../generated/entity/data/dashboard';
import { DashboardDataModel } from '../generated/entity/data/dashboardDataModel';
import { Database } from '../generated/entity/data/database';
import { DatabaseSchema } from '../generated/entity/data/databaseSchema';
import { GlossaryTerm } from '../generated/entity/data/glossaryTerm';
import { Mlmodel } from '../generated/entity/data/mlmodel';
import { Pipeline } from '../generated/entity/data/pipeline';
import {
  SearchIndex as SearchIndexAsset,
  SearchIndex as SearchIndexEntity,
  SearchIndexField,
} from '../generated/entity/data/searchIndex';
import {
  StoredProcedure,
  StoredProcedureCodeObject,
} from '../generated/entity/data/storedProcedure';
import {
  Column,
  ColumnJoins,
  JoinedWith,
  Table,
  TableType,
} from '../generated/entity/data/table';
import { Topic } from '../generated/entity/data/topic';
import { DataProduct } from '../generated/entity/domains/dataProduct';
import { Edge, EntityLineage } from '../generated/type/entityLineage';
import { EntityReference } from '../generated/type/entityUsage';
import { TagLabel } from '../generated/type/tagLabel';
import { Votes } from '../generated/type/votes';
import { EntityFieldThreadCount } from '../interface/feed.interface';
import {
  getOwnerValue,
  getPartialNameFromTableFQN,
  getTableFQNFromColumnFQN,
} from './CommonUtils';
import { BasicEntityOverviewInfo } from './EntityUtils.interface';
import { getEntityFieldThreadCounts } from './FeedUtils';
import Fqn from './Fqn';
import {
  getDataProductsDetailsPath,
  getDomainPath,
  getGlossaryPath,
  getSettingPath,
} from './RouterUtils';
import { getSearchIndexTabPath } from './SearchIndexUtils';
import { getServiceRouteFromServiceType } from './ServiceUtils';
import { getEncodedFqn } from './StringsUtils';
import {
  getDataTypeString,
  getTagsWithoutTier,
  getTierFromTableTags,
  getUsagePercentile,
} from './TableUtils';
import { getTableTags } from './TagsUtils';

export enum DRAWER_NAVIGATION_OPTIONS {
  explore = 'Explore',
  lineage = 'Lineage',
}

/**
 * Take entity reference as input and return name for entity
 * @param entity - entity reference
 * @returns - entity name
 */
export const getEntityName = (entity?: {
  name?: string;
  displayName?: string;
}) => {
  return entity?.displayName || entity?.name || '';
};

export const getEntityId = (entity?: { id?: string }) => entity?.id ?? '';

export const getEntityTags = (
  type: string,
  entityDetail: EntityDetailUnion
): Array<TagLabel> => {
  switch (type) {
    case EntityType.TABLE: {
      const tableTags: Array<TagLabel> = [
        ...getTableTags((entityDetail as Table).columns || []),
        ...(entityDetail.tags || []),
      ];

      return tableTags;
    }
    case EntityType.DASHBOARD:
    case EntityType.SEARCH_INDEX:
    case EntityType.PIPELINE:
      return getTagsWithoutTier(entityDetail.tags || []);

    case EntityType.TOPIC:
    case EntityType.MLMODEL:
    case EntityType.STORED_PROCEDURE:
    case EntityType.DASHBOARD_DATA_MODEL: {
      return entityDetail.tags || [];
    }

    default:
      return [];
  }
};

export const getOwnerNameWithProfilePic = (
  owner: EntityReference | undefined
) =>
  owner ? (
    <div className="flex items-center gap-2">
      {' '}
      <ProfilePicture
        displayName={owner.displayName}
        id={owner.id}
        name={owner.name ?? ''}
        width="20"
      />
      <span>{getEntityName(owner)}</span>
    </div>
  ) : null;

const getTableFieldsFromTableDetails = (tableDetails: Table) => {
  const {
    fullyQualifiedName,
    owner,
    tags,
    usageSummary,
    profile,
    columns,
    tableType,
  } = tableDetails;
  const [service, database, schema] = getPartialNameFromTableFQN(
    fullyQualifiedName ?? '',
    [FqnPart.Service, FqnPart.Database, FqnPart.Schema],
    FQN_SEPARATOR_CHAR
  ).split(FQN_SEPARATOR_CHAR);

  const tier = getTierFromTableTags(tags ?? []);

  const usage = !isNil(usageSummary?.weeklyStats?.percentileRank)
    ? getUsagePercentile(usageSummary?.weeklyStats?.percentileRank ?? 0)
    : NO_DATA;

  return {
    fullyQualifiedName,
    owner,
    service,
    database,
    schema,
    tier,
    usage,
    profile,
    columns,
    tableType,
  };
};

const getTableOverview = (tableDetails: Table) => {
  const {
    fullyQualifiedName,
    owner,
    profile,
    columns,
    tableType,
    service,
    database,
    schema,
    tier,
    usage,
  } = getTableFieldsFromTableDetails(tableDetails);

  const overview = [
    {
      name: i18next.t('label.owner'),
      value:
        getOwnerNameWithProfilePic(owner) ??
        i18next.t('label.no-entity', {
          entity: i18next.t('label.owner'),
        }),
      url: getOwnerValue(owner as EntityReference),
      isLink: !isEmpty(owner?.name),
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: i18next.t('label.type'),
      value: tableType ?? TableType.Regular,
      isLink: false,
      visible: [
        DRAWER_NAVIGATION_OPTIONS.lineage,
        DRAWER_NAVIGATION_OPTIONS.explore,
      ],
    },
    {
      name: i18next.t('label.service'),
      value: service || NO_DATA,
      url: getServiceDetailsPath(service, ServiceCategory.DATABASE_SERVICES),
      isLink: true,
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: i18next.t('label.database'),
      value: database || NO_DATA,
      url: getDatabaseDetailsPath(
        getPartialNameFromTableFQN(
          fullyQualifiedName ?? '',
          [FqnPart.Service, FqnPart.Database],
          FQN_SEPARATOR_CHAR
        )
      ),
      isLink: true,
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: i18next.t('label.schema'),
      value: schema || NO_DATA,
      url: getDatabaseSchemaDetailsPath(
        getPartialNameFromTableFQN(
          fullyQualifiedName ?? '',
          [FqnPart.Service, FqnPart.Database, FqnPart.Schema],
          FQN_SEPARATOR_CHAR
        )
      ),
      isLink: true,
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: i18next.t('label.tier'),
      value: tier ? tier.split(FQN_SEPARATOR_CHAR)[1] : NO_DATA,
      isLink: false,
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: i18next.t('label.usage'),
      value: usage || NO_DATA,
      isLink: false,
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: i18next.t('label.query-plural'),
      value: <QueryCount tableId={tableDetails.id || ''} />,
      isLink: false,
      visible: [
        DRAWER_NAVIGATION_OPTIONS.lineage,
        DRAWER_NAVIGATION_OPTIONS.explore,
      ],
    },
    {
      name: i18next.t('label.column-plural'),
      value: columns ? columns.length : NO_DATA,
      isLink: false,
      visible: [
        DRAWER_NAVIGATION_OPTIONS.lineage,
        DRAWER_NAVIGATION_OPTIONS.explore,
      ],
    },
    {
      name: i18next.t('label.row-plural'),
      value:
        !isUndefined(profile) && profile?.rowCount ? profile.rowCount : NO_DATA,
      isLink: false,
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
  ];

  return overview;
};

const getPipelineOverview = (pipelineDetails: Pipeline) => {
  const { owner, tags, sourceUrl, service, displayName } = pipelineDetails;
  const tier = getTierFromTableTags(tags ?? []);

  const overview = [
    {
      name: i18next.t('label.owner'),
      value:
        getOwnerNameWithProfilePic(owner) ??
        i18next.t('label.no-entity', {
          entity: i18next.t('label.owner'),
        }),
      url: getOwnerValue(owner as EntityReference),
      isLink: !isEmpty(owner?.name),
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: `${i18next.t('label.pipeline')} ${i18next.t(
        'label.url-uppercase'
      )}`,
      dataTestId: 'pipeline-url-label',
      value: displayName ?? NO_DATA,
      url: sourceUrl,
      isLink: true,
      isExternal: true,
      visible: [
        DRAWER_NAVIGATION_OPTIONS.lineage,
        DRAWER_NAVIGATION_OPTIONS.explore,
      ],
    },
    {
      name: i18next.t('label.service'),
      value: (service?.name as string) || NO_DATA,
      url: getServiceDetailsPath(
        service?.name as string,
        ServiceCategory.PIPELINE_SERVICES
      ),
      isLink: true,
      isExternal: false,
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: i18next.t('label.tier'),
      value: tier ? tier.split(FQN_SEPARATOR_CHAR)[1] : NO_DATA,
      isLink: false,
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
  ];

  return overview;
};

const getDashboardOverview = (dashboardDetails: Dashboard) => {
  const { owner, tags, sourceUrl, service, displayName } = dashboardDetails;
  const tier = getTierFromTableTags(tags ?? []);

  const overview = [
    {
      name: i18next.t('label.owner'),
      value:
        getOwnerNameWithProfilePic(owner) ??
        i18next.t('label.no-entity', {
          entity: i18next.t('label.owner'),
        }),
      url: getOwnerValue(owner as EntityReference),
      isLink: !isEmpty(owner?.name),
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: `${i18next.t('label.dashboard')} ${i18next.t(
        'label.url-uppercase'
      )}`,
      value: displayName ?? NO_DATA,
      url: sourceUrl,
      isLink: true,
      isExternal: true,
      visible: [
        DRAWER_NAVIGATION_OPTIONS.lineage,
        DRAWER_NAVIGATION_OPTIONS.explore,
      ],
    },
    {
      name: i18next.t('label.service'),
      value: (service?.fullyQualifiedName as string) || NO_DATA,
      url: getServiceDetailsPath(
        service?.name as string,
        ServiceCategory.DASHBOARD_SERVICES
      ),
      isExternal: false,
      isLink: true,
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },

    {
      name: i18next.t('label.tier'),
      value: tier ? tier.split(FQN_SEPARATOR_CHAR)[1] : NO_DATA,
      isLink: false,
      isExternal: false,
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
  ];

  return overview;
};

export const getSearchIndexOverview = (
  searchIndexDetails: SearchIndexEntity
) => {
  const { owner, tags, service } = searchIndexDetails;
  const tier = getTierFromTableTags(tags ?? []);

  const overview = [
    {
      name: i18next.t('label.owner'),
      value:
        getOwnerNameWithProfilePic(owner) ??
        i18next.t('label.no-entity', {
          entity: i18next.t('label.owner'),
        }),
      url: getOwnerValue(owner as EntityReference),
      isLink: !isEmpty(owner?.name),
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: i18next.t('label.tier'),
      value: tier ? tier.split(FQN_SEPARATOR_CHAR)[1] : NO_DATA,
      isLink: false,
      isExternal: false,
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: i18next.t('label.service'),
      value: (service?.fullyQualifiedName as string) || NO_DATA,
      url: getServiceDetailsPath(
        service?.name as string,
        ServiceCategory.SEARCH_SERVICES
      ),
      isExternal: false,
      isLink: true,
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
  ];

  return overview;
};

const getMlModelOverview = (mlModelDetails: Mlmodel) => {
  const { algorithm, target, server, dashboard, owner } = mlModelDetails;

  const overview = [
    {
      name: i18next.t('label.owner'),
      value:
        getOwnerNameWithProfilePic(owner) ??
        i18next.t('label.no-entity', {
          entity: i18next.t('label.owner'),
        }),
      url: getOwnerValue(owner as EntityReference),
      isLink: !isEmpty(owner?.name),
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: i18next.t('label.algorithm'),
      value: algorithm || NO_DATA,
      url: '',
      isLink: false,
      visible: [
        DRAWER_NAVIGATION_OPTIONS.lineage,
        DRAWER_NAVIGATION_OPTIONS.explore,
      ],
    },
    {
      name: i18next.t('label.target'),
      value: target ?? NO_DATA,
      url: '',
      isLink: false,
      visible: [
        DRAWER_NAVIGATION_OPTIONS.lineage,
        DRAWER_NAVIGATION_OPTIONS.explore,
      ],
    },
    {
      name: i18next.t('label.server'),
      value: server ?? NO_DATA,
      url: server,
      isLink: Boolean(server),
      isExternal: true,
      visible: [
        DRAWER_NAVIGATION_OPTIONS.lineage,
        DRAWER_NAVIGATION_OPTIONS.explore,
      ],
    },
    {
      name: i18next.t('label.dashboard'),
      value: getEntityName(dashboard) || NO_DATA,
      url: getDashboardDetailsPath(dashboard?.fullyQualifiedName as string),
      isLink: true,
      isExternal: false,
      visible: [
        DRAWER_NAVIGATION_OPTIONS.lineage,
        DRAWER_NAVIGATION_OPTIONS.explore,
      ],
    },
  ];

  return overview;
};

const getContainerOverview = (containerDetails: Container) => {
  const { numberOfObjects, serviceType, dataModel } = containerDetails;

  const visible = [
    DRAWER_NAVIGATION_OPTIONS.lineage,
    DRAWER_NAVIGATION_OPTIONS.explore,
  ];

  const overview = [
    {
      name: i18next.t('label.object-plural'),
      value: numberOfObjects,
      isLink: false,
      visible,
    },
    {
      name: i18next.t('label.service-type'),
      value: serviceType,
      isLink: false,
      visible,
    },
    {
      name: i18next.t('label.column-plural'),
      value:
        !isUndefined(dataModel) && dataModel.columns
          ? dataModel.columns.length
          : NO_DATA,
      isLink: false,
      visible,
    },
  ];

  return overview;
};

const getDataModelOverview = (dataModelDetails: DashboardDataModel) => {
  const {
    owner,
    tags,
    service,
    displayName,
    dataModelType,
    fullyQualifiedName,
  } = dataModelDetails;
  const tier = getTierFromTableTags(tags ?? []);

  const overview = [
    {
      name: i18next.t('label.owner'),
      value:
        getOwnerNameWithProfilePic(owner) ??
        i18next.t('label.no-entity', {
          entity: i18next.t('label.owner'),
        }),
      url: getOwnerValue(owner as EntityReference),
      isLink: !isEmpty(owner?.name),
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: `${i18next.t('label.data-model')} ${i18next.t(
        'label.url-uppercase'
      )}`,
      value: displayName || NO_DATA,
      url: getDataModelDetailsPath(fullyQualifiedName ?? ''),
      isLink: true,
      visible: [
        DRAWER_NAVIGATION_OPTIONS.lineage,
        DRAWER_NAVIGATION_OPTIONS.explore,
      ],
    },
    {
      name: i18next.t('label.service'),
      value: (service?.fullyQualifiedName as string) || NO_DATA,
      url: getServiceDetailsPath(
        service?.name as string,
        ServiceCategory.DASHBOARD_SERVICES
      ),
      isExternal: false,
      isLink: true,
      visible: [
        DRAWER_NAVIGATION_OPTIONS.lineage,
        DRAWER_NAVIGATION_OPTIONS.explore,
      ],
    },

    {
      name: i18next.t('label.tier'),
      value: tier ? tier.split(FQN_SEPARATOR_CHAR)[1] : NO_DATA,
      isLink: false,
      isExternal: false,
      visible: [
        DRAWER_NAVIGATION_OPTIONS.lineage,
        DRAWER_NAVIGATION_OPTIONS.explore,
      ],
    },
    {
      name: i18next.t('label.data-model-type'),
      value: dataModelType,
      isLink: false,
      isExternal: false,
      visible: [
        DRAWER_NAVIGATION_OPTIONS.lineage,
        DRAWER_NAVIGATION_OPTIONS.explore,
      ],
    },
  ];

  return overview;
};

const getStoredProcedureOverview = (
  storedProcedureDetails: StoredProcedure
) => {
  const { fullyQualifiedName, owner, tags, storedProcedureCode } =
    storedProcedureDetails;
  const [service, database, schema] = getPartialNameFromTableFQN(
    fullyQualifiedName ?? '',
    [FqnPart.Service, FqnPart.Database, FqnPart.Schema],
    FQN_SEPARATOR_CHAR
  ).split(FQN_SEPARATOR_CHAR);

  const tier = getTierFromTableTags(tags ?? []);

  const overview = [
    {
      name: i18next.t('label.owner'),
      value:
        getOwnerNameWithProfilePic(owner) ??
        i18next.t('label.no-entity', {
          entity: i18next.t('label.owner'),
        }),
      url: getOwnerValue(owner as EntityReference),
      isLink: !isEmpty(owner?.name),
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: i18next.t('label.service'),
      value: service || NO_DATA,
      url: getServiceDetailsPath(service, ServiceCategory.DATABASE_SERVICES),
      isLink: true,
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: i18next.t('label.database'),
      value: database || NO_DATA,
      url: getDatabaseDetailsPath(
        getPartialNameFromTableFQN(
          fullyQualifiedName ?? '',
          [FqnPart.Service, FqnPart.Database],
          FQN_SEPARATOR_CHAR
        )
      ),
      isLink: true,
      visible: [DRAWER_NAVIGATION_OPTIONS.lineage],
    },
    {
      name: i18next.t('label.schema'),
      value: schema || NO_DATA,
      url: getDatabaseSchemaDetailsPath(
        getPartialNameFromTableFQN(
          fullyQualifiedName ?? '',
          [FqnPart.Service, FqnPart.Database, FqnPart.Schema],
          FQN_SEPARATOR_CHAR
        )
      ),
      isLink: true,
      visible: [
        DRAWER_NAVIGATION_OPTIONS.lineage,
        DRAWER_NAVIGATION_OPTIONS.explore,
      ],
    },
    {
      name: i18next.t('label.tier'),
      value: tier ? tier.split(FQN_SEPARATOR_CHAR)[1] : NO_DATA,
      isLink: false,
      visible: [
        DRAWER_NAVIGATION_OPTIONS.lineage,
        DRAWER_NAVIGATION_OPTIONS.explore,
      ],
    },
    ...(isObject(storedProcedureCode)
      ? [
          {
            name: i18next.t('label.language'),
            value:
              (storedProcedureCode as StoredProcedureCodeObject).language ??
              NO_DATA,
            isLink: false,
            visible: [
              DRAWER_NAVIGATION_OPTIONS.lineage,
              DRAWER_NAVIGATION_OPTIONS.explore,
            ],
          },
        ]
      : []),
  ];

  return overview;
};

export const getEntityOverview = (
  type: string,
  entityDetail: EntityUnion
): Array<BasicEntityOverviewInfo> => {
  switch (type) {
    case ExplorePageTabs.TABLES: {
      return getTableOverview(entityDetail as Table);
    }

    case ExplorePageTabs.PIPELINES: {
      return getPipelineOverview(entityDetail as Pipeline);
    }

    case ExplorePageTabs.DASHBOARDS: {
      return getDashboardOverview(entityDetail as Dashboard);
    }

    case ExplorePageTabs.SEARCH_INDEX: {
      return getSearchIndexOverview(entityDetail as SearchIndexEntity);
    }

    case ExplorePageTabs.MLMODELS: {
      return getMlModelOverview(entityDetail as Mlmodel);
    }
    case ExplorePageTabs.CONTAINERS: {
      return getContainerOverview(entityDetail as Container);
    }

    case ExplorePageTabs.DASHBOARD_DATA_MODEL: {
      return getDataModelOverview(entityDetail as DashboardDataModel);
    }

    case ExplorePageTabs.STORED_PROCEDURE: {
      return getStoredProcedureOverview(entityDetail as StoredProcedure);
    }

    default:
      return [];
  }
};

// Note: This method is enhanced from "getEntityCountByService" of ServiceUtils.ts
export const getEntityCountByType = (buckets: Array<Bucket>) => {
  const entityCounts = {
    tableCount: 0,
    topicCount: 0,
    dashboardCount: 0,
    pipelineCount: 0,
  };
  buckets?.forEach((bucket) => {
    switch (bucket.key) {
      case EntityType.TABLE:
        entityCounts.tableCount += bucket.doc_count;

        break;
      case EntityType.TOPIC:
        entityCounts.topicCount += bucket.doc_count;

        break;
      case EntityType.DASHBOARD:
        entityCounts.dashboardCount += bucket.doc_count;

        break;
      case EntityType.PIPELINE:
        entityCounts.pipelineCount += bucket.doc_count;

        break;
      default:
        break;
    }
  });

  return entityCounts;
};

export const getTotalEntityCountByType = (buckets: Array<Bucket> = []) => {
  let entityCounts = 0;
  buckets.forEach((bucket) => {
    entityCounts += bucket.doc_count;
  });

  return entityCounts;
};

export const getEntityLineage = (
  oldVal: EntityLineage,
  newVal: EntityLineage,
  pos: LineagePos
) => {
  if (pos === 'to') {
    const downEdges = newVal.downstreamEdges;
    const newNodes = newVal.nodes?.filter((n) =>
      downEdges?.find((e) => e.toEntity === n.id)
    );

    return {
      ...oldVal,
      downstreamEdges: [
        ...(oldVal.downstreamEdges as Edge[]),
        ...(downEdges as Edge[]),
      ],
      nodes: [
        ...(oldVal.nodes as EntityReference[]),
        ...(newNodes as EntityReference[]),
      ],
    };
  } else {
    const upEdges = newVal.upstreamEdges;
    const newNodes = newVal.nodes?.filter((n) =>
      upEdges?.find((e) => e.fromEntity === n.id)
    );

    return {
      ...oldVal,
      upstreamEdges: [
        ...(oldVal.upstreamEdges as Edge[]),
        ...(upEdges as Edge[]),
      ],
      nodes: [
        ...(oldVal.nodes as EntityReference[]),
        ...(newNodes as EntityReference[]),
      ],
    };
  }
};

export const isLeafNode = (
  leafNodes: LeafNodes,
  id: string,
  pos: LineagePos
) => {
  if (!isEmpty(leafNodes)) {
    return pos === 'from'
      ? leafNodes.upStreamNode?.includes(id)
      : leafNodes.downStreamNode?.includes(id);
  } else {
    return false;
  }
};

export const ENTITY_LINK_SEPARATOR = '::';

export const getEntityFeedLink = (
  type?: string,
  fqn?: string,
  field?: string
): string => {
  if (isUndefined(type) || isUndefined(fqn)) {
    return '';
  }
  // url decode the fqn
  fqn = decodeURIComponent(fqn);

  return `<#E${ENTITY_LINK_SEPARATOR}${type}${ENTITY_LINK_SEPARATOR}${fqn}${
    field ? `${ENTITY_LINK_SEPARATOR}${field}` : ''
  }>`;
};

export const isSupportedTest = (dataType: string) => {
  return dataType === 'ARRAY' || dataType === 'STRUCT';
};

export const isColumnTestSupported = (dataType: string) => {
  const supportedType = Object.values(PrimaryTableDataTypes);

  return supportedType.includes(
    getDataTypeString(dataType) as PrimaryTableDataTypes
  );
};

export const getTitleCase = (text?: string) => {
  return text ? startCase(text) : '';
};

export const filterEntityAssets = (data: EntityReference[]) => {
  const includedEntity = Object.values(AssetsType);

  return data.filter((d) => includedEntity.includes(d.type as AssetsType));
};

export const getResourceEntityFromEntityType = (entityType: string) => {
  switch (entityType) {
    case EntityType.TABLE:
    case SearchIndex.TABLE:
      return ResourceEntity.TABLE;

    case EntityType.TOPIC:
    case SearchIndex.TOPIC:
      return ResourceEntity.TOPIC;

    case EntityType.DASHBOARD:
    case SearchIndex.DASHBOARD:
      return ResourceEntity.DASHBOARD;

    case EntityType.PIPELINE:
    case SearchIndex.PIPELINE:
      return ResourceEntity.PIPELINE;

    case EntityType.MLMODEL:
    case SearchIndex.MLMODEL:
      return ResourceEntity.ML_MODEL;
  }

  return ResourceEntity.ALL;
};

/**
 * It searches for a given text in a given table and returns a new table with only the columns that
 * contain the given text
 * @param {Column[]} table - Column[] - the table to search in
 * @param {string} searchText - The text to search for.
 * @returns An array of columns that have been searched for a specific string.
 */
export const searchInColumns = <T extends Column | SearchIndexField>(
  table: T[],
  searchText: string
): T[] => {
  const searchedValue: T[] = table.reduce((searchedCols, column) => {
    const searchLowerCase = lowerCase(searchText);
    const isContainData =
      lowerCase(column.name).includes(searchLowerCase) ||
      lowerCase(column.description).includes(searchLowerCase) ||
      lowerCase(getDataTypeString(column.dataType)).includes(searchLowerCase);

    if (isContainData) {
      return [...searchedCols, column];
    } else if (!isUndefined(column.children)) {
      const searchedChildren = searchInColumns<T>(
        column.children as T[],
        searchText
      );
      if (searchedChildren.length > 0) {
        return [
          ...searchedCols,
          {
            ...column,
            children: searchedChildren,
          },
        ];
      }
    }

    return searchedCols;
  }, [] as T[]);

  return searchedValue;
};

/**
 * It checks if a column has a join
 * @param {string} columnName - The name of the column you want to check if joins are available for.
 * @param joins - Array<ColumnJoins>
 * @returns A boolean value.
 */
export const checkIfJoinsAvailable = (
  columnName: string,
  joins: Array<ColumnJoins>
): boolean => {
  return (
    joins &&
    Boolean(joins.length) &&
    Boolean(joins.find((join) => join.columnName === columnName))
  );
};

/**
 * It takes a column name and a list of joins and returns the list of joinedWith for the column name
 * @param {string} columnName - The name of the column you want to get the frequently joined with
 * columns for.
 * @param joins - Array<ColumnJoins>
 * @returns An array of joinedWith objects
 */
export const getFrequentlyJoinedWithColumns = (
  columnName: string,
  joins: Array<ColumnJoins>
): Array<JoinedWith> => {
  return (
    joins?.find((join) => join.columnName === columnName)?.joinedWith || []
  );
};

export const getFrequentlyJoinedColumns = (
  columnName: string,
  joins: Array<ColumnJoins>,
  columnLabel: string
) => {
  const frequentlyJoinedWithColumns = getFrequentlyJoinedWithColumns(
    columnName,
    joins
  );

  return checkIfJoinsAvailable(columnName, joins) ? (
    <div className="m-t-sm" data-testid="frequently-joined-columns">
      <span className="text-grey-muted m-r-xss">{columnLabel}:</span>
      <span>
        {frequentlyJoinedWithColumns.slice(0, 3).map((columnJoin, index) => (
          <Fragment key={columnJoin.fullyQualifiedName}>
            {index > 0 && <span className="m-r-xss">,</span>}
            <Link
              className="link-text"
              to={getTableDetailsPath(
                getTableFQNFromColumnFQN(columnJoin.fullyQualifiedName),
                getPartialNameFromTableFQN(columnJoin.fullyQualifiedName, [
                  FqnPart.Column,
                ])
              )}>
              {getPartialNameFromTableFQN(
                columnJoin.fullyQualifiedName,
                [FqnPart.Database, FqnPart.Table, FqnPart.Column],
                FQN_SEPARATOR_CHAR
              )}
            </Link>
          </Fragment>
        ))}

        {frequentlyJoinedWithColumns.length > 3 && (
          <Popover
            content={
              <div className="text-left">
                {frequentlyJoinedWithColumns?.slice(3).map((columnJoin) => (
                  <Fragment key={columnJoin.fullyQualifiedName}>
                    <a
                      className="link-text d-block p-y-xss"
                      href={getTableDetailsPath(
                        getTableFQNFromColumnFQN(
                          columnJoin?.fullyQualifiedName
                        ),
                        getPartialNameFromTableFQN(
                          columnJoin?.fullyQualifiedName,
                          [FqnPart.Column]
                        )
                      )}>
                      {getPartialNameFromTableFQN(
                        columnJoin?.fullyQualifiedName,
                        [FqnPart.Database, FqnPart.Table, FqnPart.Column]
                      )}
                    </a>
                  </Fragment>
                ))}
              </div>
            }
            placement="bottom"
            trigger="click">
            <span className="show-more m-l-xss text-underline">...</span>
          </Popover>
        )}
      </span>
    </div>
  ) : null;
};

/**
 * Convert entity to EntityReference
 * @param entities -- T extends EntityReference
 * @param type -- EntityType
 * @returns EntityReference
 */
export const getEntityReferenceFromEntity = <
  T extends Omit<EntityReference, 'type'>
>(
  entity: T,
  type: EntityType
): EntityReference => {
  return {
    id: get(entity, 'id', ''),
    type,
    deleted: get(entity, 'deleted', false),
    description: get(entity, 'description', ''),
    displayName: get(entity, 'displayName', ''),
    fullyQualifiedName: get(entity, 'fullyQualifiedName', ''),
    href: get(entity, 'href', ''),
    name: get(entity, 'name', ''),
  };
};

/**
 * Convert all the entity list to EntityReferenceList
 * @param entities -- T extends EntityReference
 * @param type -- EntityType
 * @returns EntityReference[]
 */
export const getEntityReferenceListFromEntities = <
  T extends Omit<EntityReference, 'type'>
>(
  entities: T[],
  type: EntityType
) => {
  if (isEmpty(entities)) {
    return [] as EntityReference[];
  }

  return entities.map((entity) => getEntityReferenceFromEntity(entity, type));
};

export const getEntityLinkFromType = (
  fullyQualifiedName: string,
  entityType: EntityType
) => {
  switch (entityType) {
    case EntityType.TABLE:
      return getTableDetailsPath(fullyQualifiedName);
    case EntityType.GLOSSARY:
    case EntityType.GLOSSARY_TERM:
      return getGlossaryTermDetailsPath(fullyQualifiedName);
    case EntityType.TAG:
      return getTagsDetailsPath(getEncodedFqn(fullyQualifiedName));
    case EntityType.TOPIC:
      return getTopicDetailsPath(fullyQualifiedName);
    case EntityType.DASHBOARD:
      return getDashboardDetailsPath(fullyQualifiedName);
    case EntityType.PIPELINE:
      return getPipelineDetailsPath(fullyQualifiedName);
    case EntityType.MLMODEL:
      return getMlModelDetailsPath(fullyQualifiedName);
    case EntityType.CONTAINER:
      return getContainerDetailPath(fullyQualifiedName);
    case EntityType.DATABASE:
      return getDatabaseDetailsPath(fullyQualifiedName);
    case EntityType.DATA_PRODUCT:
      return getDataProductsDetailsPath(getEncodedFqn(fullyQualifiedName));
    case EntityType.DASHBOARD_DATA_MODEL:
      return getDataModelDetailsPath(fullyQualifiedName);
    case EntityType.STORED_PROCEDURE:
      return getStoredProcedureDetailPath(fullyQualifiedName);
    case EntityType.SEARCH_INDEX:
      return getSearchIndexTabPath(fullyQualifiedName);
    default:
      return '';
  }
};

export const getBreadcrumbForTable = (
  entity: Table,
  includeCurrent = false
) => {
  const { service, database, databaseSchema } = entity;

  return [
    {
      name: getEntityName(service),
      url: service?.name
        ? getServiceDetailsPath(
            getEncodedFqn(service?.name),
            ServiceCategory.DATABASE_SERVICES
          )
        : '',
    },
    {
      name: getEntityName(database),
      url: getDatabaseDetailsPath(database?.fullyQualifiedName ?? ''),
    },
    {
      name: getEntityName(databaseSchema),
      url: getDatabaseSchemaDetailsPath(
        databaseSchema?.fullyQualifiedName ?? ''
      ),
    },
    ...(includeCurrent
      ? [
          {
            name: entity.name,
            url: getEntityLinkFromType(
              entity.fullyQualifiedName ?? '',
              (entity as SourceType).entityType as EntityType
            ),
          },
        ]
      : []),
  ];
};

export const getBreadcrumbForEntitiesWithServiceOnly = (
  entity: EntityWithServices,
  includeCurrent = false
) => {
  const { service } = entity;

  return [
    {
      name: getEntityName(service),
      url: service?.name
        ? getServiceDetailsPath(
            getEncodedFqn(service?.name),
            ServiceCategoryPlural[
              service?.type as keyof typeof ServiceCategoryPlural
            ]
          )
        : '',
    },
    ...(includeCurrent
      ? [
          {
            name: entity.name,
            url: getEntityLinkFromType(
              entity.fullyQualifiedName ?? '',
              (entity as SourceType).entityType as EntityType
            ),
          },
        ]
      : []),
  ];
};

export const getBreadcrumbForContainer = (data: {
  entity: Container;
  includeCurrent?: boolean;
  parents?: Container[] | EntityReference[];
}) => {
  const { entity, includeCurrent = false, parents = [] } = data;
  const { service } = entity;

  return [
    {
      name: getEntityName(service),
      url: service?.name
        ? getServiceDetailsPath(
            getEncodedFqn(service?.name),
            ServiceCategoryPlural[
              service?.type as keyof typeof ServiceCategoryPlural
            ]
          )
        : '',
    },
    ...(parents.length > 0
      ? parents.map((parent) => ({
          name: getEntityName(parent),
          url: getEntityLinkFromType(
            parent?.fullyQualifiedName ?? '',
            EntityType.CONTAINER
          ),
        }))
      : []),
    ...(includeCurrent
      ? [
          {
            name: entity.name,
            url: getEntityLinkFromType(
              entity.fullyQualifiedName ?? '',
              (entity as SourceType).entityType as EntityType
            ),
          },
        ]
      : []),
  ];
};

export const getEntityBreadcrumbs = (
  entity:
    | SearchedDataProps['data'][number]['_source']
    | DashboardDataModel
    | StoredProcedure
    | Database
    | DatabaseSchema
    | SearchIndexAsset
    | DataAssetsWithoutServiceField,
  entityType?: EntityType,
  includeCurrent = false
) => {
  switch (entityType) {
    case EntityType.TABLE:
    case EntityType.STORED_PROCEDURE:
      return getBreadcrumbForTable(entity as Table, includeCurrent);
    case EntityType.GLOSSARY:
    case EntityType.GLOSSARY_TERM:
      // eslint-disable-next-line no-case-declarations
      const glossary = (entity as GlossaryTerm).glossary;
      if (!glossary) {
        return [];
      }
      // eslint-disable-next-line no-case-declarations
      const fqnList = Fqn.split((entity as GlossaryTerm).fullyQualifiedName);
      // eslint-disable-next-line no-case-declarations
      const tree = fqnList.slice(1, fqnList.length);

      return [
        {
          name: glossary.fullyQualifiedName,
          url: getGlossaryPath(glossary.fullyQualifiedName),
        },
        ...tree.map((fqn, index, source) => ({
          name: fqn,
          url: getGlossaryPath(
            `${glossary.fullyQualifiedName}.${source
              .slice(0, index + 1)
              .join('.')}`
          ),
        })),
      ];
    case EntityType.TAG:
      // eslint-disable-next-line no-case-declarations
      const fqnTagList = Fqn.split((entity as Tag).fullyQualifiedName);

      return [
        ...fqnTagList.map((fqn) => ({
          name: fqn,
          url: getTagsDetailsPath(entity?.fullyQualifiedName ?? ''),
        })),
      ];

    case EntityType.DATABASE:
      return [
        {
          name: startCase(ServiceCategory.DATABASE_SERVICES),
          url: getSettingPath(
            GlobalSettingsMenuCategory.SERVICES,
            getServiceRouteFromServiceType(ServiceCategory.DATABASE_SERVICES)
          ),
        },
        ...getBreadcrumbForEntitiesWithServiceOnly(entity as Database),
      ];

    case EntityType.DATABASE_SCHEMA:
      return [
        {
          name: startCase(ServiceCategory.DATABASE_SERVICES),
          url: getSettingPath(
            GlobalSettingsMenuCategory.SERVICES,
            getServiceRouteFromServiceType(ServiceCategory.DATABASE_SERVICES)
          ),
        },
        {
          name: getEntityName((entity as DatabaseSchema).service),
          url: (entity as DatabaseSchema).service?.name
            ? getServiceDetailsPath(
                getEncodedFqn((entity as DatabaseSchema).service?.name ?? ''),
                ServiceCategoryPlural[
                  (entity as DatabaseSchema).service
                    ?.type as keyof typeof ServiceCategoryPlural
                ]
              )
            : '',
        },
        {
          name: getEntityName((entity as DatabaseSchema).database),
          url: getDatabaseDetailsPath(
            (entity as DatabaseSchema).database?.fullyQualifiedName ?? ''
          ),
        },
      ];

    case EntityType.DATABASE_SERVICE:
      return [
        {
          name: startCase(ServiceCategory.DATABASE_SERVICES),
          url: getSettingPath(
            GlobalSettingsMenuCategory.SERVICES,
            getServiceRouteFromServiceType(ServiceCategory.DATABASE_SERVICES)
          ),
        },
      ];

    case EntityType.DASHBOARD_SERVICE:
      return [
        {
          name: startCase(ServiceCategory.DASHBOARD_SERVICES),
          url: getSettingPath(
            GlobalSettingsMenuCategory.SERVICES,
            getServiceRouteFromServiceType(ServiceCategory.DASHBOARD_SERVICES)
          ),
        },
      ];

    case EntityType.MESSAGING_SERVICE:
      return [
        {
          name: startCase(ServiceCategory.MESSAGING_SERVICES),
          url: getSettingPath(
            GlobalSettingsMenuCategory.SERVICES,
            getServiceRouteFromServiceType(ServiceCategory.MESSAGING_SERVICES)
          ),
        },
      ];

    case EntityType.PIPELINE_SERVICE:
      return [
        {
          name: startCase(ServiceCategory.PIPELINE_SERVICES),
          url: getSettingPath(
            GlobalSettingsMenuCategory.SERVICES,
            getServiceRouteFromServiceType(ServiceCategory.PIPELINE_SERVICES)
          ),
        },
      ];

    case EntityType.MLMODEL_SERVICE:
      return [
        {
          name: startCase(ServiceCategory.ML_MODEL_SERVICES),
          url: getSettingPath(
            GlobalSettingsMenuCategory.SERVICES,
            getServiceRouteFromServiceType(ServiceCategory.ML_MODEL_SERVICES)
          ),
        },
      ];

    case EntityType.METADATA_SERVICE:
      return [
        {
          name: startCase(ServiceCategory.METADATA_SERVICES),
          url: getSettingPath(
            GlobalSettingsMenuCategory.SERVICES,
            getServiceRouteFromServiceType(ServiceCategory.METADATA_SERVICES)
          ),
        },
      ];

    case EntityType.STORAGE_SERVICE:
      return [
        {
          name: startCase(ServiceCategory.STORAGE_SERVICES),
          url: getSettingPath(
            GlobalSettingsMenuCategory.SERVICES,
            getServiceRouteFromServiceType(ServiceCategory.STORAGE_SERVICES)
          ),
        },
      ];

    case EntityType.SEARCH_SERVICE:
      return [
        {
          name: startCase(ServiceCategory.SEARCH_SERVICES),
          url: getSettingPath(
            GlobalSettingsMenuCategory.SERVICES,
            getServiceRouteFromServiceType(ServiceCategory.SEARCH_SERVICES)
          ),
        },
      ];

    case EntityType.CONTAINER: {
      const data = entity as Container;

      return getBreadcrumbForContainer({
        entity: data,
        includeCurrent: true,
        parents: isUndefined(data.parent) ? [] : [data.parent],
      });
    }

    case EntityType.DOMAIN:
      return [
        {
          name: i18next.t('label.domain-plural'),
          url: getDomainPath(),
        },
      ];

    case EntityType.DATA_PRODUCT: {
      const data = entity as DataProduct;
      if (!data.domain) {
        return [];
      }

      return [
        {
          name: getEntityName(data.domain),
          url: getDomainPath(data.domain.fullyQualifiedName),
        },
      ];
    }

    case EntityType.TOPIC:
    case EntityType.DASHBOARD:
    case EntityType.PIPELINE:
    case EntityType.MLMODEL:
    case EntityType.DASHBOARD_DATA_MODEL:
    case EntityType.SEARCH_INDEX:
    default:
      return getBreadcrumbForEntitiesWithServiceOnly(
        entity as Topic,
        includeCurrent
      );
  }
};

export const getBreadcrumbsFromFqn = (fqn: string, includeCurrent = false) => {
  const fqnList = Fqn.split(fqn);
  if (!includeCurrent) {
    fqnList.pop();
  }

  return [
    ...fqnList.map((fqn) => ({
      name: fqn,
      url: '',
    })),
  ];
};

export const getEntityThreadLink = (
  entityFieldThreadCount: EntityFieldThreadCount[]
) => {
  const thread = getEntityFieldThreadCounts(
    EntityField.TAGS,
    entityFieldThreadCount
  );

  return thread[0]?.entityLink;
};

/**
 * Take entity vote and userId as input and return name for vote status type
 * @param votes - entity votes
 * @param userId - current user id
 * @returns - vote status type
 */
export const getEntityVoteStatus = (userId: string, votes?: Votes) => {
  if (isUndefined(votes)) {
    return QueryVoteType.unVoted;
  }

  const upVoters = votes.upVoters ?? [];
  const downVoters = votes.downVoters ?? [];

  if (upVoters.some((user) => user.id === userId)) {
    return QueryVoteType.votedUp;
  } else if (downVoters.some((user) => user.id === userId)) {
    return QueryVoteType.votedDown;
  } else {
    return QueryVoteType.unVoted;
  }
};
