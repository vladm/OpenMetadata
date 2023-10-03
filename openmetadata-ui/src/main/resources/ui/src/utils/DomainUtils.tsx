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
import { isEmpty } from 'lodash';
import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ProfilePicture from '../components/common/ProfilePicture/ProfilePicture';
import {
  getTeamAndUserDetailsPath,
  getUserPath,
  NO_DATA_PLACEHOLDER,
} from '../constants/constants';
import { EntityField } from '../constants/Feeds.constants';
import { SearchIndex } from '../enums/search.enum';
import { DataProduct } from '../generated/entity/domains/dataProduct';
import { Domain } from '../generated/entity/domains/domain';
import { ChangeDescription, EntityReference } from '../generated/entity/type';
import { getEntityName } from './EntityUtils';
import {
  getChangedEntityNewValue,
  getChangedEntityOldValue,
  getDiffByFieldName,
  getDiffValue,
} from './EntityVersionUtils';

export const getOwner = (
  hasPermission: boolean,
  ownerDisplayName: ReactNode,
  owner?: EntityReference
) => {
  if (owner) {
    return (
      <>
        <ProfilePicture
          displayName={getEntityName(owner)}
          id={owner?.id || ''}
          name={owner?.name ?? ''}
          textClass="text-xs"
          width="20"
        />
        <Link
          to={
            owner.type === 'team'
              ? getTeamAndUserDetailsPath(owner.name ?? '')
              : getUserPath(owner.name ?? '')
          }>
          {ownerDisplayName}
        </Link>
      </>
    );
  }
  if (!hasPermission) {
    return <div>{NO_DATA_PLACEHOLDER}</div>;
  }

  return null;
};

export const getUserNames = (
  entity: Domain | DataProduct,
  hasPermission: boolean,
  isVersionsView = false
) => {
  if (isVersionsView) {
    const ownerDiff = getDiffByFieldName(
      EntityField.OWNER,
      entity.changeDescription as ChangeDescription
    );

    const oldOwner = JSON.parse(getChangedEntityOldValue(ownerDiff) ?? '{}');
    const newOwner = JSON.parse(getChangedEntityNewValue(ownerDiff) ?? '{}');

    const shouldShowDiff =
      !isEmpty(ownerDiff.added) ||
      !isEmpty(ownerDiff.deleted) ||
      !isEmpty(ownerDiff.updated);

    if (shouldShowDiff) {
      if (!isEmpty(ownerDiff.added)) {
        const ownerName = getDiffValue('', getEntityName(newOwner));

        return getOwner(hasPermission, ownerName, newOwner);
      }

      if (!isEmpty(ownerDiff.deleted)) {
        const ownerName = getDiffValue(getEntityName(oldOwner), '');

        return getOwner(hasPermission, ownerName, oldOwner);
      }

      if (!isEmpty(ownerDiff.updated)) {
        const ownerName = getDiffValue(
          getEntityName(oldOwner),
          getEntityName(newOwner)
        );

        return getOwner(hasPermission, ownerName, newOwner);
      }
    }
  }

  return getOwner(hasPermission, getEntityName(entity.owner), entity.owner);
};

export const DomainAssetsSearchIndex =
  `${SearchIndex.DASHBOARD},${SearchIndex.TABLE},${SearchIndex.TOPIC},${SearchIndex.PIPELINE},${SearchIndex.MLMODEL},${SearchIndex.GLOSSARY},${SearchIndex.CONTAINER}` as SearchIndex;
