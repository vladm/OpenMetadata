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

import Icon from '@ant-design/icons';
import { Typography } from 'antd';
import { t } from 'i18next';
import { isUndefined, toNumber } from 'lodash';
import React, { FC, Fragment, useState } from 'react';
import { ReactComponent as EditIconComponent } from '../../../assets/svg/edit-new.svg';
import { Table } from '../../../generated/entity/data/table';
import { EntityReference } from '../../../generated/type/entityReference';
import { ModalWithMarkdownEditor } from '../../Modals/ModalWithMarkdownEditor/ModalWithMarkdownEditor';
import RichTextEditorPreviewer from '../rich-text-editor/RichTextEditorPreviewer';
import { PropertyInput } from './PropertyInput';

interface Props {
  versionDataKeys?: string[];
  isVersionView?: boolean;
  propertyName: string;
  propertyType: EntityReference;
  extension: Table['extension'];
  onExtensionUpdate: (updatedExtension: Table['extension']) => Promise<void>;
  hasEditPermissions: boolean;
}

export const PropertyValue: FC<Props> = ({
  isVersionView,
  versionDataKeys,
  propertyName,
  extension,
  propertyType,
  onExtensionUpdate,
  hasEditPermissions,
}) => {
  const value = extension?.[propertyName];

  const [showInput, setShowInput] = useState<boolean>(false);

  const onShowInput = () => {
    setShowInput(true);
  };

  const onHideInput = () => {
    setShowInput(false);
  };

  const onInputSave = async (updatedValue: string | number) => {
    const updatedExtension = {
      ...(extension || {}),
      [propertyName]:
        propertyType.name === 'integer'
          ? toNumber(updatedValue || 0)
          : updatedValue,
    };
    await onExtensionUpdate(updatedExtension);
    setShowInput(false);
  };

  const getPropertyInput = () => {
    switch (propertyType.name) {
      case 'string':
      case 'integer':
        return (
          <PropertyInput
            propertyName={propertyName}
            type={propertyType.name === 'integer' ? 'number' : 'text'}
            value={value}
            onCancel={onHideInput}
            onSave={onInputSave}
          />
        );
      case 'markdown':
        return (
          <ModalWithMarkdownEditor
            header={t('label.edit-entity-name', {
              entityType: t('label.property'),
              entityName: propertyName,
            })}
            placeholder={t('label.enter-property-value')}
            value={value || ''}
            visible={showInput}
            onCancel={onHideInput}
            onSave={onInputSave}
          />
        );

      default:
        return null;
    }
  };

  const getPropertyValue = () => {
    if (isVersionView) {
      const isKeyAdded = versionDataKeys?.includes(propertyName);

      return (
        <RichTextEditorPreviewer
          className={isKeyAdded ? 'diff-added' : ''}
          markdown={String(value) || ''}
        />
      );
    }
    switch (propertyType.name) {
      case 'markdown':
        return <RichTextEditorPreviewer markdown={value || ''} />;

      case 'string':
      case 'integer':
      default:
        return (
          <Typography.Text className="break-all" data-testid="value">
            {value}
          </Typography.Text>
        );
    }
  };

  const getValueElement = () => {
    const propertyValue = getPropertyValue();
    const isInteger = propertyType.name === 'integer';
    if (isInteger) {
      return !isUndefined(value) ? (
        propertyValue
      ) : (
        <span className="text-grey-muted" data-testid="no-data">
          {t('message.no-data')}
        </span>
      );
    } else {
      return value ? (
        propertyValue
      ) : (
        <span className="text-grey-muted" data-testid="no-data">
          {t('message.no-data')}
        </span>
      );
    }
  };

  return (
    <div>
      {showInput ? (
        getPropertyInput()
      ) : (
        <Fragment>
          <div className="d-flex gap-2 items-center">
            {getValueElement()}
            {hasEditPermissions && (
              <Icon
                component={EditIconComponent}
                data-testid="edit-icon"
                onClick={onShowInput}
              />
            )}
          </div>
        </Fragment>
      )}
    </div>
  );
};
