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
import { Card, Col, Row, Space, Tabs } from 'antd';
import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import { EntityTags } from 'Models';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import { useActivityFeedProvider } from '../../components/ActivityFeed/ActivityFeedProvider/ActivityFeedProvider';
import { ActivityFeedTab } from '../../components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.component';
import ActivityThreadPanel from '../../components/ActivityFeed/ActivityThreadPanel/ActivityThreadPanel';
import { CustomPropertyTable } from '../../components/common/CustomPropertyTable/CustomPropertyTable';
import DescriptionV1 from '../../components/common/description/DescriptionV1';
import ErrorPlaceHolder from '../../components/common/error-with-placeholder/ErrorPlaceHolder';
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
import { withActivityFeed } from '../../components/router/withActivityFeed';
import SchemaEditor from '../../components/schema-editor/SchemaEditor';
import { SourceType } from '../../components/searched-data/SearchedData.interface';
import { QueryVote } from '../../components/TableQueries/TableQueries.interface';
import TabsLabel from '../../components/TabsLabel/TabsLabel.component';
import TagsContainerV2 from '../../components/Tag/TagsContainerV2/TagsContainerV2';
import { DisplayType } from '../../components/Tag/TagsViewer/TagsViewer.interface';
import {
  getStoredProcedureDetailPath,
  getVersionPath,
} from '../../constants/constants';
import { CSMode } from '../../enums/codemirror.enum';
import { ERROR_PLACEHOLDER_TYPE } from '../../enums/common.enum';
import { EntityTabs, EntityType } from '../../enums/entity.enum';
import {
  CreateThread,
  ThreadType,
} from '../../generated/api/feed/createThread';
import { Tag } from '../../generated/entity/classification/tag';
import {
  StoredProcedure,
  StoredProcedureCodeObject,
} from '../../generated/entity/data/storedProcedure';
import {
  LabelType,
  State,
  TagLabel,
  TagSource,
} from '../../generated/type/tagLabel';
import { postThread } from '../../rest/feedsAPI';
import {
  addStoredProceduresFollower,
  getStoredProceduresDetailsByFQN,
  patchStoredProceduresDetails,
  removeStoredProceduresFollower,
  restoreStoredProcedures,
  updateStoredProcedureVotes,
} from '../../rest/storedProceduresAPI';
import {
  addToRecentViewed,
  getCurrentUserId,
  getFeedCounts,
  sortTagsCaseInsensitive,
} from '../../utils/CommonUtils';
import { getEntityName } from '../../utils/EntityUtils';
import { DEFAULT_ENTITY_PERMISSION } from '../../utils/PermissionsUtils';
import { STORED_PROCEDURE_DEFAULT_FIELDS } from '../../utils/StoredProceduresUtils';
import { getTagsWithoutTier, getTierTags } from '../../utils/TableUtils';
import { updateTierTag } from '../../utils/TagsUtils';
import { showErrorToast, showSuccessToast } from '../../utils/ToastUtils';

const StoredProcedurePage = () => {
  const { t } = useTranslation();
  const USER_ID = getCurrentUserId();
  const history = useHistory();
  const { fqn: storedProcedureFQN, tab: activeTab = EntityTabs.CODE } =
    useParams<{ fqn: string; tab: string }>();

  const { getEntityPermissionByFqn } = usePermissionProvider();
  const { postFeed, deleteFeed, updateFeed } = useActivityFeedProvider();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [storedProcedure, setStoredProcedure] = useState<StoredProcedure>();
  const [storedProcedurePermissions, setStoredProcedurePermissions] =
    useState<OperationPermission>(DEFAULT_ENTITY_PERMISSION);
  const [isEdit, setIsEdit] = useState(false);

  const [feedCount, setFeedCount] = useState<number>(0);
  const [threadLink, setThreadLink] = useState<string>('');

  const [threadType, setThreadType] = useState<ThreadType>(
    ThreadType.Conversation
  );

  const {
    id: storedProcedureId = '',
    followers,
    owner,
    tags,
    tier,
    version,
    code,
    description,
    deleted,
    entityName,
    entityFQN,
  } = useMemo(() => {
    return {
      ...storedProcedure,
      tier: getTierTags(storedProcedure?.tags ?? []),
      tags: getTagsWithoutTier(storedProcedure?.tags ?? []),
      entityName: getEntityName(storedProcedure),
      entityFQN: storedProcedure?.fullyQualifiedName ?? '',
      code:
        (storedProcedure?.storedProcedureCode as StoredProcedureCodeObject)
          ?.code ?? '',
    };
  }, [storedProcedure]);

  const { isFollowing } = useMemo(() => {
    return {
      isFollowing: followers?.some(({ id }) => id === USER_ID),
    };
  }, [followers, USER_ID]);

  const fetchResourcePermission = useCallback(async () => {
    try {
      const permission = await getEntityPermissionByFqn(
        ResourceEntity.STORED_PROCEDURE,
        storedProcedureFQN
      );

      setStoredProcedurePermissions(permission);
    } catch (error) {
      showErrorToast(
        t('server.fetch-entity-permissions-error', {
          entity: t('label.resource-permission-lowercase'),
        })
      );
    } finally {
      setIsLoading(false);
    }
  }, [getEntityPermissionByFqn]);

  const getEntityFeedCount = () => {
    getFeedCounts(
      EntityType.STORED_PROCEDURE,
      storedProcedureFQN,
      setFeedCount
    );
  };

  const fetchStoredProcedureDetails = async () => {
    setIsLoading(true);
    try {
      const response = await getStoredProceduresDetailsByFQN(
        storedProcedureFQN,
        STORED_PROCEDURE_DEFAULT_FIELDS
      );

      setStoredProcedure(response);

      addToRecentViewed({
        displayName: getEntityName(response),
        entityType: EntityType.STORED_PROCEDURE,
        fqn: response.fullyQualifiedName ?? '',
        serviceType: response.serviceType,
        timestamp: 0,
        id: response.id ?? '',
      });
    } catch (error) {
      // Error here
    } finally {
      setIsLoading(false);
    }
  };

  const versionHandler = useCallback(() => {
    version &&
      history.push(
        getVersionPath(
          EntityType.STORED_PROCEDURE,
          storedProcedureFQN,
          version + ''
        )
      );
  }, [storedProcedureFQN, version]);

  const saveUpdatedStoredProceduresData = useCallback(
    (updatedData: StoredProcedure) => {
      if (!storedProcedure) {
        return updatedData;
      }
      const jsonPatch = compare(storedProcedure ?? '', updatedData);

      return patchStoredProceduresDetails(storedProcedureId ?? '', jsonPatch);
    },
    [storedProcedure, storedProcedureId]
  );

  const handleStoreProcedureUpdate = async (
    updatedData: StoredProcedure,
    key: keyof StoredProcedure
  ) => {
    try {
      const res = await saveUpdatedStoredProceduresData(updatedData);

      setStoredProcedure((previous) => {
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

  const followEntity = useCallback(async () => {
    try {
      const res = await addStoredProceduresFollower(storedProcedureId, USER_ID);
      const { newValue } = res.changeDescription.fieldsAdded[0];
      const newFollowers = [...(followers ?? []), ...newValue];
      setStoredProcedure((prev) => {
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
          entity: getEntityName(storedProcedure),
        })
      );
    }
  }, [USER_ID, followers, storedProcedure, storedProcedureId]);

  const unFollowEntity = useCallback(async () => {
    try {
      const res = await removeStoredProceduresFollower(
        storedProcedureId,
        USER_ID
      );
      const { oldValue } = res.changeDescription.fieldsDeleted[0];
      setStoredProcedure((pre) => {
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
          entity: getEntityName(storedProcedure),
        })
      );
    }
  }, [USER_ID, storedProcedureId]);

  const handleDisplayNameUpdate = async (data: EntityName) => {
    if (!storedProcedure) {
      return;
    }
    const updatedData = { ...storedProcedure, displayName: data.displayName };
    await handleStoreProcedureUpdate(updatedData, 'displayName');
  };

  const handleFollow = useCallback(async () => {
    isFollowing ? await unFollowEntity() : await followEntity();
  }, [isFollowing]);

  const handleUpdateOwner = useCallback(
    async (newOwner?: StoredProcedure['owner']) => {
      if (!storedProcedure) {
        return;
      }
      const updatedEntityDetails = {
        ...storedProcedure,
        owner: newOwner
          ? {
              ...owner,
              ...newOwner,
            }
          : undefined,
      };
      await handleStoreProcedureUpdate(updatedEntityDetails, 'owner');
    },
    [owner, storedProcedure]
  );

  const handleToggleDelete = () => {
    setStoredProcedure((prev) => {
      if (!prev) {
        return prev;
      }

      return { ...prev, deleted: !prev?.deleted };
    });
  };

  const handleRestoreStoredProcedures = async () => {
    try {
      await restoreStoredProcedures(storedProcedureId);
      showSuccessToast(
        t('message.restore-entities-success', {
          entity: t('label.stored-procedure-plural'),
        }),
        2000
      );
      handleToggleDelete();
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('message.restore-entities-error', {
          entity: t('label.stored-procedure-plural'),
        })
      );
    }
  };

  const onTierUpdate = useCallback(
    async (newTier?: Tag) => {
      if (storedProcedure) {
        const tierTag: StoredProcedure['tags'] = updateTierTag(tags, newTier);
        const updatedDetails = {
          ...storedProcedure,
          tags: tierTag,
        };

        await handleStoreProcedureUpdate(updatedDetails, 'tags');
      }
    },
    [storedProcedure, tags]
  );

  const afterDeleteAction = useCallback(
    (isSoftDelete?: boolean) =>
      isSoftDelete ? handleToggleDelete() : history.push('/'),
    []
  );

  const afterDomainUpdateAction = useCallback((data) => {
    const updatedData = data as StoredProcedure;

    setStoredProcedure((data) => ({
      ...(data ?? updatedData),
      version: updatedData.version,
    }));
  }, []);

  const handleTabChange = (activeKey: EntityTabs) => {
    if (activeKey !== activeTab) {
      history.push(getStoredProcedureDetailPath(storedProcedureFQN, activeKey));
    }
  };

  const onDescriptionEdit = (): void => {
    setIsEdit(true);
  };
  const onCancel = () => {
    setIsEdit(false);
  };

  const onDescriptionUpdate = async (updatedHTML: string) => {
    if (description !== updatedHTML && storedProcedure) {
      const updatedData = {
        ...storedProcedure,
        description: updatedHTML,
      };
      try {
        await handleStoreProcedureUpdate(updatedData, 'description');
      } catch (error) {
        showErrorToast(error as AxiosError);
      } finally {
        setIsEdit(false);
      }
    } else {
      setIsEdit(false);
    }
  };

  const onThreadLinkSelect = (link: string, threadType?: ThreadType) => {
    setThreadLink(link);
    if (threadType) {
      setThreadType(threadType);
    }
  };

  const handleTagSelection = async (selectedTags: EntityTags[]) => {
    const updatedTags: TagLabel[] | undefined = selectedTags?.map((tag) => ({
      source: tag.source,
      tagFQN: tag.tagFQN,
      labelType: LabelType.Manual,
      state: State.Confirmed,
    }));

    if (updatedTags && storedProcedure) {
      const updatedTags = [...(tier ? [tier] : []), ...selectedTags];
      const updatedData = { ...storedProcedure, tags: updatedTags };
      await handleStoreProcedureUpdate(updatedData, 'tags');
    }
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

  const onThreadPanelClose = () => {
    setThreadLink('');
  };

  const onExtensionUpdate = useCallback(
    async (updatedData: StoredProcedure) => {
      storedProcedure &&
        (await saveUpdatedStoredProceduresData({
          ...storedProcedure,
          extension: updatedData.extension,
        }));
    },
    [saveUpdatedStoredProceduresData, storedProcedure]
  );

  const tabs = useMemo(
    () => [
      {
        label: (
          <TabsLabel
            data-testid={EntityTabs.CODE}
            id={EntityTabs.CODE}
            name={t('label.code')}
          />
        ),
        key: EntityTabs.CODE,
        children: (
          <Row gutter={[0, 16]} wrap={false}>
            <Col
              className="p-t-sm m-l-lg tab-content-height p-r-lg"
              flex="auto">
              <div className="d-flex flex-col gap-4">
                <DescriptionV1
                  description={description}
                  entityFqn={storedProcedureFQN}
                  entityName={entityName}
                  entityType={EntityType.STORED_PROCEDURE}
                  hasEditAccess={
                    storedProcedurePermissions.EditAll ||
                    storedProcedurePermissions.EditDescription
                  }
                  isEdit={isEdit}
                  isReadOnly={deleted}
                  owner={owner}
                  onCancel={onCancel}
                  onDescriptionEdit={onDescriptionEdit}
                  onDescriptionUpdate={onDescriptionUpdate}
                  onThreadLinkSelect={onThreadLinkSelect}
                />

                <Card className="m-b-md" data-testid="code-component">
                  <SchemaEditor
                    editorClass="custom-code-mirror-theme full-screen-editor-height"
                    mode={{ name: CSMode.SQL }}
                    options={{
                      styleActiveLine: false,
                      readOnly: 'nocursor',
                    }}
                    value={code}
                  />
                </Card>
              </div>
            </Col>
            <Col
              className="entity-tag-right-panel-container"
              data-testid="entity-right-panel"
              flex="320px">
              <Space className="w-full" direction="vertical" size="large">
                <TagsContainerV2
                  displayType={DisplayType.READ_MORE}
                  entityFqn={storedProcedureFQN}
                  entityType={EntityType.STORED_PROCEDURE}
                  permission={
                    (storedProcedurePermissions.EditAll ||
                      storedProcedurePermissions.EditTags) &&
                    !deleted
                  }
                  selectedTags={tags}
                  tagType={TagSource.Classification}
                  onSelectionChange={handleTagSelection}
                  onThreadLinkSelect={onThreadLinkSelect}
                />

                <TagsContainerV2
                  displayType={DisplayType.READ_MORE}
                  entityFqn={storedProcedureFQN}
                  entityType={EntityType.STORED_PROCEDURE}
                  permission={
                    (storedProcedurePermissions.EditAll ||
                      storedProcedurePermissions.EditTags) &&
                    !deleted
                  }
                  selectedTags={tags}
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
            entityType={EntityType.STORED_PROCEDURE}
            fqn={entityFQN}
            onFeedUpdate={getEntityFeedCount}
            onUpdateEntityDetails={fetchStoredProcedureDetails}
          />
        ),
      },
      {
        label: <TabsLabel id={EntityTabs.LINEAGE} name={t('label.lineage')} />,
        key: EntityTabs.LINEAGE,
        children: (
          <EntityLineageComponent
            deleted={deleted}
            entity={storedProcedure as SourceType}
            entityType={EntityType.STORED_PROCEDURE}
            hasEditAccess={
              storedProcedurePermissions.EditAll ||
              storedProcedurePermissions.EditLineage
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
            entityType={EntityType.STORED_PROCEDURE}
            handleExtensionUpdate={onExtensionUpdate}
            hasEditAccess={
              storedProcedurePermissions.EditAll ||
              storedProcedurePermissions.EditCustomFields
            }
            hasPermission={storedProcedurePermissions.ViewAll}
          />
        ),
      },
    ],
    [
      code,
      tags,
      isEdit,
      deleted,
      feedCount,
      activeTab,
      entityFQN,
      entityName,
      description,
      storedProcedure,
      storedProcedureFQN,
      storedProcedurePermissions,
    ]
  );

  const updateVote = async (data: QueryVote, id: string) => {
    try {
      await updateStoredProcedureVotes(id, data);
      const details = await getStoredProceduresDetailsByFQN(
        storedProcedureFQN,
        STORED_PROCEDURE_DEFAULT_FIELDS
      );
      setStoredProcedure(details);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  useEffect(() => {
    if (storedProcedureFQN) {
      fetchResourcePermission();
    }
  }, [storedProcedureFQN]);

  useEffect(() => {
    if (
      storedProcedurePermissions.ViewAll ||
      storedProcedurePermissions.ViewBasic
    ) {
      fetchStoredProcedureDetails();
      getEntityFeedCount();
    }
  }, [storedProcedureFQN, storedProcedurePermissions]);

  if (isLoading) {
    return <Loader />;
  }

  if (
    !(
      storedProcedurePermissions.ViewAll || storedProcedurePermissions.ViewBasic
    )
  ) {
    return <ErrorPlaceHolder type={ERROR_PLACEHOLDER_TYPE.PERMISSION} />;
  }

  if (!storedProcedure) {
    return <ErrorPlaceHolder />;
  }

  return (
    <PageLayoutV1
      className="bg-white"
      pageTitle={t('label.stored-procedure-plural')}>
      <Row gutter={[0, 12]}>
        <Col className="p-x-lg" data-testid="entity-page-header" span={24}>
          <DataAssetsHeader
            afterDeleteAction={afterDeleteAction}
            afterDomainUpdateAction={afterDomainUpdateAction}
            dataAsset={storedProcedure}
            entityType={EntityType.STORED_PROCEDURE}
            permissions={storedProcedurePermissions}
            onDisplayNameUpdate={handleDisplayNameUpdate}
            onFollowClick={handleFollow}
            onOwnerUpdate={handleUpdateOwner}
            onRestoreDataAsset={handleRestoreStoredProcedures}
            onTierUpdate={onTierUpdate}
            onUpdateVote={updateVote}
            onVersionClick={versionHandler}
          />
        </Col>

        {/* Entity Tabs */}
        <Col span={24}>
          <Tabs
            destroyInactiveTabPane
            activeKey={activeTab ?? EntityTabs.CODE}
            className="entity-details-page-tabs"
            data-testid="tabs"
            items={tabs}
            onChange={(activeKey: string) =>
              handleTabChange(activeKey as EntityTabs)
            }
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
};

export default withActivityFeed(StoredProcedurePage);
