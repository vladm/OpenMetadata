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

import { Button, Col, Form, Row } from 'antd';
import { AxiosError } from 'axios';
import { t } from 'i18next';
import { isUndefined, map, startCase } from 'lodash';
import React, {
  FocusEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { SUPPORTED_FIELD_TYPES } from '../../../constants/constants';
import { GlobalSettingsMenuCategory } from '../../../constants/GlobalSettings.constants';
import { CUSTOM_PROPERTY_NAME_REGEX } from '../../../constants/regex.constants';
import {
  CUSTOM_PROPERTY_CATEGORY,
  OPEN_METADATA,
} from '../../../constants/service-guide.constant';
import { EntityType } from '../../../enums/entity.enum';
import { ServiceCategory } from '../../../enums/service.enum';
import { Category, CustomProperty, Type } from '../../../generated/entity/type';
import { FieldProp, FieldTypes } from '../../../interface/FormUtils.interface';
import {
  addPropertyToEntity,
  getTypeByFQN,
  getTypeListByCategory,
} from '../../../rest/metadataTypeAPI';
import { generateFormFields } from '../../../utils/formUtils';
import { getSettingOptionByEntityType } from '../../../utils/GlobalSettingsUtils';
import { getSettingPath } from '../../../utils/RouterUtils';
import { showErrorToast } from '../../../utils/ToastUtils';
import ResizablePanels from '../../common/ResizablePanels/ResizablePanels';
import ServiceDocPanel from '../../common/ServiceDocPanel/ServiceDocPanel';
import TitleBreadcrumb from '../../common/title-breadcrumb/title-breadcrumb.component';

const AddCustomProperty = () => {
  const { entityTypeFQN } = useParams<{ entityTypeFQN: EntityType }>();
  const history = useHistory();

  const [typeDetail, setTypeDetail] = useState<Type>();

  const [propertyTypes, setPropertyTypes] = useState<Array<Type>>([]);
  const [activeField, setActiveField] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const slashedBreadcrumb = useMemo(
    () => [
      {
        name: t('label.setting-plural'),
        url: getSettingPath(),
      },
      {
        name: t('label.custom-attribute-plural'),
        url: getSettingPath(
          GlobalSettingsMenuCategory.CUSTOM_ATTRIBUTES,
          getSettingOptionByEntityType(entityTypeFQN)
        ),
      },
      {
        name: t('label.add-entity', {
          entity: t('label.custom-property'),
        }),
        url: '',
      },
    ],
    [entityTypeFQN]
  );

  const propertyTypeOptions = useMemo(() => {
    const supportedTypes = propertyTypes.filter((property) =>
      SUPPORTED_FIELD_TYPES.includes(property.name)
    );

    return map(supportedTypes, (type) => ({
      key: type.name,
      label: startCase(type.displayName ?? type.name),
      value: type.id,
    }));
  }, [propertyTypes]);

  const fetchPropertyType = async () => {
    try {
      const response = await getTypeListByCategory(Category.Field);
      setPropertyTypes(response.data);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const fetchTypeDetail = async (typeFQN: string) => {
    try {
      const response = await getTypeByFQN(typeFQN);
      setTypeDetail(response);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const handleCancel = useCallback(() => history.goBack(), [history]);

  const handleFieldFocus = useCallback((event: FocusEvent<HTMLFormElement>) => {
    const isDescription = event.target.classList.contains('ProseMirror');

    setActiveField(isDescription ? 'root/description' : event.target.id);
  }, []);

  const handleSubmit = async (
    /**
     * In CustomProperty the propertyType is type of entity reference, however from the form we
     * get propertyType as string
     */
    data: Exclude<CustomProperty, 'propertyType'> & { propertyType: string }
  ) => {
    if (isUndefined(typeDetail)) {
      return;
    }

    try {
      setIsCreating(true);
      await addPropertyToEntity(typeDetail?.id ?? '', {
        ...data,
        propertyType: {
          id: data.propertyType,
          type: 'type',
        },
      });
      history.goBack();
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    fetchTypeDetail(entityTypeFQN);
  }, [entityTypeFQN]);

  useEffect(() => {
    fetchPropertyType();
  }, []);

  const formFields: FieldProp[] = [
    {
      name: 'name',
      required: true,
      label: t('label.name'),
      id: 'root/name',
      type: FieldTypes.TEXT,
      props: {
        'data-testid': 'name',
        autoComplete: 'off',
      },
      placeholder: t('label.name'),
      rules: [
        {
          pattern: CUSTOM_PROPERTY_NAME_REGEX,
          message: t('message.custom-property-name-validation'),
        },
      ],
    },
    {
      name: 'propertyType',
      required: true,
      label: t('label.type'),
      id: 'root/propertyType',
      type: FieldTypes.SELECT,
      props: {
        'data-testid': 'propertyType',
        options: propertyTypeOptions,
        placeholder: `${t('label.select-field', {
          field: t('label.type'),
        })}`,
      },
    },
    {
      name: 'description',
      required: true,
      label: t('label.description'),
      id: 'root/description',
      type: FieldTypes.DESCRIPTION,
      props: {
        'data-testid': 'description',
        initialValue: '',
      },
    },
  ];

  const firstPanelChildren = (
    <div className="max-width-md w-9/10 service-form-container">
      <TitleBreadcrumb titleLinks={slashedBreadcrumb} />
      <Form
        className="m-t-md"
        data-testid="custom-property-form"
        layout="vertical"
        onFinish={handleSubmit}
        onFocus={handleFieldFocus}>
        {generateFormFields(formFields)}
        <Row justify="end">
          <Col>
            <Button
              data-testid="back-button"
              type="link"
              onClick={handleCancel}>
              {t('label.back')}
            </Button>
          </Col>
          <Col>
            <Button
              data-testid="create-button"
              htmlType="submit"
              loading={isCreating}
              type="primary">
              {t('label.create')}
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );

  const secondPanelChildren = (
    <ServiceDocPanel
      activeField={activeField}
      serviceName={CUSTOM_PROPERTY_CATEGORY}
      serviceType={OPEN_METADATA as ServiceCategory}
    />
  );

  return (
    <ResizablePanels
      firstPanel={{
        children: firstPanelChildren,
        minWidth: 700,
        flex: 0.7,
      }}
      pageTitle={t('label.add-entity', {
        entity: t('label.custom-property'),
      })}
      secondPanel={{
        children: secondPanelChildren,
        className: 'service-doc-panel',
        minWidth: 60,
        overlay: {
          displayThreshold: 200,
          header: t('label.setup-guide'),
          rotation: 'counter-clockwise',
        },
      }}
    />
  );
};

export default AddCustomProperty;
