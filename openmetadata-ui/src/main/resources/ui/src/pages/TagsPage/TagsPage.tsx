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

import { Badge, Button, Space, Tooltip, Typography } from 'antd';
import { AxiosError } from 'axios';
import classNames from 'classnames';
import { compare } from 'fast-json-patch';
import { isUndefined } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import { ReactComponent as PlusIcon } from '../../assets/svg/plus-primary.svg';
import ClassificationDetails from '../../components/ClassificationDetails/ClassificationDetails';
import ErrorPlaceHolder from '../../components/common/error-with-placeholder/ErrorPlaceHolder';
import LeftPanelCard from '../../components/common/LeftPanelCard/LeftPanelCard';
import { PagingHandlerParams } from '../../components/common/next-previous/NextPrevious.interface';
import PageLayoutV1 from '../../components/containers/PageLayoutV1';
import Loader from '../../components/Loader/Loader';
import EntityDeleteModal from '../../components/Modals/EntityDeleteModal/EntityDeleteModal';
import { usePermissionProvider } from '../../components/PermissionProvider/PermissionProvider';
import {
  OperationPermission,
  ResourceEntity,
} from '../../components/PermissionProvider/PermissionProvider.interface';
import TagsLeftPanelSkeleton from '../../components/Skeleton/Tags/TagsLeftPanelSkeleton.component';
import { HTTP_STATUS_CODE } from '../../constants/auth.constants';
import {
  INITIAL_PAGING_VALUE,
  PAGE_SIZE,
  TIER_CATEGORY,
} from '../../constants/constants';
import { LOADING_STATE } from '../../enums/common.enum';
import { CreateClassification } from '../../generated/api/classification/createClassification';
import {
  CreateTag,
  ProviderType,
} from '../../generated/api/classification/createTag';
import { Classification } from '../../generated/entity/classification/classification';
import { Tag } from '../../generated/entity/classification/tag';
import { Operation } from '../../generated/entity/policies/accessControl/rule';
import { Paging } from '../../generated/type/paging';
import {
  createClassification,
  createTag,
  deleteTag,
  getAllClassifications,
  getClassificationByName,
  getTags,
  patchClassification,
  patchTag,
} from '../../rest/tagAPI';
import { getCountBadge, getEntityDeleteMessage } from '../../utils/CommonUtils';
import { getEntityName } from '../../utils/EntityUtils';
import {
  checkPermission,
  DEFAULT_ENTITY_PERMISSION,
} from '../../utils/PermissionsUtils';
import { getTagPath } from '../../utils/RouterUtils';
import { getDecodedFqn, getErrorText } from '../../utils/StringsUtils';
import { showErrorToast } from '../../utils/ToastUtils';
import TagsForm from './TagsForm';
import { DeleteTagsType, SubmitProps } from './TagsPage.interface';

const TagsPage = () => {
  const { getEntityPermission, permissions } = usePermissionProvider();
  const history = useHistory();
  const { fqn: tagCategoryName } = useParams<{ fqn: string }>();
  const [classifications, setClassifications] = useState<Array<Classification>>(
    []
  );
  const [currentClassification, setCurrentClassification] =
    useState<Classification>();
  const [isEditClassification, setIsEditClassification] =
    useState<boolean>(false);
  const [isAddingClassification, setIsAddingClassification] =
    useState<boolean>(false);
  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);
  const [editTag, setEditTag] = useState<Tag>();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdateLoading, setIsUpdateLoading] = useState<boolean>(false);

  const [deleteTags, setDeleteTags] = useState<DeleteTagsType>({
    data: undefined,
    state: false,
  });
  const [classificationPermissions, setClassificationPermissions] =
    useState<OperationPermission>(DEFAULT_ENTITY_PERMISSION);
  const [currentClassificationName, setCurrentClassificationName] =
    useState<string>('');
  const [tags, setTags] = useState<Tag[]>();
  const [paging, setPaging] = useState<Paging>({} as Paging);
  const [currentPage, setCurrentPage] = useState<number>(INITIAL_PAGING_VALUE);
  const [isTagsLoading, setIsTagsLoading] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState<boolean>(false);

  const { t } = useTranslation();
  const createClassificationPermission = useMemo(
    () =>
      checkPermission(
        Operation.Create,
        ResourceEntity.CLASSIFICATION,
        permissions
      ),
    [permissions]
  );
  const [deleteStatus, setDeleteStatus] = useState<LOADING_STATE>(
    LOADING_STATE.INITIAL
  );

  const isClassificationDisabled = useMemo(
    () => currentClassification?.disabled ?? false,
    [currentClassification?.disabled]
  );

  const isTier = useMemo(
    () => currentClassification?.name === 'Tier',
    [currentClassification]
  );

  const fetchCurrentClassificationPermission = async () => {
    try {
      const response = await getEntityPermission(
        ResourceEntity.CLASSIFICATION,
        currentClassification?.id as string
      );
      setClassificationPermissions(response);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const fetchClassificationChildren = async (
    currentClassificationName: string,
    paging?: Paging
  ) => {
    setIsTagsLoading(true);
    setTags([]);
    try {
      const tagsResponse = await getTags({
        arrQueryFields: ['usageCount'],
        parent: currentClassificationName,
        after: paging?.after,
        before: paging?.before,
        limit: PAGE_SIZE,
      });
      setTags(tagsResponse.data);
      setPaging(tagsResponse.paging);
    } catch (error) {
      const errMsg = getErrorText(
        error as AxiosError,
        t('server.entity-fetch-error', { entity: t('label.tag-plural') })
      );
      showErrorToast(errMsg);
      setError(errMsg);
      setTags([]);
    } finally {
      setIsTagsLoading(false);
    }
  };

  const fetchClassifications = async (setCurrent?: boolean) => {
    setIsLoading(true);

    try {
      const response = await getAllClassifications(['termCount'], 1000);
      setClassifications(response.data);
      if (setCurrent && response.data.length) {
        setCurrentClassification(response.data[0]);
        setCurrentClassificationName(response.data[0].fullyQualifiedName ?? '');

        history.push(getTagPath(response.data[0].fullyQualifiedName));
      }
    } catch (error) {
      const errMsg = getErrorText(
        error as AxiosError,
        t('server.entity-fetch-error', {
          entity: t('label.tag-category-lowercase'),
        })
      );
      showErrorToast(errMsg);
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentClassification = async (fqn: string, update?: boolean) => {
    if (currentClassification?.fullyQualifiedName !== fqn || update) {
      setIsLoading(true);
      try {
        const currentClassification = await getClassificationByName(fqn, [
          'usageCount',
          'termCount',
        ]);
        if (currentClassification) {
          setClassifications((prevClassifications) =>
            prevClassifications.map((data) => {
              if (data.fullyQualifiedName === fqn) {
                return {
                  ...data,
                  termCount: currentClassification.termCount,
                };
              }

              return data;
            })
          );
          setCurrentClassification(currentClassification);
          setCurrentClassificationName(
            currentClassification.fullyQualifiedName ?? ''
          );
          setIsLoading(false);
        } else {
          showErrorToast(t('server.unexpected-response'));
        }
      } catch (err) {
        const errMsg = getErrorText(
          err as AxiosError,
          t('server.entity-fetch-error', {
            entity: t('label.tag-category-lowercase'),
          })
        );
        showErrorToast(errMsg);
        setError(errMsg);
        setCurrentClassification({ name: fqn, description: '' });
        setIsLoading(false);
      }
    }
  };

  const handleCreateClassification = async (data: CreateClassification) => {
    setIsButtonLoading(true);
    try {
      const res = await createClassification(data);
      await fetchClassifications();
      history.push(getTagPath(res.fullyQualifiedName));
    } catch (error) {
      if (
        (error as AxiosError).response?.status === HTTP_STATUS_CODE.CONFLICT
      ) {
        showErrorToast(
          t('server.entity-already-exist', {
            entity: t('label.classification'),
            entityPlural: t('label.classification-lowercase-plural'),
            name: data.name,
          })
        );
      } else {
        showErrorToast(
          error as AxiosError,
          t('server.create-entity-error', {
            entity: t('label.classification-lowercase'),
          })
        );
      }
    } finally {
      setIsAddingClassification(false);
      setIsButtonLoading(false);
    }
  };

  const handleCancel = () => {
    setEditTag(undefined);
    setIsAddingTag(false);
    setIsAddingClassification(false);
  };

  const handleAfterDeleteAction = useCallback(() => {
    if (!isUndefined(currentClassification)) {
      const renamingClassification = [...classifications].filter(
        (data) => data.id !== currentClassification.id
      );
      const updatedCurrentClassification = renamingClassification[0];
      setClassifications(renamingClassification);
      history.push(
        getTagPath(
          updatedCurrentClassification?.fullyQualifiedName ??
            updatedCurrentClassification?.name
        )
      );
    }
  }, [currentClassification, classifications, setClassifications]);

  /**
   * Takes category name and tag id and delete the tag
   * @param categoryName - tag category name
   * @param tagId -  tag id
   */
  const handleDeleteTag = (tagId: string) => {
    deleteTag(tagId)
      .then((res) => {
        if (res) {
          if (currentClassification) {
            setDeleteStatus(LOADING_STATE.SUCCESS);
            setClassifications((prev) =>
              prev.map((item) => {
                if (
                  item.fullyQualifiedName ===
                  currentClassification.fullyQualifiedName
                ) {
                  return {
                    ...item,
                    termCount: (item.termCount ?? 0) - 1,
                  };
                }

                return item;
              })
            );
            fetchClassificationChildren(
              currentClassification?.fullyQualifiedName ?? ''
            );
          }
        } else {
          showErrorToast(
            t('server.delete-entity-error', {
              entity: t('label.tag-lowercase'),
            })
          );
        }
      })
      .catch((err: AxiosError) => {
        showErrorToast(
          err,
          t('server.delete-entity-error', { entity: t('label.tag-lowercase') })
        );
      })
      .finally(() => {
        setDeleteTags({ data: undefined, state: false });
        setDeleteStatus(LOADING_STATE.INITIAL);
      });
  };

  /**
   * It redirects to respective function call based on tag/Classification
   */
  const handleConfirmClick = () => {
    if (deleteTags.data?.id) {
      setDeleteStatus(LOADING_STATE.WAITING);
      handleDeleteTag(deleteTags.data.id);
    }
  };

  const handleUpdateClassification = async (
    updatedClassification: Classification
  ) => {
    if (!isUndefined(currentClassification)) {
      setIsUpdateLoading(true);

      const patchData = compare(currentClassification, updatedClassification);
      try {
        const response = await patchClassification(
          currentClassification?.id ?? '',
          patchData
        );
        setClassifications((prev) =>
          prev.map((item) => {
            if (
              item.fullyQualifiedName ===
              currentClassification.fullyQualifiedName
            ) {
              return {
                ...item,
                ...response,
              };
            }

            return item;
          })
        );
        setCurrentClassification((prev) => ({ ...prev, ...response }));
        if (
          currentClassification?.fullyQualifiedName !==
            updatedClassification.fullyQualifiedName ||
          currentClassification?.name !== updatedClassification.name
        ) {
          history.push(getTagPath(response.fullyQualifiedName));
        }
      } catch (error) {
        if (
          (error as AxiosError).response?.status === HTTP_STATUS_CODE.CONFLICT
        ) {
          showErrorToast(
            t('server.entity-already-exist', {
              entity: t('label.classification'),
              entityPlural: t('label.classification-lowercase-plural'),
              name: updatedClassification.name,
            })
          );
        } else {
          showErrorToast(
            error as AxiosError,
            t('server.entity-updating-error', {
              entity: t('label.classification-lowercase'),
            })
          );
        }
      } finally {
        setIsEditClassification(false);
        setIsUpdateLoading(false);
      }
    }
  };

  const handleCreatePrimaryTag = async (data: CreateTag) => {
    try {
      await createTag({
        ...data,
        classification: currentClassification?.fullyQualifiedName,
      });

      setClassifications((prevClassifications) => {
        return prevClassifications.map((data) => {
          if (
            data.fullyQualifiedName ===
            currentClassification?.fullyQualifiedName
          ) {
            return {
              ...data,
              termCount: (data.termCount ?? 0) + 1,
            };
          }

          return data;
        });
      });

      fetchClassificationChildren(
        currentClassification?.fullyQualifiedName ?? ''
      );
    } catch (error) {
      if (
        (error as AxiosError).response?.status === HTTP_STATUS_CODE.CONFLICT
      ) {
        showErrorToast(
          t('server.entity-already-exist', {
            entity: t('label.tag'),
            entityPlural: t('label.tag-lowercase-plural'),
            name: data.name,
          })
        );
      } else {
        showErrorToast(
          error as AxiosError,
          t('server.create-entity-error', {
            entity: t('label.tag-lowercase'),
          })
        );
      }
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleUpdatePrimaryTag = async (updatedData: Tag) => {
    if (!isUndefined(editTag)) {
      setIsButtonLoading(true);
      const patchData = compare(editTag, updatedData);
      try {
        const response = await patchTag(editTag.id ?? '', patchData);
        setTags((prev) =>
          prev?.map((item) => {
            if (item.id === editTag.id) {
              return { ...item, ...response };
            }

            return item;
          })
        );
      } catch (error) {
        if (
          (error as AxiosError).response?.status === HTTP_STATUS_CODE.CONFLICT
        ) {
          showErrorToast(
            t('server.entity-already-exist', {
              entity: t('label.tag'),
              entityPlural: t('label.tag-lowercase-plural'),
              name: updatedData.name,
            })
          );
        } else {
          showErrorToast(
            error as AxiosError,
            t('server.entity-updating-error', {
              entity: t('label.tag-lowercase'),
            })
          );
        }
      } finally {
        setIsButtonLoading(false);
        handleCancel();
      }
    }
  };

  const handleActionDeleteTag = (record: Tag) => {
    if (currentClassification) {
      setDeleteTags({
        data: {
          id: record.id as string,
          name: record.name,
          categoryName: currentClassification?.fullyQualifiedName,
          isCategory: false,
          status: 'waiting',
        },
        state: true,
      });
    }
  };

  const handleEditTagClick = (selectedTag: Tag) => {
    setIsAddingTag(true);
    setEditTag(selectedTag);
  };

  const handleAddNewTagClick = () => {
    setIsAddingTag(true);
  };

  const handleEditDescriptionClick = () => {
    setIsEditClassification(true);
  };

  const handleCancelEditDescription = () => {
    setIsEditClassification(false);
  };

  useEffect(() => {
    if (currentClassification) {
      fetchCurrentClassificationPermission();
    }
  }, [currentClassification]);

  useEffect(() => {
    /**
     * If ClassificationName is present then fetch that category
     */
    if (tagCategoryName) {
      const isTier = tagCategoryName.startsWith(TIER_CATEGORY);
      fetchCurrentClassification(
        isTier ? TIER_CATEGORY : getDecodedFqn(tagCategoryName)
      );
    }
  }, [tagCategoryName]);

  useEffect(() => {
    /**
     * Fetch all classifications initially
     * Do not set current if we already have currentClassification set
     */
    fetchClassifications(!tagCategoryName);
  }, []);

  useEffect(() => {
    currentClassification &&
      fetchClassificationChildren(
        currentClassification?.fullyQualifiedName ?? ''
      );
  }, [currentClassification?.fullyQualifiedName]);

  const onClickClassifications = (category: Classification) => {
    setCurrentClassification(category);
    setCurrentClassificationName(category.fullyQualifiedName ?? '');
    history.push(getTagPath(category.fullyQualifiedName));
  };

  const handlePageChange = useCallback(
    ({ cursorType, currentPage }: PagingHandlerParams) => {
      if (cursorType) {
        const pagination = {
          [cursorType]: paging[cursorType],
          total: paging.total,
        } as Paging;

        setCurrentPage(currentPage);
        fetchClassificationChildren(currentClassificationName, pagination);
      }
    },
    [fetchClassificationChildren, paging, currentClassificationName]
  );

  const handleAddTagSubmit = (data: SubmitProps) => {
    if (editTag) {
      handleUpdatePrimaryTag({ ...editTag, ...data });
    } else {
      handleCreatePrimaryTag(data);
    }
  };

  const handleCancelClassificationDelete = () =>
    setDeleteTags({ data: undefined, state: false });

  const leftPanelLayout = useMemo(
    () => (
      <LeftPanelCard id="tags">
        <TagsLeftPanelSkeleton loading={isLoading}>
          <div className="p-y-xs" data-testid="data-summary-container">
            <Space
              className="w-full p-x-sm m-b-sm"
              direction="vertical"
              size={12}>
              <Typography.Text className="text-sm font-semibold">
                {t('label.classification-plural')}
              </Typography.Text>
              <Tooltip
                title={
                  !createClassificationPermission &&
                  t('message.no-permission-for-action')
                }>
                <Button
                  block
                  className=" text-primary"
                  data-testid="add-classification"
                  disabled={!createClassificationPermission}
                  icon={<PlusIcon className="anticon" />}
                  onClick={() => {
                    setIsAddingClassification((prevState) => !prevState);
                  }}>
                  <span>
                    {t('label.add-entity', {
                      entity: t('label.classification'),
                    })}
                  </span>
                </Button>
              </Tooltip>
            </Space>

            {classifications.map((category: Classification) => (
              <div
                className={classNames(
                  'align-center content-box cursor-pointer text-grey-body text-body d-flex p-y-xss p-x-sm m-y-xss',
                  {
                    activeCategory:
                      currentClassification?.name === category.name,
                  }
                )}
                data-testid="side-panel-classification"
                key={category.name}
                onClick={() => onClickClassifications(category)}>
                <Typography.Paragraph
                  className="ant-typography-ellipsis-custom self-center m-b-0 tag-category"
                  data-testid="tag-name"
                  ellipsis={{ rows: 1, tooltip: true }}>
                  {getEntityName(category)}
                  {category.disabled && (
                    <Badge
                      className="m-l-xs badge-grey opacity-60"
                      count={t('label.disabled')}
                      data-testid="disabled"
                      size="small"
                    />
                  )}
                </Typography.Paragraph>

                {getCountBadge(
                  category.termCount,
                  'self-center m-l-auto',
                  currentClassification?.fullyQualifiedName ===
                    category.fullyQualifiedName
                )}
              </div>
            ))}
          </div>
        </TagsLeftPanelSkeleton>
      </LeftPanelCard>
    ),
    [
      isLoading,
      classifications,
      currentClassification,
      createClassificationPermission,
    ]
  );

  const createTagsPermission = useMemo(
    () =>
      checkPermission(Operation.Create, ResourceEntity.TAG, permissions) ||
      classificationPermissions.EditAll,
    [permissions, classificationPermissions]
  );

  const editTagsDescriptionPermission = useMemo(
    () =>
      checkPermission(
        Operation.EditDescription,
        ResourceEntity.TAG,
        permissions
      ) || classificationPermissions.EditAll,
    [permissions, classificationPermissions]
  );

  const editTagsDisplayNamePermission = useMemo(
    () =>
      checkPermission(
        Operation.EditDisplayName,
        ResourceEntity.TAG,
        permissions
      ) || classificationPermissions.EditAll,
    [permissions, classificationPermissions]
  );

  const editTagsPermission = useMemo(
    () =>
      checkPermission(Operation.EditAll, ResourceEntity.TAG, permissions) ||
      classificationPermissions.EditAll,
    [permissions, classificationPermissions]
  );

  const tagsFormPermissions = useMemo(
    () => ({
      createTags: createTagsPermission,
      editAll: editTagsPermission,
      editDescription: editTagsDescriptionPermission,
      editDisplayName: editTagsDisplayNamePermission,
    }),
    [
      createTagsPermission,
      editTagsPermission,
      editTagsDescriptionPermission,
      editTagsDisplayNamePermission,
    ]
  );

  const disableEditButton = useMemo(
    () =>
      !(
        editTagsDescriptionPermission ||
        editTagsDisplayNamePermission ||
        editTagsPermission
      ) || isClassificationDisabled,
    [
      editTagsDescriptionPermission,
      editTagsDisplayNamePermission,
      editTagsPermission,
      isClassificationDisabled,
    ]
  );

  const tagsFormHeader = useMemo(
    () =>
      editTag
        ? t('label.edit-entity', {
            entity: t('label.tag'),
          })
        : t('message.adding-new-tag', {
            categoryName:
              currentClassification?.displayName ?? currentClassification?.name,
          }),
    [editTag, currentClassification]
  );

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return (
      <ErrorPlaceHolder>
        <Typography.Paragraph className="text-center m-auto">
          {error}
        </Typography.Paragraph>
      </ErrorPlaceHolder>
    );
  }

  return (
    <PageLayoutV1 leftPanel={leftPanelLayout} pageTitle={t('label.tag-plural')}>
      {isUpdateLoading ? (
        <Loader />
      ) : (
        <ClassificationDetails
          classificationPermissions={classificationPermissions}
          currentClassification={currentClassification}
          currentPage={currentPage}
          deleteTags={deleteTags}
          disableEditButton={disableEditButton}
          handleActionDeleteTag={handleActionDeleteTag}
          handleAddNewTagClick={handleAddNewTagClick}
          handleAfterDeleteAction={handleAfterDeleteAction}
          handleCancelEditDescription={handleCancelEditDescription}
          handleEditDescriptionClick={handleEditDescriptionClick}
          handleEditTagClick={handleEditTagClick}
          handlePageChange={handlePageChange}
          handleUpdateClassification={handleUpdateClassification}
          isEditClassification={isEditClassification}
          isTagsLoading={isTagsLoading}
          paging={paging}
          tags={tags}
        />
      )}

      {/* Classification Form */}
      {isAddingClassification && (
        <TagsForm
          isClassification
          showMutuallyExclusive
          data={classifications}
          header={t('label.adding-new-classification')}
          isEditing={false}
          isLoading={isButtonLoading}
          isTier={isTier}
          visible={isAddingClassification}
          onCancel={handleCancel}
          onSubmit={handleCreateClassification}
        />
      )}

      {/* Tags Form */}
      {isAddingTag && (
        <TagsForm
          header={tagsFormHeader}
          initialValues={editTag}
          isEditing={!isUndefined(editTag)}
          isLoading={isButtonLoading}
          isSystemTag={editTag?.provider === ProviderType.System}
          isTier={isTier}
          permissions={tagsFormPermissions}
          visible={isAddingTag}
          onCancel={handleCancel}
          onSubmit={handleAddTagSubmit}
        />
      )}

      <EntityDeleteModal
        bodyText={getEntityDeleteMessage(deleteTags.data?.name ?? '', '')}
        entityName={deleteTags.data?.name ?? ''}
        entityType={t('label.classification')}
        loadingState={deleteStatus}
        visible={deleteTags.state}
        onCancel={handleCancelClassificationDelete}
        onConfirm={handleConfirmClick}
      />
    </PageLayoutV1>
  );
};

export default TagsPage;
