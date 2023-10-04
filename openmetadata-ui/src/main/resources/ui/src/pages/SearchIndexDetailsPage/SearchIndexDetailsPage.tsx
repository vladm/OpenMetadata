/*
 *  Copyright 2023 Collate.
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

import { Col, Row, Space, Tabs } from 'antd';
import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import { isEqual } from 'lodash';
import { EntityTags } from 'Models';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import ActivityFeedProvider, {
  useActivityFeedProvider,
} from '../../components/ActivityFeed/ActivityFeedProvider/ActivityFeedProvider';
import { ActivityFeedTab } from '../../components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.component';
import ActivityThreadPanel from '../../components/ActivityFeed/ActivityThreadPanel/ActivityThreadPanel';
import { CustomPropertyTable } from '../../components/common/CustomPropertyTable/CustomPropertyTable';
import DescriptionV1 from '../../components/common/description/DescriptionV1';
import ErrorPlaceHolder from '../../components/common/error-with-placeholder/ErrorPlaceHolder';
import QueryViewer from '../../components/common/QueryViewer/QueryViewer.component';
import PageLayoutV1 from '../../components/containers/PageLayoutV1';
import { DataAssetsHeader } from '../../components/DataAssets/DataAssetsHeader/DataAssetsHeader.component';
import EntityLineageComponent from '../../components/Entity/EntityLineage/EntityLineage.component';
import Loader from '../../components/Loader/Loader';
import { EntityName } from '../../components/Modals/EntityNameModal/EntityNameModal.interface';
import { usePermissionProvider } from '../../components/PermissionProvider/PermissionProvider';
import {
  OperationPermission,
  ResourceEntity,
} from '../../components/PermissionProvider/PermissionProvider.interface';
import SampleDataWithMessages from '../../components/SampleDataWithMessages/SampleDataWithMessages';
import { SourceType } from '../../components/searched-data/SearchedData.interface';
import TabsLabel from '../../components/TabsLabel/TabsLabel.component';
import TagsContainerV2 from '../../components/Tag/TagsContainerV2/TagsContainerV2';
import { DisplayType } from '../../components/Tag/TagsViewer/TagsViewer.interface';
import { getVersionPath } from '../../constants/constants';
import { ERROR_PLACEHOLDER_TYPE } from '../../enums/common.enum';
import { EntityTabs, EntityType } from '../../enums/entity.enum';
import {
  CreateThread,
  ThreadType,
} from '../../generated/api/feed/createThread';
import { Tag } from '../../generated/entity/classification/tag';
import { SearchIndex, TagLabel } from '../../generated/entity/data/searchIndex';
import { LabelType, State, TagSource } from '../../generated/type/tagLabel';
import { postThread } from '../../rest/feedsAPI';
import {
  addFollower,
  getSearchIndexDetailsByFQN,
  patchSearchIndexDetails,
  removeFollower,
  restoreSearchIndex,
} from '../../rest/SearchIndexAPI';
import {
  addToRecentViewed,
  getCurrentUserId,
  getFeedCounts,
  sortTagsCaseInsensitive,
} from '../../utils/CommonUtils';
import { getEntityName } from '../../utils/EntityUtils';
import { DEFAULT_ENTITY_PERMISSION } from '../../utils/PermissionsUtils';
import {
  defaultFields,
  getSearchIndexTabPath,
} from '../../utils/SearchIndexUtils';
import { getTagsWithoutTier, getTierTags } from '../../utils/TableUtils';
import { updateTierTag } from '../../utils/TagsUtils';
import { showErrorToast, showSuccessToast } from '../../utils/ToastUtils';
import SearchIndexFieldsTab from './SearchIndexFieldsTab/SearchIndexFieldsTab';

function SearchIndexDetailsPage() {
  const { postFeed, deleteFeed, updateFeed } = useActivityFeedProvider();
  const { getEntityPermissionByFqn } = usePermissionProvider();
  const { fqn: searchIndexFQN, tab: activeTab = EntityTabs.FIELDS } =
    useParams<{ fqn: string; tab: string }>();
  const { t } = useTranslation();
  const history = useHistory();
  const USERId = getCurrentUserId();
  const [loading, setLoading] = useState<boolean>(true);
  const [searchIndexDetails, setSearchIndexDetails] = useState<SearchIndex>();
  const [feedCount, setFeedCount] = useState<number>(0);
  const [isEdit, setIsEdit] = useState(false);
  const [threadLink, setThreadLink] = useState<string>('');
  const [threadType, setThreadType] = useState<ThreadType>(
    ThreadType.Conversation
  );
  const [searchIndexPermissions, setSearchIndexPermissions] =
    useState<OperationPermission>(DEFAULT_ENTITY_PERMISSION);

  const viewPermission = useMemo(
    () => searchIndexPermissions.ViewAll || searchIndexPermissions.ViewBasic,
    [searchIndexPermissions]
  );

  const entityFQN = useMemo(
    () => encodeURIComponent(decodeURIComponent(searchIndexFQN)),
    [searchIndexFQN]
  );

  const fetchSearchIndexDetails = async () => {
    setLoading(true);
    try {
      const fields = defaultFields;
      const details = await getSearchIndexDetailsByFQN(entityFQN, fields);

      setSearchIndexDetails(details);
      addToRecentViewed({
        displayName: getEntityName(details),
        entityType: EntityType.SEARCH_INDEX,
        fqn: details.fullyQualifiedName ?? '',
        serviceType: details.serviceType,
        timestamp: 0,
        id: details.id,
      });
    } catch (error) {
      // Error here
    } finally {
      setLoading(false);
    }
  };

  const onDescriptionEdit = (): void => {
    setIsEdit(true);
  };
  const onCancel = () => {
    setIsEdit(false);
  };

  const {
    tier,
    searchIndexTags,
    owner,
    version,
    followers = [],
    description,
    entityName,
    id: searchIndexId = '',
  } = useMemo(() => {
    if (searchIndexDetails) {
      const { tags } = searchIndexDetails;

      return {
        ...searchIndexDetails,
        tier: getTierTags(tags ?? []),
        searchIndexTags: getTagsWithoutTier(tags ?? []),
        entityName: getEntityName(searchIndexDetails),
      };
    }

    return {} as SearchIndex & {
      tier: TagLabel;
      searchIndexTags: EntityTags[];
      entityName: string;
    };
  }, [searchIndexDetails, searchIndexDetails?.tags]);

  const fetchResourcePermission = useCallback(
    async (entityFQN) => {
      try {
        const searchIndexPermission = await getEntityPermissionByFqn(
          ResourceEntity.SEARCH_INDEX,
          entityFQN
        );

        setSearchIndexPermissions(searchIndexPermission);
      } finally {
        setLoading(false);
      }
    },
    [getEntityPermissionByFqn]
  );

  const getEntityFeedCount = () => {
    getFeedCounts(EntityType.SEARCH_INDEX, entityFQN, setFeedCount);
  };

  const handleTabChange = (activeKey: string) => {
    if (activeKey !== activeTab) {
      history.push(getSearchIndexTabPath(entityFQN, activeKey));
    }
  };

  const saveUpdatedSearchIndexData = useCallback(
    (updatedData: SearchIndex) => {
      if (!searchIndexDetails) {
        return updatedData;
      }
      const jsonPatch = compare(searchIndexDetails, updatedData);

      return patchSearchIndexDetails(searchIndexId, jsonPatch);
    },
    [searchIndexDetails, searchIndexId]
  );

  const onSearchIndexUpdate = async (
    updatedSearchIndex: SearchIndex,
    key: keyof SearchIndex
  ) => {
    try {
      const res = await saveUpdatedSearchIndexData(updatedSearchIndex);

      setSearchIndexDetails((previous) => {
        if (!previous) {
          return;
        }
        if (key === 'tags') {
          return {
            ...previous,
            version: res.version,
            [key]: sortTagsCaseInsensitive(res.tags ?? []),
          };
        }

        return {
          ...previous,
          version: res.version,
          [key]: res[key],
        };
      });
      getEntityFeedCount();
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const handleUpdateOwner = useCallback(
    async (newOwner?: SearchIndex['owner']) => {
      if (!searchIndexDetails) {
        return;
      }
      const updatedSearchIndexDetails = {
        ...searchIndexDetails,
        owner: newOwner
          ? {
              ...owner,
              ...newOwner,
            }
          : undefined,
      };
      await onSearchIndexUpdate(updatedSearchIndexDetails, 'owner');
    },
    [owner, searchIndexDetails]
  );

  const onDescriptionUpdate = async (updatedHTML: string) => {
    if (!searchIndexDetails) {
      return;
    }
    if (description !== updatedHTML) {
      const updatedSearchIndexDetails = {
        ...searchIndexDetails,
        description: updatedHTML,
      };
      await onSearchIndexUpdate(updatedSearchIndexDetails, 'description');
      setIsEdit(false);
    } else {
      setIsEdit(false);
    }
  };

  const onFieldsUpdate = async (updateFields: SearchIndex['fields']) => {
    if (
      searchIndexDetails &&
      !isEqual(searchIndexDetails.fields, updateFields)
    ) {
      const updatedSearchIndexDetails = {
        ...searchIndexDetails,
        fields: updateFields,
      };
      await onSearchIndexUpdate(updatedSearchIndexDetails, 'fields');
    }
  };

  const onThreadLinkSelect = (link: string, threadType?: ThreadType) => {
    setThreadLink(link);
    if (threadType) {
      setThreadType(threadType);
    }
  };

  const handleDisplayNameUpdate = async (data: EntityName) => {
    if (!searchIndexDetails) {
      return;
    }
    const updatedSearchIndex = {
      ...searchIndexDetails,
      displayName: data.displayName,
    };
    await onSearchIndexUpdate(updatedSearchIndex, 'displayName');
  };

  const handleTagsUpdate = async (selectedTags?: Array<TagLabel>) => {
    if (selectedTags && searchIndexDetails) {
      const updatedTags = [...(tier ? [tier] : []), ...selectedTags];
      const updatedSearchIndex = { ...searchIndexDetails, tags: updatedTags };
      await onSearchIndexUpdate(updatedSearchIndex, 'tags');
    }
  };

  const handleTagSelection = async (selectedTags: EntityTags[]) => {
    const updatedTags: TagLabel[] | undefined = selectedTags?.map((tag) => {
      return {
        source: tag.source,
        tagFQN: tag.tagFQN,
        labelType: LabelType.Manual,
        state: State.Confirmed,
      };
    });
    await handleTagsUpdate(updatedTags);
  };

  const onExtensionUpdate = useCallback(
    async (updatedData: SearchIndex) => {
      searchIndexDetails &&
        (await saveUpdatedSearchIndexData({
          ...searchIndexDetails,
          extension: updatedData.extension,
        }));
    },
    [saveUpdatedSearchIndexData, searchIndexDetails]
  );

  const fieldsTab = useMemo(
    () => (
      <Row gutter={[0, 16]} id="schemaDetails" wrap={false}>
        <Col className="p-t-sm m-l-lg tab-content-height p-r-lg" flex="auto">
          <div className="d-flex flex-col gap-4">
            <DescriptionV1
              description={searchIndexDetails?.description}
              entityFqn={searchIndexFQN}
              entityName={entityName}
              entityType={EntityType.SEARCH_INDEX}
              hasEditAccess={
                searchIndexPermissions.EditAll ||
                searchIndexPermissions.EditDescription
              }
              isEdit={isEdit}
              isReadOnly={searchIndexDetails?.deleted}
              owner={searchIndexDetails?.owner}
              onCancel={onCancel}
              onDescriptionEdit={onDescriptionEdit}
              onDescriptionUpdate={onDescriptionUpdate}
              onThreadLinkSelect={onThreadLinkSelect}
            />
            <SearchIndexFieldsTab
              entityFqn={searchIndexFQN}
              fields={searchIndexDetails?.fields ?? []}
              hasDescriptionEditAccess={
                searchIndexPermissions.EditAll ||
                searchIndexPermissions.EditDescription
              }
              hasTagEditAccess={
                searchIndexPermissions.EditAll ||
                searchIndexPermissions.EditTags
              }
              isReadOnly={searchIndexDetails?.deleted}
              onThreadLinkSelect={onThreadLinkSelect}
              onUpdate={onFieldsUpdate}
            />
          </div>
        </Col>
        <Col
          className="entity-tag-right-panel-container"
          data-testid="entity-right-panel"
          flex="320px">
          <Space className="w-full" direction="vertical" size="large">
            <TagsContainerV2
              displayType={DisplayType.READ_MORE}
              entityFqn={searchIndexFQN}
              entityType={EntityType.SEARCH_INDEX}
              permission={
                (searchIndexPermissions.EditAll ||
                  searchIndexPermissions.EditTags) &&
                !searchIndexDetails?.deleted
              }
              selectedTags={searchIndexTags}
              tagType={TagSource.Classification}
              onSelectionChange={handleTagSelection}
              onThreadLinkSelect={onThreadLinkSelect}
            />

            <TagsContainerV2
              displayType={DisplayType.READ_MORE}
              entityFqn={searchIndexFQN}
              entityType={EntityType.SEARCH_INDEX}
              permission={
                (searchIndexPermissions.EditAll ||
                  searchIndexPermissions.EditTags) &&
                !searchIndexDetails?.deleted
              }
              selectedTags={searchIndexTags}
              tagType={TagSource.Glossary}
              onSelectionChange={handleTagSelection}
              onThreadLinkSelect={onThreadLinkSelect}
            />
          </Space>
        </Col>
      </Row>
    ),
    [
      isEdit,
      searchIndexDetails,
      searchIndexPermissions,
      onDescriptionEdit,
      onDescriptionUpdate,
    ]
  );

  const tabs = useMemo(() => {
    const allTabs = [
      {
        label: (
          <TabsLabel id={EntityTabs.FIELDS} name={t('label.field-plural')} />
        ),
        key: EntityTabs.FIELDS,
        children: fieldsTab,
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
          <ActivityFeedProvider>
            <ActivityFeedTab
              entityType={EntityType.SEARCH_INDEX}
              fqn={searchIndexDetails?.fullyQualifiedName ?? ''}
              owner={searchIndexDetails?.owner}
              onFeedUpdate={getEntityFeedCount}
              onUpdateEntityDetails={fetchSearchIndexDetails}
            />
          </ActivityFeedProvider>
        ),
      },
      {
        label: (
          <TabsLabel
            id={EntityTabs.SAMPLE_DATA}
            name={t('label.sample-data')}
          />
        ),
        key: EntityTabs.SAMPLE_DATA,
        children: !(
          searchIndexPermissions.ViewAll ||
          searchIndexPermissions.ViewSampleData
        ) ? (
          <div className="m-t-xlg">
            <ErrorPlaceHolder type={ERROR_PLACEHOLDER_TYPE.PERMISSION} />
          </div>
        ) : (
          <SampleDataWithMessages
            entityId={searchIndexDetails?.id ?? ''}
            entityType={EntityType.SEARCH_INDEX}
          />
        ),
      },
      {
        label: <TabsLabel id={EntityTabs.LINEAGE} name={t('label.lineage')} />,
        key: EntityTabs.LINEAGE,
        children: (
          <EntityLineageComponent
            deleted={searchIndexDetails?.deleted}
            entity={searchIndexDetails as SourceType}
            entityType={EntityType.SEARCH_INDEX}
            hasEditAccess={
              searchIndexPermissions.EditAll ||
              searchIndexPermissions.EditLineage
            }
          />
        ),
      },
      {
        label: (
          <TabsLabel
            id={EntityTabs.SEARCH_INDEX_SETTINGS}
            name={t('label.search-index-setting-plural')}
          />
        ),
        key: EntityTabs.SEARCH_INDEX_SETTINGS,
        children: (
          <QueryViewer
            sqlQuery={JSON.stringify(searchIndexDetails?.searchIndexSettings)}
            title={t('label.search-index-setting-plural')}
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
            entityType={EntityType.SEARCH_INDEX}
            handleExtensionUpdate={onExtensionUpdate}
            hasEditAccess={
              searchIndexPermissions.EditAll ||
              searchIndexPermissions.EditCustomFields
            }
            hasPermission={searchIndexPermissions.ViewAll}
          />
        ),
      },
    ];

    return allTabs;
  }, [
    fieldsTab,
    searchIndexPermissions,
    activeTab,
    searchIndexDetails,
    feedCount,
    entityName,
    onExtensionUpdate,
    getEntityFeedCount,
  ]);

  const onTierUpdate = useCallback(
    async (newTier?: Tag) => {
      if (searchIndexDetails) {
        const tierTag: SearchIndex['tags'] = updateTierTag(
          searchIndexTags,
          newTier
        );
        const updatedSearchIndexDetails = {
          ...searchIndexDetails,
          tags: tierTag,
        };

        await onSearchIndexUpdate(updatedSearchIndexDetails, 'tags');
      }
    },
    [searchIndexDetails, onSearchIndexUpdate, searchIndexTags]
  );

  const handleToggleDelete = () => {
    setSearchIndexDetails((prev) => {
      if (!prev) {
        return prev;
      }

      return { ...prev, deleted: !prev?.deleted };
    });
  };

  const handleRestoreSearchIndex = async () => {
    try {
      await restoreSearchIndex(searchIndexId);
      showSuccessToast(
        t('message.restore-entities-success', {
          entity: t('label.search-index'),
        }),
        2000
      );
      handleToggleDelete();
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('message.restore-entities-error', {
          entity: t('label.search-index'),
        })
      );
    }
  };

  const followSearchIndex = useCallback(async () => {
    try {
      const res = await addFollower(searchIndexId, USERId);
      const { newValue } = res.changeDescription.fieldsAdded[0];
      const newFollowers = [...(followers ?? []), ...newValue];
      setSearchIndexDetails((prev) => {
        if (!prev) {
          return prev;
        }

        return { ...prev, followers: newFollowers };
      });
      getEntityFeedCount();
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.entity-follow-error', {
          entity: getEntityName(searchIndexDetails),
        })
      );
    }
  }, [USERId, searchIndexId, getEntityFeedCount]);

  const unFollowSearchIndex = useCallback(async () => {
    try {
      const res = await removeFollower(searchIndexId, USERId);
      const { oldValue } = res.changeDescription.fieldsDeleted[0];
      setSearchIndexDetails((pre) => {
        if (!pre) {
          return pre;
        }

        return {
          ...pre,
          followers: pre.followers?.filter(
            (follower) => follower.id !== oldValue[0].id
          ),
        };
      });
      getEntityFeedCount();
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.entity-unfollow-error', {
          entity: getEntityName(searchIndexDetails),
        })
      );
    }
  }, [USERId, searchIndexId, getEntityFeedCount]);

  const { isFollowing } = useMemo(() => {
    return {
      isFollowing: followers?.some(({ id }) => id === USERId),
    };
  }, [followers, USERId]);

  const handleFollowSearchIndex = useCallback(async () => {
    isFollowing ? await unFollowSearchIndex() : await followSearchIndex();
  }, [isFollowing, unFollowSearchIndex, followSearchIndex]);

  const versionHandler = useCallback(() => {
    version &&
      history.push(
        getVersionPath(EntityType.SEARCH_INDEX, searchIndexFQN, version + '')
      );
  }, [version]);

  const afterDeleteAction = useCallback(
    (isSoftDelete?: boolean) =>
      isSoftDelete ? handleToggleDelete() : history.push('/'),
    []
  );

  const afterDomainUpdateAction = useCallback((data) => {
    const updatedData = data as SearchIndex;

    setSearchIndexDetails((data) => ({
      ...(data ?? updatedData),
      version: updatedData.version,
    }));
  }, []);

  useEffect(() => {
    if (entityFQN) {
      fetchResourcePermission(entityFQN);
    }
  }, [entityFQN]);

  useEffect(() => {
    if (viewPermission) {
      fetchSearchIndexDetails();
      getEntityFeedCount();
    }
  }, [searchIndexFQN, viewPermission]);

  const onThreadPanelClose = () => {
    setThreadLink('');
  };

  const createThread = async (data: CreateThread) => {
    try {
      await postThread(data);
      getEntityFeedCount();
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.create-entity-error', {
          entity: t('label.conversation'),
        })
      );
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!viewPermission) {
    return <ErrorPlaceHolder type={ERROR_PLACEHOLDER_TYPE.PERMISSION} />;
  }

  if (!searchIndexDetails) {
    return <ErrorPlaceHolder className="m-0" />;
  }

  return (
    <PageLayoutV1
      className="bg-white"
      pageTitle={t('label.entity-detail-plural', {
        entity: t('label.search-index'),
      })}
      title={t('label.entity-detail-plural', {
        entity: t('label.search-index'),
      })}>
      <Row gutter={[0, 12]}>
        <Col className="p-x-lg" data-testid="entity-page-header" span={24}>
          <DataAssetsHeader
            afterDeleteAction={afterDeleteAction}
            afterDomainUpdateAction={afterDomainUpdateAction}
            dataAsset={searchIndexDetails}
            entityType={EntityType.SEARCH_INDEX}
            permissions={searchIndexPermissions}
            onDisplayNameUpdate={handleDisplayNameUpdate}
            onFollowClick={handleFollowSearchIndex}
            onOwnerUpdate={handleUpdateOwner}
            onRestoreDataAsset={handleRestoreSearchIndex}
            onTierUpdate={onTierUpdate}
            onVersionClick={versionHandler}
          />
        </Col>

        <Col span={24}>
          <Tabs
            destroyInactiveTabPane
            activeKey={activeTab ?? EntityTabs.FIELDS}
            className="entity-details-page-tabs"
            data-testid="tabs"
            items={tabs}
            onChange={handleTabChange}
          />
        </Col>

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
      </Row>
    </PageLayoutV1>
  );
}

export default SearchIndexDetailsPage;
