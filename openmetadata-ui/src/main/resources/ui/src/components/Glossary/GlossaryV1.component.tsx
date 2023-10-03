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

import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import { cloneDeep, isEmpty } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import Loader from '../../components/Loader/Loader';
import { withActivityFeed } from '../../components/router/withActivityFeed';
import { HTTP_STATUS_CODE } from '../../constants/auth.constants';
import {
  API_RES_MAX_SIZE,
  getGlossaryTermDetailsPath,
} from '../../constants/constants';
import { EntityAction } from '../../enums/entity.enum';
import { Glossary } from '../../generated/entity/data/glossary';
import { GlossaryTerm } from '../../generated/entity/data/glossaryTerm';
import { VERSION_VIEW_GLOSSARY_PERMISSION } from '../../mocks/Glossary.mock';
import {
  addGlossaryTerm,
  getGlossaryTerms,
  ListGlossaryTermsParams,
  patchGlossaryTerm,
} from '../../rest/glossaryAPI';
import { getEntityDeleteMessage } from '../../utils/CommonUtils';
import { DEFAULT_ENTITY_PERMISSION } from '../../utils/PermissionsUtils';
import { showErrorToast } from '../../utils/ToastUtils';
import EntityDeleteModal from '../Modals/EntityDeleteModal/EntityDeleteModal';
import { usePermissionProvider } from '../PermissionProvider/PermissionProvider';
import {
  OperationPermission,
  ResourceEntity,
} from '../PermissionProvider/PermissionProvider.interface';
import { GlossaryTermForm } from './AddGlossaryTermForm/AddGlossaryTermForm.interface';
import GlossaryDetails from './GlossaryDetails/GlossaryDetails.component';
import GlossaryTermModal from './GlossaryTermModal/GlossaryTermModal.component';
import GlossaryTermsV1 from './GlossaryTerms/GlossaryTermsV1.component';
import { GlossaryV1Props } from './GlossaryV1.interfaces';
import './GlossaryV1.style.less';
import ImportGlossary from './ImportGlossary/ImportGlossary';

const GlossaryV1 = ({
  isGlossaryActive,
  deleteStatus = 'initial',
  selectedData,
  onGlossaryTermUpdate,
  updateGlossary,
  updateVote,
  onGlossaryDelete,
  onGlossaryTermDelete,
  isVersionsView,
  onAssetClick,
  isSummaryPanelOpen,
}: GlossaryV1Props) => {
  const { t } = useTranslation();
  const { action, tab } =
    useParams<{ action: EntityAction; glossaryName: string; tab: string }>();
  const history = useHistory();

  const { getEntityPermission } = usePermissionProvider();
  const [isLoading, setIsLoading] = useState(true);
  const [isTermsLoading, setIsTermsLoading] = useState(false);

  const [isDelete, setIsDelete] = useState<boolean>(false);

  const [glossaryPermission, setGlossaryPermission] =
    useState<OperationPermission>(DEFAULT_ENTITY_PERMISSION);

  const [glossaryTermPermission, setGlossaryTermPermission] =
    useState<OperationPermission>(DEFAULT_ENTITY_PERMISSION);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeGlossaryTerm, setActiveGlossaryTerm] = useState<
    GlossaryTerm | undefined
  >();
  const [editMode, setEditMode] = useState(false);

  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([]);
  const { id } = selectedData ?? {};

  const isImportAction = useMemo(
    () => action === EntityAction.IMPORT,
    [action]
  );

  const fetchGlossaryTerm = async (
    params?: ListGlossaryTermsParams,
    refresh?: boolean
  ) => {
    refresh ? setIsTermsLoading(true) : setIsLoading(true);
    try {
      const { data } = await getGlossaryTerms({
        ...params,
        limit: API_RES_MAX_SIZE,
        fields: 'tags,children,reviewers,relatedTerms,owner,parent',
      });
      setGlossaryTerms(data);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      refresh ? setIsTermsLoading(false) : setIsLoading(false);
    }
  };

  const fetchGlossaryPermission = async () => {
    try {
      const response = await getEntityPermission(
        ResourceEntity.GLOSSARY,
        selectedData?.id as string
      );
      setGlossaryPermission(response);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const fetchGlossaryTermPermission = async () => {
    try {
      const response = await getEntityPermission(
        ResourceEntity.GLOSSARY_TERM,
        selectedData?.id as string
      );
      setGlossaryTermPermission(response);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const handleDelete = () => {
    const { id } = selectedData;
    if (isGlossaryActive) {
      onGlossaryDelete(id);
    } else {
      onGlossaryTermDelete(id);
    }
    setIsDelete(false);
  };

  const loadGlossaryTerms = useCallback(
    (refresh = false) => {
      fetchGlossaryTerm(
        isGlossaryActive ? { glossary: id } : { parent: id },
        refresh
      );
    },
    [id, isGlossaryActive]
  );

  const handleGlossaryTermModalAction = (
    editMode: boolean,
    glossaryTerm: GlossaryTerm | undefined
  ) => {
    setEditMode(editMode);
    setActiveGlossaryTerm(glossaryTerm);
    setIsEditModalOpen(true);
  };

  const updateGlossaryTerm = async (
    currentData: GlossaryTerm,
    updatedData: GlossaryTerm
  ) => {
    try {
      const jsonPatch = compare(currentData, updatedData);
      const response = await patchGlossaryTerm(currentData?.id, jsonPatch);
      if (!response) {
        throw t('server.entity-updating-error', {
          entity: t('label.glossary-term'),
        });
      }
      onTermModalSuccess();
    } catch (error) {
      if (
        (error as AxiosError).response?.status === HTTP_STATUS_CODE.CONFLICT
      ) {
        showErrorToast(
          t('server.entity-already-exist', {
            entity: t('label.glossary-term'),
            entityPlural: t('label.glossary-term-lowercase-plural'),
            name: updatedData.name,
          })
        );
      } else {
        showErrorToast(
          error as AxiosError,
          t('server.entity-updating-error', {
            entity: t('label.glossary-term-lowercase'),
          })
        );
      }
    }
  };

  const onTermModalSuccess = useCallback(() => {
    loadGlossaryTerms(true);
    if (!isGlossaryActive && tab !== 'terms') {
      history.push(
        getGlossaryTermDetailsPath(
          selectedData.fullyQualifiedName || '',
          'terms'
        )
      );
    }
    setIsEditModalOpen(false);
  }, [isGlossaryActive, tab, selectedData]);

  const handleGlossaryTermAdd = async (formData: GlossaryTermForm) => {
    try {
      await addGlossaryTerm({
        ...formData,
        reviewers: formData.reviewers.map(
          (item) => item.fullyQualifiedName || ''
        ),
        glossary:
          activeGlossaryTerm?.glossary?.name ||
          (selectedData.fullyQualifiedName ?? ''),
        parent: activeGlossaryTerm?.fullyQualifiedName,
      });
      onTermModalSuccess();
    } catch (error) {
      if (
        (error as AxiosError).response?.status === HTTP_STATUS_CODE.CONFLICT
      ) {
        showErrorToast(
          t('server.entity-already-exist', {
            entity: t('label.glossary-term'),
            entityPlural: t('label.glossary-term-lowercase-plural'),
            name: formData.name,
          })
        );
      } else {
        showErrorToast(
          error as AxiosError,
          t('server.create-entity-error', {
            entity: t('label.glossary-term-lowercase'),
          })
        );
      }
    }
  };

  const handleGlossaryTermSave = async (formData: GlossaryTermForm) => {
    const newTermData = cloneDeep(activeGlossaryTerm);
    if (editMode) {
      if (newTermData && activeGlossaryTerm) {
        const {
          name,
          displayName,
          description,
          synonyms,
          tags,
          references,
          mutuallyExclusive,
          reviewers,
          owner,
          relatedTerms,
        } = formData || {};

        newTermData.name = name;
        newTermData.displayName = displayName;
        newTermData.description = description;
        newTermData.synonyms = synonyms;
        newTermData.tags = tags;
        newTermData.mutuallyExclusive = mutuallyExclusive;
        newTermData.reviewers = reviewers;
        newTermData.owner = owner;
        newTermData.references = references;
        newTermData.relatedTerms = relatedTerms?.map((term) => ({
          id: term,
          type: 'glossaryTerm',
        }));
        await updateGlossaryTerm(activeGlossaryTerm, newTermData);
      }
    } else {
      handleGlossaryTermAdd(formData);
    }
  };

  useEffect(() => {
    if (id && !action) {
      loadGlossaryTerms();
      if (isGlossaryActive) {
        isVersionsView
          ? setGlossaryPermission(VERSION_VIEW_GLOSSARY_PERMISSION)
          : fetchGlossaryPermission();
      } else {
        isVersionsView
          ? setGlossaryTermPermission(VERSION_VIEW_GLOSSARY_PERMISSION)
          : fetchGlossaryTermPermission();
      }
    }
  }, [id, isGlossaryActive, isVersionsView, action]);

  return isImportAction ? (
    <ImportGlossary glossaryName={selectedData.fullyQualifiedName ?? ''} />
  ) : (
    <>
      {isLoading && <Loader />}
      {!isLoading &&
        !isEmpty(selectedData) &&
        (isGlossaryActive ? (
          <GlossaryDetails
            glossary={selectedData as Glossary}
            glossaryTerms={glossaryTerms}
            handleGlossaryDelete={onGlossaryDelete}
            isVersionView={isVersionsView}
            permissions={glossaryPermission}
            refreshGlossaryTerms={() => loadGlossaryTerms(true)}
            termsLoading={isTermsLoading}
            updateGlossary={updateGlossary}
            updateVote={updateVote}
            onAddGlossaryTerm={(term) =>
              handleGlossaryTermModalAction(false, term)
            }
            onEditGlossaryTerm={(term) =>
              handleGlossaryTermModalAction(true, term)
            }
          />
        ) : (
          <GlossaryTermsV1
            childGlossaryTerms={glossaryTerms}
            glossaryTerm={selectedData as GlossaryTerm}
            handleGlossaryTermDelete={onGlossaryTermDelete}
            handleGlossaryTermUpdate={onGlossaryTermUpdate}
            isSummaryPanelOpen={isSummaryPanelOpen}
            isVersionView={isVersionsView}
            permissions={glossaryTermPermission}
            refreshGlossaryTerms={() => loadGlossaryTerms(true)}
            termsLoading={isTermsLoading}
            updateVote={updateVote}
            onAddGlossaryTerm={(term) =>
              handleGlossaryTermModalAction(false, term)
            }
            onAssetClick={onAssetClick}
            onEditGlossaryTerm={(term) =>
              handleGlossaryTermModalAction(true, term)
            }
          />
        ))}

      {selectedData && (
        <EntityDeleteModal
          bodyText={getEntityDeleteMessage(selectedData.name, '')}
          entityName={selectedData.name}
          entityType="Glossary"
          loadingState={deleteStatus}
          visible={isDelete}
          onCancel={() => setIsDelete(false)}
          onConfirm={handleDelete}
        />
      )}

      {isEditModalOpen && (
        <GlossaryTermModal
          editMode={editMode}
          glossaryName={selectedData.name}
          glossaryReviewers={isGlossaryActive ? selectedData.reviewers : []}
          glossaryTerm={activeGlossaryTerm}
          visible={isEditModalOpen}
          onCancel={() => setIsEditModalOpen(false)}
          onSave={handleGlossaryTermSave}
        />
      )}
    </>
  );
};

export default withActivityFeed(GlossaryV1);
