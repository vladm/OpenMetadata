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

import { Col, Row, Space, Tabs } from 'antd';
import { AxiosError } from 'axios';
import { EntityTags } from 'Models';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import { useActivityFeedProvider } from '../../components/ActivityFeed/ActivityFeedProvider/ActivityFeedProvider';
import { ActivityFeedTab } from '../../components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.component';
import DescriptionV1 from '../../components/common/description/DescriptionV1';
import ErrorPlaceHolder from '../../components/common/error-with-placeholder/ErrorPlaceHolder';
import QueryViewer from '../../components/common/QueryViewer/QueryViewer.component';
import PageLayoutV1 from '../../components/containers/PageLayoutV1';
import { DataAssetsHeader } from '../../components/DataAssets/DataAssetsHeader/DataAssetsHeader.component';
import DataProductsContainer from '../../components/DataProductsContainer/DataProductsContainer.component';
import EntityLineageComponent from '../../components/Entity/EntityLineage/EntityLineage.component';
import { EntityName } from '../../components/Modals/EntityNameModal/EntityNameModal.interface';
import { withActivityFeed } from '../../components/router/withActivityFeed';
import SampleDataWithMessages from '../../components/SampleDataWithMessages/SampleDataWithMessages';
import TabsLabel from '../../components/TabsLabel/TabsLabel.component';
import TagsContainerV2 from '../../components/Tag/TagsContainerV2/TagsContainerV2';
import { DisplayType } from '../../components/Tag/TagsViewer/TagsViewer.interface';
import { getTopicDetailsPath } from '../../constants/constants';
import { ERROR_PLACEHOLDER_TYPE } from '../../enums/common.enum';
import { EntityTabs, EntityType } from '../../enums/entity.enum';
import { Tag } from '../../generated/entity/classification/tag';
import { Topic } from '../../generated/entity/data/topic';
import { DataProduct } from '../../generated/entity/domains/dataProduct';
import { ThreadType } from '../../generated/entity/feed/thread';
import { TagLabel } from '../../generated/type/schema';
import { LabelType, State, TagSource } from '../../generated/type/tagLabel';
import { restoreTopic } from '../../rest/topicsAPI';
import { getCurrentUserId, getFeedCounts } from '../../utils/CommonUtils';
import {
  getEntityName,
  getEntityReferenceFromEntity,
} from '../../utils/EntityUtils';
import { getDecodedFqn } from '../../utils/StringsUtils';
import { getTagsWithoutTier, getTierTags } from '../../utils/TableUtils';
import { updateTierTag } from '../../utils/TagsUtils';
import { showErrorToast, showSuccessToast } from '../../utils/ToastUtils';
import ActivityThreadPanel from '../ActivityFeed/ActivityThreadPanel/ActivityThreadPanel';
import { CustomPropertyTable } from '../common/CustomPropertyTable/CustomPropertyTable';
import { TopicDetailsProps } from './TopicDetails.interface';
import TopicSchemaFields from './TopicSchema/TopicSchema';

const TopicDetails: React.FC<TopicDetailsProps> = ({
  updateTopicDetailsState,
  topicDetails,
  fetchTopic,
  followTopicHandler,
  unFollowTopicHandler,
  versionHandler,
  createThread,
  onTopicUpdate,
  topicPermissions,
  handleToggleDelete,
  onUpdateVote,
}: TopicDetailsProps) => {
  const { t } = useTranslation();
  const { postFeed, deleteFeed, updateFeed } = useActivityFeedProvider();
  const { fqn: topicFQN, tab: activeTab = EntityTabs.SCHEMA } =
    useParams<{ fqn: string; tab: EntityTabs }>();
  const history = useHistory();
  const [isEdit, setIsEdit] = useState(false);
  const [threadLink, setThreadLink] = useState<string>('');
  const [feedCount, setFeedCount] = useState<number>(0);

  const [threadType, setThreadType] = useState<ThreadType>(
    ThreadType.Conversation
  );

  const {
    owner,
    description,
    followers = [],
    entityName,
    topicTags,
    tier,
  } = useMemo(() => {
    return {
      ...topicDetails,
      tier: getTierTags(topicDetails.tags ?? []),
      topicTags: getTagsWithoutTier(topicDetails.tags ?? []),
      entityName: getEntityName(topicDetails),
    };
  }, [topicDetails]);

  const { isFollowing } = useMemo(() => {
    return {
      isFollowing: followers?.some(({ id }) => id === getCurrentUserId()),
      followersCount: followers?.length ?? 0,
    };
  }, [followers]);

  const followTopic = async () => {
    isFollowing ? await unFollowTopicHandler() : await followTopicHandler();
  };

  const handleUpdateDisplayName = async (data: EntityName) => {
    const updatedData = {
      ...topicDetails,
      displayName: data.displayName,
    };
    await onTopicUpdate(updatedData, 'displayName');
  };
  const onExtensionUpdate = async (updatedData: Topic) => {
    await onTopicUpdate(
      { ...topicDetails, extension: updatedData.extension },
      'extension'
    );
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

  const handleSchemaFieldsUpdate = async (
    updatedMessageSchema: Topic['messageSchema']
  ) => {
    try {
      await onTopicUpdate(
        {
          ...topicDetails,
          messageSchema: updatedMessageSchema,
        },
        'messageSchema'
      );
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const handleRestoreTopic = async () => {
    try {
      await restoreTopic(topicDetails.id);
      showSuccessToast(
        t('message.restore-entities-success', {
          entity: t('label.topic'),
        }),
        2000
      );
      handleToggleDelete();
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('message.restore-entities-error', {
          entity: t('label.topic'),
        })
      );
    }
  };

  const handleTabChange = (activeKey: string) => {
    if (activeKey !== activeTab) {
      history.push(getTopicDetailsPath(getDecodedFqn(topicFQN), activeKey));
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
      const updatedTopicDetails = {
        ...topicDetails,
        description: updatedHTML,
      };
      try {
        await onTopicUpdate(updatedTopicDetails, 'description');
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
    async (newOwner?: Topic['owner']) => {
      const updatedTopicDetails = {
        ...topicDetails,
        owner: newOwner
          ? {
              ...owner,
              ...newOwner,
            }
          : undefined,
      };
      await onTopicUpdate(updatedTopicDetails, 'owner');
    },
    [owner]
  );

  const onTierUpdate = (newTier?: Tag) => {
    const tierTag = updateTierTag(topicDetails?.tags ?? [], newTier);
    const updatedTopicDetails = {
      ...topicDetails,
      tags: tierTag,
    };

    return onTopicUpdate(updatedTopicDetails, 'tags');
  };

  const handleTagSelection = async (selectedTags: EntityTags[]) => {
    const updatedTags: TagLabel[] | undefined = selectedTags?.map((tag) => ({
      source: tag.source,
      tagFQN: tag.tagFQN,
      labelType: LabelType.Manual,
      state: State.Confirmed,
    }));

    if (updatedTags && topicDetails) {
      const updatedTags = [...(tier ? [tier] : []), ...selectedTags];
      const updatedTopic = { ...topicDetails, tags: updatedTags };
      await onTopicUpdate(updatedTopic, 'tags');
    }
  };

  const onDataProductsUpdate = async (updatedData: DataProduct[]) => {
    const dataProductsEntity = updatedData?.map((item) => {
      return getEntityReferenceFromEntity(item, EntityType.DATA_PRODUCT);
    });

    const updatedTopicDetails = {
      ...topicDetails,
      dataProducts: dataProductsEntity,
    };

    await onTopicUpdate(updatedTopicDetails, 'dataProducts');
  };

  const getEntityFeedCount = () => {
    getFeedCounts(EntityType.TOPIC, topicFQN, setFeedCount);
  };

  const afterDeleteAction = useCallback(
    (isSoftDelete?: boolean) =>
      isSoftDelete ? handleToggleDelete : history.push('/'),
    []
  );

  useEffect(() => {
    if (topicPermissions.ViewAll || topicPermissions.ViewBasic) {
      getEntityFeedCount();
    }
  }, [topicPermissions, topicFQN]);

  const tabs = useMemo(
    () => [
      {
        label: <TabsLabel id={EntityTabs.SCHEMA} name={t('label.schema')} />,
        key: EntityTabs.SCHEMA,
        children: (
          <Row gutter={[0, 16]} wrap={false}>
            <Col className="p-t-sm m-x-lg" flex="auto">
              <div className="d-flex flex-col gap-4">
                <DescriptionV1
                  description={topicDetails.description}
                  entityFqn={topicFQN}
                  entityName={entityName}
                  entityType={EntityType.TOPIC}
                  hasEditAccess={
                    topicPermissions.EditAll || topicPermissions.EditDescription
                  }
                  isEdit={isEdit}
                  isReadOnly={topicDetails.deleted}
                  owner={topicDetails.owner}
                  onCancel={onCancel}
                  onDescriptionEdit={onDescriptionEdit}
                  onDescriptionUpdate={onDescriptionUpdate}
                  onThreadLinkSelect={onThreadLinkSelect}
                />
                <TopicSchemaFields
                  entityFqn={topicFQN}
                  hasDescriptionEditAccess={
                    topicPermissions.EditAll || topicPermissions.EditDescription
                  }
                  hasTagEditAccess={
                    topicPermissions.EditAll || topicPermissions.EditTags
                  }
                  isReadOnly={Boolean(topicDetails.deleted)}
                  messageSchema={topicDetails.messageSchema}
                  onThreadLinkSelect={onThreadLinkSelect}
                  onUpdate={handleSchemaFieldsUpdate}
                />
              </div>
            </Col>
            <Col
              className="entity-tag-right-panel-container"
              data-testid="entity-right-panel"
              flex="320px">
              <Space className="w-full" direction="vertical" size="large">
                <DataProductsContainer
                  activeDomain={topicDetails?.domain}
                  dataProducts={topicDetails?.dataProducts ?? []}
                  hasPermission={
                    topicPermissions.EditAll && !topicDetails.deleted
                  }
                  onSave={onDataProductsUpdate}
                />

                <TagsContainerV2
                  displayType={DisplayType.READ_MORE}
                  entityFqn={topicFQN}
                  entityType={EntityType.TOPIC}
                  permission={
                    (topicPermissions.EditAll || topicPermissions.EditTags) &&
                    !topicDetails.deleted
                  }
                  selectedTags={topicTags}
                  tagType={TagSource.Classification}
                  onSelectionChange={handleTagSelection}
                  onThreadLinkSelect={onThreadLinkSelect}
                />

                <TagsContainerV2
                  displayType={DisplayType.READ_MORE}
                  entityFqn={topicFQN}
                  entityType={EntityType.TOPIC}
                  permission={
                    (topicPermissions.EditAll || topicPermissions.EditTags) &&
                    !topicDetails.deleted
                  }
                  selectedTags={topicTags}
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
            entityType={EntityType.TOPIC}
            fqn={topicDetails?.fullyQualifiedName ?? ''}
            onFeedUpdate={getEntityFeedCount}
            onUpdateEntityDetails={fetchTopic}
          />
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
          topicPermissions.ViewAll || topicPermissions.ViewSampleData
        ) ? (
          <div className="m-t-xlg">
            <ErrorPlaceHolder type={ERROR_PLACEHOLDER_TYPE.PERMISSION} />
          </div>
        ) : (
          <SampleDataWithMessages
            entityId={topicDetails.id}
            entityType={EntityType.TOPIC}
          />
        ),
      },
      {
        label: <TabsLabel id={EntityTabs.CONFIG} name={t('label.config')} />,
        key: EntityTabs.CONFIG,
        children: (
          <QueryViewer
            sqlQuery={JSON.stringify(topicDetails.topicConfig)}
            title={t('label.config')}
          />
        ),
      },
      {
        label: <TabsLabel id={EntityTabs.LINEAGE} name={t('label.lineage')} />,
        key: EntityTabs.LINEAGE,
        children: (
          <EntityLineageComponent
            entity={topicDetails}
            entityType={EntityType.TOPIC}
            hasEditAccess={
              topicPermissions.EditAll || topicPermissions.EditLineage
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
            entityType={EntityType.TOPIC}
            handleExtensionUpdate={onExtensionUpdate}
            hasEditAccess={
              topicPermissions.EditAll || topicPermissions.EditCustomFields
            }
            hasPermission={topicPermissions.ViewAll}
          />
        ),
      },
    ],

    [
      activeTab,
      feedCount,
      topicDetails,
      topicPermissions,
      isEdit,
      entityName,
      topicFQN,
      topicPermissions,
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
            afterDomainUpdateAction={updateTopicDetailsState}
            dataAsset={topicDetails}
            entityType={EntityType.TOPIC}
            permissions={topicPermissions}
            onDisplayNameUpdate={handleUpdateDisplayName}
            onFollowClick={followTopic}
            onOwnerUpdate={onOwnerUpdate}
            onRestoreDataAsset={handleRestoreTopic}
            onTierUpdate={onTierUpdate}
            onUpdateVote={onUpdateVote}
            onVersionClick={versionHandler}
          />
        </Col>
        <Col span={24}>
          <Tabs
            destroyInactiveTabPane
            activeKey={activeTab ?? EntityTabs.SCHEMA}
            className="entity-details-page-tabs"
            data-testid="tabs"
            items={tabs}
            onChange={handleTabChange}
          />
        </Col>
      </Row>

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

export default withActivityFeed<TopicDetailsProps>(TopicDetails);
