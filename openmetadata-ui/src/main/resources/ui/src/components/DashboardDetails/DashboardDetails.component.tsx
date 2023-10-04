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

import { FilterOutlined } from '@ant-design/icons';
import { Col, Row, Space, Table, Tabs, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import { groupBy, isEmpty, isUndefined, map, uniqBy } from 'lodash';
import { EntityTags, TagFilterOptions, TagOption } from 'Models';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import { ReactComponent as ExternalLinkIcon } from '../../assets/svg/external-links.svg';
import { useActivityFeedProvider } from '../../components/ActivityFeed/ActivityFeedProvider/ActivityFeedProvider';
import { ActivityFeedTab } from '../../components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.component';
import DescriptionV1 from '../../components/common/description/DescriptionV1';
import ErrorPlaceHolder from '../../components/common/error-with-placeholder/ErrorPlaceHolder';
import PageLayoutV1 from '../../components/containers/PageLayoutV1';
import { DataAssetsHeader } from '../../components/DataAssets/DataAssetsHeader/DataAssetsHeader.component';
import DataProductsContainer from '../../components/DataProductsContainer/DataProductsContainer.component';
import EntityLineageComponent from '../../components/Entity/EntityLineage/EntityLineage.component';
import { EntityName } from '../../components/Modals/EntityNameModal/EntityNameModal.interface';
import { withActivityFeed } from '../../components/router/withActivityFeed';
import { ColumnFilter } from '../../components/Table/ColumnFilter/ColumnFilter.component';
import TableDescription from '../../components/TableDescription/TableDescription.component';
import TableTags from '../../components/TableTags/TableTags.component';
import TabsLabel from '../../components/TabsLabel/TabsLabel.component';
import TagsContainerV2 from '../../components/Tag/TagsContainerV2/TagsContainerV2';
import { DisplayType } from '../../components/Tag/TagsViewer/TagsViewer.interface';
import {
  getDashboardDetailsPath,
  PRIMERY_COLOR,
} from '../../constants/constants';
import { EntityTabs, EntityType } from '../../enums/entity.enum';
import { Tag } from '../../generated/entity/classification/tag';
import { Dashboard } from '../../generated/entity/data/dashboard';
import { DataProduct } from '../../generated/entity/domains/dataProduct';
import { ThreadType } from '../../generated/entity/feed/thread';
import { TagSource } from '../../generated/type/schema';
import { LabelType, State, TagLabel } from '../../generated/type/tagLabel';
import { restoreDashboard } from '../../rest/dashboardAPI';
import { getCurrentUserId, getFeedCounts } from '../../utils/CommonUtils';
import {
  getEntityName,
  getEntityReferenceFromEntity,
} from '../../utils/EntityUtils';
import { getEntityFieldThreadCounts } from '../../utils/FeedUtils';
import { DEFAULT_ENTITY_PERMISSION } from '../../utils/PermissionsUtils';
import { getDecodedFqn } from '../../utils/StringsUtils';
import {
  getAllTags,
  searchTagInData,
} from '../../utils/TableTags/TableTags.utils';
import { getTagsWithoutTier, getTierTags } from '../../utils/TableUtils';
import { updateTierTag } from '../../utils/TagsUtils';
import { showErrorToast, showSuccessToast } from '../../utils/ToastUtils';
import ActivityThreadPanel from '../ActivityFeed/ActivityThreadPanel/ActivityThreadPanel';
import { CustomPropertyTable } from '../common/CustomPropertyTable/CustomPropertyTable';
import { ModalWithMarkdownEditor } from '../Modals/ModalWithMarkdownEditor/ModalWithMarkdownEditor';
import { usePermissionProvider } from '../PermissionProvider/PermissionProvider';
import { ResourceEntity } from '../PermissionProvider/PermissionProvider.interface';
import {
  ChartsPermissions,
  ChartType,
  DashboardDetailsProps,
} from './DashboardDetails.interface';

const DashboardDetails = ({
  updateDashboardDetailsState,
  charts,
  dashboardDetails,
  fetchDashboard,
  followDashboardHandler,
  unFollowDashboardHandler,
  chartDescriptionUpdateHandler,
  chartTagUpdateHandler,
  versionHandler,
  createThread,
  onUpdateVote,
  onDashboardUpdate,
  handleToggleDelete,
}: DashboardDetailsProps) => {
  const { t } = useTranslation();
  const history = useHistory();
  const { fqn: dashboardFQN, tab: activeTab = EntityTabs.DETAILS } =
    useParams<{ fqn: string; tab: EntityTabs }>();

  const { postFeed, deleteFeed, updateFeed } = useActivityFeedProvider();
  const [isEdit, setIsEdit] = useState(false);
  const [editChart, setEditChart] = useState<{
    chart: ChartType;
    index: number;
  }>();
  const [feedCount, setFeedCount] = useState<number>(0);
  const [threadLink, setThreadLink] = useState<string>('');

  const [threadType, setThreadType] = useState<ThreadType>(
    ThreadType.Conversation
  );
  const [dashboardPermissions, setDashboardPermissions] = useState(
    DEFAULT_ENTITY_PERMISSION
  );
  const [chartsPermissionsArray, setChartsPermissionsArray] = useState<
    Array<ChartsPermissions>
  >([]);

  const {
    owner,
    description,
    entityName,
    followers = [],
    deleted,
    dashboardTags,
    tier,
  } = useMemo(() => {
    const { tags = [] } = dashboardDetails;

    return {
      ...dashboardDetails,
      tier: getTierTags(tags),
      dashboardTags: getTagsWithoutTier(tags),
      entityName: getEntityName(dashboardDetails),
    };
  }, [dashboardDetails]);

  const { isFollowing } = useMemo(() => {
    return {
      isFollowing: followers?.some(({ id }) => id === getCurrentUserId()),
    };
  }, [followers]);

  const { getEntityPermission } = usePermissionProvider();

  const fetchResourcePermission = useCallback(async () => {
    try {
      const entityPermission = await getEntityPermission(
        ResourceEntity.DASHBOARD,
        dashboardDetails.id
      );
      setDashboardPermissions(entityPermission);
    } catch (error) {
      showErrorToast(
        t('server.fetch-entity-permissions-error', {
          entity: t('label.dashboard'),
        })
      );
    }
  }, [dashboardDetails.id, getEntityPermission, setDashboardPermissions]);

  useEffect(() => {
    if (dashboardDetails.id) {
      fetchResourcePermission();
    }
  }, [dashboardDetails.id]);

  const fetchChartPermissions = useCallback(async (id: string) => {
    try {
      const chartPermission = await getEntityPermission(
        ResourceEntity.CHART,
        id
      );

      return chartPermission;
    } catch (error) {
      return DEFAULT_ENTITY_PERMISSION;
    }
  }, []);

  const getEntityFeedCount = () => {
    getFeedCounts(EntityType.DASHBOARD, dashboardFQN, setFeedCount);
  };

  useEffect(() => {
    getEntityFeedCount();
  }, [dashboardFQN]);

  const getAllChartsPermissions = useCallback(
    async (charts: ChartType[]) => {
      const permissionsArray: Array<ChartsPermissions> = [];
      try {
        await Promise.all(
          charts.map(async (chart) => {
            const chartPermissions = await fetchChartPermissions(chart.id);
            permissionsArray.push({
              id: chart.id,
              permissions: chartPermissions,
            });
          })
        );

        setChartsPermissionsArray(permissionsArray);
      } catch {
        showErrorToast(
          t('server.fetch-entity-permissions-error', {
            entity: t('label.chart'),
          })
        );
      }
    },
    [dashboardDetails]
  );

  useEffect(() => {
    if (charts) {
      getAllChartsPermissions(charts);
    }
  }, [charts]);

  const handleTabChange = (activeKey: string) => {
    if (activeKey !== activeTab) {
      history.push(
        getDashboardDetailsPath(getDecodedFqn(dashboardFQN), activeKey)
      );
    }
  };

  const onDescriptionEdit = (): void => {
    setIsEdit(true);
  };
  const onCancel = () => {
    setIsEdit(false);
  };

  const onDescriptionUpdate = async (updatedHTML: string) => {
    if (description !== updatedHTML) {
      const updatedDashboard = {
        ...dashboardDetails,
        description: updatedHTML,
      };
      try {
        await onDashboardUpdate(updatedDashboard, 'description');
      } catch (error) {
        showErrorToast(error as AxiosError);
      } finally {
        setIsEdit(false);
      }
    } else {
      setIsEdit(false);
    }
  };

  const onOwnerUpdate = useCallback(
    async (newOwner?: Dashboard['owner']) => {
      const updatedDashboard = {
        ...dashboardDetails,
        owner: newOwner ? { ...owner, ...newOwner } : undefined,
      };
      await onDashboardUpdate(updatedDashboard, 'owner');
    },
    [owner]
  );

  const onTierUpdate = async (newTier?: Tag) => {
    const tierTag = updateTierTag(dashboardDetails?.tags ?? [], newTier);
    const updatedDashboard = {
      ...dashboardDetails,
      tags: tierTag,
    };
    await onDashboardUpdate(updatedDashboard, 'tags');
  };

  const onDataProductsUpdate = async (updatedData: DataProduct[]) => {
    const dataProductsEntity = updatedData?.map((item) => {
      return getEntityReferenceFromEntity(item, EntityType.DATA_PRODUCT);
    });

    const updatedDashboard = {
      ...dashboardDetails,
      dataProducts: dataProductsEntity,
    };

    await onDashboardUpdate(updatedDashboard, 'dataProducts');
  };

  const onUpdateDisplayName = async (data: EntityName) => {
    const updatedData = {
      ...dashboardDetails,
      displayName: data.displayName,
    };
    await onDashboardUpdate(updatedData, 'displayName');
  };
  const onExtensionUpdate = async (updatedData: Dashboard) => {
    await onDashboardUpdate(
      { ...dashboardDetails, extension: updatedData.extension },
      'extension'
    );
  };

  const handleRestoreDashboard = async () => {
    try {
      await restoreDashboard(dashboardDetails.id);
      showSuccessToast(
        t('message.restore-entities-success', {
          entity: t('label.dashboard'),
        }),
        2000
      );
      handleToggleDelete();
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('message.restore-entities-error', {
          entity: t('label.dashboard'),
        })
      );
    }
  };

  const followDashboard = async () => {
    isFollowing
      ? await unFollowDashboardHandler()
      : await followDashboardHandler();
  };
  const handleUpdateChart = (chart: ChartType, index: number) => {
    setEditChart({ chart, index });
  };

  const closeEditChartModal = (): void => {
    setEditChart(undefined);
  };
  const onChartUpdate = async (chartDescription: string) => {
    if (editChart) {
      const updatedChart = {
        ...editChart.chart,
        description: chartDescription,
      };
      const jsonPatch = compare(charts[editChart.index], updatedChart);

      try {
        await chartDescriptionUpdateHandler(
          editChart.index,
          editChart.chart.id,
          jsonPatch
        );
      } catch (error) {
        showErrorToast(error as AxiosError);
      } finally {
        setEditChart(undefined);
      }
    } else {
      setEditChart(undefined);
    }
  };

  const handleChartTagSelection = async (
    selectedTags: Array<EntityTags>,
    editColumnTag: ChartType
  ) => {
    if (selectedTags && editColumnTag) {
      const newSelectedTags: TagOption[] = map(selectedTags, (tag) => ({
        fqn: tag.tagFQN,
        source: tag.source,
      }));

      const prevTags = editColumnTag.tags?.filter((tag) =>
        newSelectedTags.some((selectedTag) => selectedTag.fqn === tag.tagFQN)
      );
      const newTags = newSelectedTags
        .filter(
          (selectedTag) =>
            !editColumnTag.tags?.some((tag) => tag.tagFQN === selectedTag.fqn)
        )
        .map((tag) => ({
          labelType: 'Manual',
          state: 'Confirmed',
          source: tag.source,
          tagFQN: tag.fqn,
        }));

      const updatedChart = {
        ...editColumnTag,
        tags: [...(prevTags as TagLabel[]), ...newTags],
      };
      const jsonPatch = compare(editColumnTag, updatedChart);
      await chartTagUpdateHandler(editColumnTag.id, jsonPatch);
    }
  };

  const onThreadLinkSelect = (link: string, threadType?: ThreadType) => {
    setThreadLink(link);
    if (threadType) {
      setThreadType(threadType);
    }
  };

  const onThreadPanelClose = () => {
    setThreadLink('');
  };

  const hasEditTagAccess = (record: ChartType) => {
    const permissionsObject = chartsPermissionsArray?.find(
      (chart) => chart.id === record.id
    )?.permissions;

    return (
      !isUndefined(permissionsObject) &&
      (permissionsObject.EditTags || permissionsObject.EditAll)
    );
  };

  const handleTagSelection = async (selectedTags: EntityTags[]) => {
    const updatedTags: TagLabel[] | undefined = selectedTags?.map((tag) => ({
      source: tag.source,
      tagFQN: tag.tagFQN,
      labelType: LabelType.Manual,
      state: State.Confirmed,
    }));

    if (updatedTags && dashboardDetails) {
      const updatedTags = [...(tier ? [tier] : []), ...selectedTags];
      const updatedDashboard = { ...dashboardDetails, tags: updatedTags };
      await onDashboardUpdate(updatedDashboard, 'tags');
    }
  };

  const afterDeleteAction = useCallback(
    (isSoftDelete?: boolean) =>
      isSoftDelete ? handleToggleDelete : history.push('/'),
    []
  );

  const tagFilter = useMemo(() => {
    const tags = getAllTags(charts);

    return groupBy(uniqBy(tags, 'value'), (tag) => tag.source) as Record<
      TagSource,
      TagFilterOptions[]
    >;
  }, [charts]);

  const tableColumn: ColumnsType<ChartType> = useMemo(
    () => [
      {
        title: t('label.chart-entity', {
          entity: t('label.name'),
        }),
        dataIndex: 'chartName',
        key: 'chartName',
        width: 200,
        render: (_, record) => {
          const chartName = getEntityName(record);

          return record.sourceUrl ? (
            <Typography.Link href={record.sourceUrl} target="_blank">
              <Space>
                {chartName}
                <ExternalLinkIcon height={14} width={14} />
              </Space>
            </Typography.Link>
          ) : (
            <Typography.Text>{chartName}</Typography.Text>
          );
        },
      },
      {
        title: t('label.chart-entity', {
          entity: t('label.type'),
        }),
        dataIndex: 'chartType',
        key: 'chartType',
        width: 120,
      },
      {
        title: t('label.description'),
        dataIndex: 'description',
        key: 'description',
        width: 350,
        render: (_, record, index) => {
          const permissionsObject = chartsPermissionsArray?.find(
            (chart) => chart.id === record.id
          )?.permissions;

          const editDescriptionPermissions =
            !isUndefined(permissionsObject) &&
            (permissionsObject.EditDescription || permissionsObject.EditAll);

          return (
            <TableDescription
              columnData={{
                fqn: record.fullyQualifiedName ?? '',
                field: record.description,
              }}
              entityFqn={dashboardFQN}
              entityType={EntityType.DASHBOARD}
              hasEditPermission={editDescriptionPermissions}
              index={index}
              isReadOnly={deleted}
              onClick={() => handleUpdateChart(record, index)}
              onThreadLinkSelect={onThreadLinkSelect}
            />
          );
        },
      },
      {
        title: t('label.tag-plural'),
        dataIndex: 'tags',
        key: 'tags',
        accessor: 'tags',
        width: 300,
        filterIcon: (filtered: boolean) => (
          <FilterOutlined
            data-testid="tag-filter"
            style={{ color: filtered ? PRIMERY_COLOR : undefined }}
          />
        ),
        render: (tags: TagLabel[], record: ChartType, index: number) => {
          return (
            <TableTags<ChartType>
              entityFqn={dashboardFQN}
              entityType={EntityType.DASHBOARD}
              handleTagSelection={handleChartTagSelection}
              hasTagEditAccess={hasEditTagAccess(record)}
              index={index}
              isReadOnly={deleted}
              record={record}
              tags={tags}
              type={TagSource.Classification}
              onThreadLinkSelect={onThreadLinkSelect}
            />
          );
        },
        filters: tagFilter.Classification,
        filterDropdown: ColumnFilter,
        onFilter: searchTagInData,
      },
      {
        title: t('label.glossary-term-plural'),
        dataIndex: 'tags',
        key: 'glossary',
        accessor: 'tags',
        width: 300,
        filterIcon: (filtered: boolean) => (
          <FilterOutlined
            data-testid="glossary-filter"
            style={{ color: filtered ? PRIMERY_COLOR : undefined }}
          />
        ),
        render: (tags: TagLabel[], record: ChartType, index: number) => (
          <TableTags<ChartType>
            entityFqn={dashboardFQN}
            entityType={EntityType.DASHBOARD}
            handleTagSelection={handleChartTagSelection}
            hasTagEditAccess={hasEditTagAccess(record)}
            index={index}
            isReadOnly={deleted}
            record={record}
            tags={tags}
            type={TagSource.Glossary}
            onThreadLinkSelect={onThreadLinkSelect}
          />
        ),
        filters: tagFilter.Glossary,
        filterDropdown: ColumnFilter,
        onFilter: searchTagInData,
      },
    ],
    [
      deleted,
      chartsPermissionsArray,
      onThreadLinkSelect,
      hasEditTagAccess,
      handleUpdateChart,
      handleChartTagSelection,
      getEntityFieldThreadCounts,
    ]
  );

  const tabs = useMemo(
    () => [
      {
        label: (
          <TabsLabel id={EntityTabs.DETAILS} name={t('label.detail-plural')} />
        ),
        key: EntityTabs.DETAILS,
        children: (
          <Row gutter={[0, 16]} wrap={false}>
            <Col className="p-t-sm m-x-lg" flex="auto">
              <div className="d-flex flex-col gap-4">
                <DescriptionV1
                  description={dashboardDetails.description}
                  entityFqn={dashboardFQN}
                  entityName={entityName}
                  entityType={EntityType.DASHBOARD}
                  hasEditAccess={
                    dashboardPermissions.EditAll ||
                    dashboardPermissions.EditDescription
                  }
                  isEdit={isEdit}
                  isReadOnly={dashboardDetails.deleted}
                  owner={dashboardDetails.owner}
                  onCancel={onCancel}
                  onDescriptionEdit={onDescriptionEdit}
                  onDescriptionUpdate={onDescriptionUpdate}
                  onThreadLinkSelect={onThreadLinkSelect}
                />

                {isEmpty(charts) ? (
                  <ErrorPlaceHolder />
                ) : (
                  <Table
                    bordered
                    columns={tableColumn}
                    data-testid="charts-table"
                    dataSource={charts}
                    pagination={false}
                    rowKey="id"
                    scroll={{ x: 1200 }}
                    size="small"
                  />
                )}
              </div>
            </Col>
            <Col
              className="entity-tag-right-panel-container"
              data-testid="entity-right-panel"
              flex="320px">
              <Space className="w-full" direction="vertical" size="large">
                <DataProductsContainer
                  activeDomain={dashboardDetails?.domain}
                  dataProducts={dashboardDetails?.dataProducts ?? []}
                  hasPermission={
                    dashboardPermissions.EditAll && !dashboardDetails.deleted
                  }
                  onSave={onDataProductsUpdate}
                />

                <TagsContainerV2
                  displayType={DisplayType.READ_MORE}
                  entityFqn={dashboardFQN}
                  entityType={EntityType.DASHBOARD}
                  permission={
                    (dashboardPermissions.EditAll ||
                      dashboardPermissions.EditTags) &&
                    !dashboardDetails.deleted
                  }
                  selectedTags={dashboardTags}
                  tagType={TagSource.Classification}
                  onSelectionChange={handleTagSelection}
                  onThreadLinkSelect={onThreadLinkSelect}
                />

                <TagsContainerV2
                  displayType={DisplayType.READ_MORE}
                  entityFqn={dashboardFQN}
                  entityType={EntityType.DASHBOARD}
                  permission={
                    (dashboardPermissions.EditAll ||
                      dashboardPermissions.EditTags) &&
                    !dashboardDetails.deleted
                  }
                  selectedTags={dashboardTags}
                  tagType={TagSource.Glossary}
                  onSelectionChange={handleTagSelection}
                  onThreadLinkSelect={onThreadLinkSelect}
                />
              </Space>
            </Col>
          </Row>
        ),
      },
      {
        label: (
          <TabsLabel
            count={feedCount}
            id={EntityTabs.ACTIVITY_FEED}
            isActive={activeTab === EntityTabs.ACTIVITY_FEED}
            name={t('label.activity-feed-and-task-plural')}
          />
        ),
        key: EntityTabs.ACTIVITY_FEED,
        children: (
          <ActivityFeedTab
            entityType={EntityType.DASHBOARD}
            fqn={dashboardDetails?.fullyQualifiedName ?? ''}
            onFeedUpdate={getEntityFeedCount}
            onUpdateEntityDetails={fetchDashboard}
          />
        ),
      },
      {
        label: <TabsLabel id={EntityTabs.LINEAGE} name={t('label.lineage')} />,
        key: EntityTabs.LINEAGE,
        children: (
          <EntityLineageComponent
            entity={dashboardDetails}
            entityType={EntityType.DASHBOARD}
            hasEditAccess={
              dashboardPermissions.EditAll || dashboardPermissions.EditLineage
            }
          />
        ),
      },
      {
        label: (
          <TabsLabel
            id={EntityTabs.CUSTOM_PROPERTIES}
            name={t('label.custom-property-plural')}
          />
        ),
        key: EntityTabs.CUSTOM_PROPERTIES,
        children: (
          <CustomPropertyTable
            entityType={EntityType.DASHBOARD}
            handleExtensionUpdate={onExtensionUpdate}
            hasEditAccess={
              dashboardPermissions.EditAll ||
              dashboardPermissions.EditCustomFields
            }
            hasPermission={dashboardPermissions.ViewAll}
          />
        ),
      },
    ],
    [
      feedCount,
      activeTab,
      isEdit,
      tableColumn,
      dashboardDetails,
      charts,
      entityName,
      dashboardPermissions,
      dashboardTags,
      getEntityFieldThreadCounts,
      onCancel,
      onDescriptionEdit,
      onDescriptionUpdate,
      onThreadLinkSelect,
      handleTagSelection,
    ]
  );

  return (
    <PageLayoutV1
      className="bg-white"
      pageTitle="Table details"
      title="Table details">
      <Row gutter={[0, 12]}>
        <Col className="p-x-lg" span={24}>
          <DataAssetsHeader
            afterDeleteAction={afterDeleteAction}
            afterDomainUpdateAction={updateDashboardDetailsState}
            dataAsset={dashboardDetails}
            entityType={EntityType.DASHBOARD}
            permissions={dashboardPermissions}
            onDisplayNameUpdate={onUpdateDisplayName}
            onFollowClick={followDashboard}
            onOwnerUpdate={onOwnerUpdate}
            onRestoreDataAsset={handleRestoreDashboard}
            onTierUpdate={onTierUpdate}
            onUpdateVote={onUpdateVote}
            onVersionClick={versionHandler}
          />
        </Col>
        <Col span={24}>
          <Tabs
            activeKey={activeTab ?? EntityTabs.SCHEMA}
            className="entity-details-page-tabs"
            data-testid="tabs"
            items={tabs}
            onChange={handleTabChange}
          />
        </Col>
      </Row>

      {editChart && (
        <ModalWithMarkdownEditor
          header={t('label.edit-chart-name', {
            name: editChart.chart.displayName,
          })}
          placeholder={t('label.enter-field-description', {
            field: t('label.chart'),
          })}
          value={editChart.chart.description || ''}
          visible={Boolean(editChart)}
          onCancel={closeEditChartModal}
          onSave={onChartUpdate}
        />
      )}
      {threadLink ? (
        <ActivityThreadPanel
          createThread={createThread}
          deletePostHandler={deleteFeed}
          open={Boolean(threadLink)}
          postFeedHandler={postFeed}
          threadLink={threadLink}
          threadType={threadType}
          updateThreadHandler={updateFeed}
          onCancel={onThreadPanelClose}
        />
      ) : null}
    </PageLayoutV1>
  );
};

export default withActivityFeed<DashboardDetailsProps>(DashboardDetails);
